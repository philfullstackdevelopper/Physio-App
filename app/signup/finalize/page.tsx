import ClientRedirect from "@/app/apres-connexion/ClientRedirect";
import { cookies } from "next/headers";
import { currentUser } from "@clerk/nextjs/server";
import { resolveAppUserId } from "@/lib/auth/user-map";
import { createClient } from "@/lib/supabase/server";
import { rppsInUse, setInstructorStatus, setInstructorRppsVerified } from "@/lib/db/admin";
import { verifyRpps } from "@/lib/instructor/rppsVerification";
import { SIGNUPS_OPEN } from "@/lib/launchFlags";
import { createCabinet, requestJoinCabinet } from "@/lib/db/cabinets";
import { splitPostalCity } from "@/lib/cabinet/address";
import { parsePendingCabinet, type PendingCabinet } from "@/lib/cabinet/pendingCabinet";

const PENDING_CABINET_COOKIE = "pending_cabinet";

function readPendingCabinet(raw: string | undefined): PendingCabinet | null {
  if (!raw) return null;
  try {
    return parsePendingCabinet(JSON.parse(decodeURIComponent(raw)));
  } catch {
    return null;
  }
}

// Cabinet choisi à l'inscription (migration 0085) : rejoindre (demande en
// attente, validée par un collègue) ou créer (le kiné en devient fondateur).
// Jamais bloquant : en cas d'échec, le kiné le refait depuis « Mon cabinet ».
async function applyCabinetChoice(appId: string, c: PendingCabinet): Promise<void> {
  try {
    if (c.mode === "join" && c.cabinetId) {
      await requestJoinCabinet(appId, c.cabinetId);
    } else {
      await createCabinet(appId, { name: c.cabinetName, address: c.cabinetAddress, ...splitPostalCity(c.cabinetAddress) });
    }
  } catch (e) {
    console.error("finalize : cabinet non enregistré", e);
  }
}

// Landing page right after a new instructor finishes Clerk's sign-up flow.
// Clerk created the identity; this page records the instructor profile row the
// app needs (same job the old signup() server action did inline), with
// status "pending" so the manual approval gate still applies.
//
// The instructors_insert_self RLS policy allows this insert as soon as
// resolveAppUserId() below has created the app_users mapping row for this
// Clerk identity — its WITH CHECK only requires id = current_app_user_id(),
// nothing about the row not existing yet. The one thing that policy does
// NOT restrict is which `status` value gets inserted, so `status` is always
// inserted as "pending" here and escalated to "approved" separately, through
// the privileged setInstructorStatus() write (same reasoning as
// app/signup/onboarding/actions.ts): inserting "approved" directly through
// this session would let anyone self-approve by calling PostgREST directly.
// Clerk arrive ici juste après la création du compte. Plus de redirect()
// serveur comme réponse à cette navigation (écran blanc possible, même cause
// que /apres-connexion) : on calcule la destination, puis la page fait un vrai
// chargement vers elle (ClientRedirect). Philippe, 2026-11-04.
export default async function SignupFinalizePage() {
  const to = await destination();
  // Le cookie du cabinet a servi : on l'efface (sinon une 2e inscription dans
  // le même navigateur, dans les 15 min, le réutiliserait).
  return <ClientRedirect to={to} clearCookies={[PENDING_CABINET_COOKIE]} />;
}

async function destination(): Promise<string> {
  // currentUser() can throw (Clerk dev-instance rate limit, a 429) rather
  // than just resolve to null — same failure mode fixed in
  // lib/supabase/require-user.ts, Philippe, 2026-09-10. Right after a fresh
  // Clerk sign-up is exactly when this page runs, so it can't skip the
  // guard.
  let user;
  try {
    user = await currentUser();
  } catch {
    return ("/connection-error?next=/signup/finalize");
  }
  if (!user) return ("/login");

  const email = user.primaryEmailAddress?.emailAddress ?? "";
  if (!email) return ("/login");

  const appId = await resolveAppUserId(user.id, email, user.primaryEmailAddress?.verification?.status === "verified");
  const supabase = await createClient();

  // Cabinet details filled in BEFORE the Clerk account existed (see
  // components/KineSignupFlow.tsx — cabinet form first, account creation
  // last, like a real professional signup) — stashed in a short-lived
  // cookie because there was no instructors row yet to save them to. If
  // it's missing (cleared cookies, an old link, direct Clerk sign-up), the
  // row is created bare and app/signup/onboarding picks up the slack.
  const pendingCabinet = readPendingCabinet((await cookies()).get(PENDING_CABINET_COOKIE)?.value);

  const { data: existing } = await supabase
    .from("instructors")
    .select("status, cabinet_name")
    .eq("id", appId)
    .maybeSingle();

  // Un patient connecté qui atterrit ici (lien d'inscription kiné ouvert par
  // erreur) ne doit pas devenir en plus un « kiné en attente » : sinon chaque
  // connexion l'enverrait sur l'écran d'attente du dashboard au lieu de son
  // appli patient (audit du 2026-10-07).
  if (!existing) {
    const { data: asPatient } = await supabase.from("patients").select("id").eq("id", appId).maybeSingle();
    if (asPatient) return ("/patient");
  }

  // Avant le lancement (lib/launchFlags.ts) : aucune NOUVELLE fiche kiné, même
  // si une identité de connexion a été créée par un autre chemin (bouton
  // Google de la page de connexion, ancien lien…). La personne arrive sur
  // l'écran « les inscriptions ouvriront au lancement ».
  if (!existing && !SIGNUPS_OPEN) return ("/signup");

  if (!existing) {
    const fullName =
      [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
      email.split("@")[0];

    // Inscription libre (Philippe, 2026-11-02 ; EasyPhysio est gratuit pour le kiné depuis le 2026-11-04 : on ne
    // vérifie plus son inscription à l'Ordre). Le RPPS, facultatif, ne sert
    // plus qu'à la pastille « RPPS vérifié » — jamais à bloquer. Un numéro
    // déjà porté par un autre compte n'a simplement pas la pastille.
    const rpps = pendingCabinet?.rppsNumber || null;
    const verification = rpps ? await verifyRpps(rpps, fullName) : null;
    const rppsVerified = !!rpps && verification?.status === "verified" && !(await rppsInUse(rpps, appId));

    const { error } = await supabase.from("instructors").insert({
      id: appId,
      full_name: fullName,
      email,
      status: "pending",
      ...(pendingCabinet && {
        cabinet_name: pendingCabinet.cabinetName,
        cabinet_address: pendingCabinet.cabinetAddress,
        phone: pendingCabinet.phone,
        rpps_number: pendingCabinet.rppsNumber,
        siret: pendingCabinet.siret,
      }),
    });

    if (error) {
      // Revenir ICI (pas sur /dashboard : sans fiche kiné, /dashboard renvoie
      // vers l'espace patient et le kiné restait coincé, audit 2026-11-08).
      return (`/connection-error?next=${encodeURIComponent("/signup/finalize")}`);
    }

    // Badge « RPPS vérifié » : écrit par le serveur (migration 0063).
    if (rppsVerified && verification?.status === "verified") await setInstructorRppsVerified(appId, verification.verifiedAt);
    // Validé d'office dès que le cabinet est renseigné → directement dans
    // l'appli. Cabinet manquant (cookie perdu) → on le demande d'abord.
    if (pendingCabinet) {
      try {
        await setInstructorStatus(appId, "approved");
      } catch (e) {
        // Rattrapé à la prochaine visite de /dashboard (fiche avec cabinet).
        console.error("finalize : validation différée", e);
      }
      await applyCabinetChoice(appId, pendingCabinet);
      return ("/dashboard");
    }
    return ("/signup/onboarding");
  }

  // Already had a profile (re-run, or previously approved account re-signing up).
  // Validé, refusé ou suspendu : /dashboard affiche l'espace ou le bon message.
  if ((existing.status ?? "approved") !== "pending") return ("/dashboard");
  // Resté « en attente » d'avant l'inscription libre, cabinet renseigné : validé.
  if (existing.cabinet_name) {
    try {
      await setInstructorStatus(appId, "approved");
    } catch (e) {
      console.error("finalize : validation différée", e);
    }
    return ("/dashboard");
  }
  return ("/signup/onboarding");
}
