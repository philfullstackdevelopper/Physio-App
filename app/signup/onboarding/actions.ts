"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import { rppsInUse, setInstructorStatus, setInstructorRppsVerified } from "@/lib/db/admin";
import { verifyRpps } from "@/lib/instructor/rppsVerification";
import { friendlyDbError } from "@/lib/format/dbError";
import { getTranslations } from "next-intl/server";
import { trackServer } from "@/lib/analytics/serverTrack";
import { alertKineSignup } from "@/lib/alerts/discord";
import { isCountryEnabled } from "@/lib/billing/countries";
import { checkProfessionalId, professionalIdAutoApproves } from "@/lib/instructor/professionalId";

// Saves the cabinet/practice details collected right after Clerk signup (see
// app/signup/onboarding/page.tsx).
//
// The cabinet fields go through the instructor's own RLS-scoped session
// (instructors_update_own already allows a self-row update). The `status`
// escalation to "approved" is handled separately, through the privileged
// setInstructorStatus() write: writing status through the instructor's own
// session would let any kiné self-approve by calling PostgREST directly,
// bypassing verifyRpps() entirely (see supabase/migrations/0057's
// admin_set_instructor_status(), deliberately unreachable from any session
// but the server's own trusted code).
export async function saveInstructorOnboarding(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: instructor } = await supabase
    .from("instructors")
    .select("full_name, status")
    .eq("id", user.id)
    .maybeSingle();

  // Seul un compte encore « en attente » passe par ici. Un compte refusé dans
  // /admin ne doit pas pouvoir se faire ré-approuver en renvoyant ce
  // formulaire (audit du 2026-10-07) ; un compte déjà validé n'a rien à y faire.
  if (!instructor) redirect("/signup");
  if (instructor.status === "approved") redirect("/dashboard");
  // Refusé ou suspendu : /dashboard affiche le bon message (« Compte non
  // validé » / « suspendu »), pas « Demande envoyée » (audit du 2026-10-08).
  if (instructor.status !== "pending") redirect("/dashboard");

  const cabinetName = String(formData.get("cabinet_name") ?? "").trim();
  const cabinetAddress = String(formData.get("cabinet_address") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const rppsNumber = String(formData.get("rpps_number") ?? "").replace(/\s+/g, "");
  const siret = String(formData.get("siret") ?? "").replace(/\s+/g, "") || null;
  const firstName = String(formData.get("first_name") ?? "").trim().slice(0, 60);
  const lastName = String(formData.get("last_name") ?? "").trim().slice(0, 60);

  const t = await getTranslations("auth.cabinet");
  if (!firstName || !lastName) redirect(`/signup/onboarding?error=${encodeURIComponent(t("errorName"))}`);
  const fullName = `${firstName} ${lastName}`;
  const missing: string[] = [];
  if (!cabinetName) missing.push(t("missingName"));
  if (!cabinetAddress) missing.push(t("missingAddress"));
  if (!phone) missing.push(t("missingPhone"));
  if (missing.length > 0) {
    redirect(`/signup/onboarding?error=${encodeURIComponent(t("errorMissing", { fields: missing.join(", ") }))}`);
  }
  // Pays d'exercice (migration 0101) : seulement un pays ouvert ; hors France,
  // numéro professionnel obligatoire et format vérifié s'il existe une règle.
  const country = String(formData.get("country") ?? "FR").toUpperCase();
  if (!isCountryEnabled(country)) redirect(`/signup/onboarding?error=${encodeURIComponent(t("countryNotOpen"))}`);
  const isFrance = country === "FR";
  const proCheck = isFrance ? null : checkProfessionalId(country, String(formData.get("professional_id") ?? ""));
  if (proCheck && !proCheck.ok) {
    redirect(`/signup/onboarding?error=${encodeURIComponent(proCheck.reason === "required" ? t("proIdRequired") : t("proIdFormat"))}`);
  }
  if (isFrance && rppsNumber && !/^\d{9,11}$/.test(rppsNumber)) {
    redirect(`/signup/onboarding?error=${encodeURIComponent(t("errorRppsDigits"))}`);
  }
  if (isFrance && siret && !/^\d{14}$/.test(siret)) {
    redirect(`/signup/onboarding?error=${encodeURIComponent(t("errorSiretDigits"))}`);
  }

  // A confirmed RPPS + name match (see lib/instructor/rppsVerification.ts)
  // skips the manual /admin approval queue entirely (Philippe, 2026-09-10),
  // same as the normal signup path in app/signup/finalize/page.tsx — an
  // unverified RPPS, or one whose name doesn't match, still needs a human.
  // Inscription libre (Philippe, 2026-11-02) : le RPPS, facultatif, ne sert
  // plus qu'à la pastille « RPPS vérifié », jamais à bloquer l'accès.
  const verification = isFrance && rppsNumber ? await verifyRpps(rppsNumber, fullName) : null;
  const rppsVerified = !!rppsNumber && verification?.status === "verified" && !(await rppsInUse(rppsNumber, user.id));

  const { error } = await supabase
    .from("instructors")
    .update({
      full_name: fullName,
      cabinet_name: cabinetName,
      cabinet_address: cabinetAddress,
      phone,
      rpps_number: isFrance ? rppsNumber || null : null,
      siret: isFrance ? siret : null,
      country,
      professional_id: proCheck?.ok ? proCheck.value : null,
    })
    .eq("id", user.id);

  if (error) {
    redirect(`/signup/onboarding?error=${encodeURIComponent(friendlyDbError(error, undefined, await getTranslations("dashboard.lib")))}`);
  }

  // Badge « RPPS vérifié » : écrit par le serveur (migration 0063).
  if (rppsVerified && verification?.status === "verified") await setInstructorRppsVerified(user.id, verification.verifiedAt);
  // Hors France, numéro sans règle publique (ou pays à revue imposée) : attend la validation de l'admin.
  if (!isFrance && !professionalIdAutoApproves(country, proCheck?.ok ? proCheck.value : null)) {
    await alertKineSignup("terminee", { name: fullName, cabinetAddress });
    redirect("/apres-connexion");
  }
  // Validé d'office dès que le cabinet est renseigné.
  await setInstructorStatus(user.id, "approved");
  await trackServer("kine_inscription_terminee", { etape: "formulaire_cabinet" });
  await alertKineSignup("terminee", { name: fullName, cabinetAddress });
  // Page de passage (chargement complet) plutôt qu'une navigation interne
  // vers /dashboard, qui pouvait laisser un écran blanc (2026-11-04).
  redirect("/apres-connexion");
}
