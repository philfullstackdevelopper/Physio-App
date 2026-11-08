"use server";

import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import { precreateAppUserId } from "@/lib/auth/user-map";
import { canInvitePatients } from "@/lib/launch";
import { deleteAppUserById, joinLinkKine, joinLinkPendingPatientName, joinPatientByLink, undoJoinByLink } from "@/lib/db/admin";
import { instructorIdFromJoinCode } from "@/lib/patient/joinLink";
import { invitePatient } from "@/lib/patient/invitation";
import { clientIp, createRateLimiter } from "@/lib/rateLimit";
import { JOIN_EMAIL_COOKIE, JOIN_HONEYPOT_FIELD } from "./shared";

// Le patient a scanné le QR code de son kiné (Philippe, 2026-11-04). Même
// chemin qu'une invitation envoyée par le kiné (app/dashboard/patients/
// actions.ts, addPatient) : la fiche patient est créée chez CE kiné, puis
// Clerk envoie l'e-mail d'invitation — qui prouve que l'adresse est bien la
// sienne — et la suite ne change pas (mot de passe, CGU, questionnaire,
// formule).
//
// Garde-fous (audit du 2026-11-08) : page publique, donc
//  - 8 essais par IP et par 10 minutes (mémoire du serveur, lib/rateLimit.ts) ;
//  - 20 nouveaux patients par kiné et par 24 h par ce chemin (en base, 0087) ;
//  - un champ piège invisible : rempli = robot, on fait semblant d'avoir réussi ;
//  - aucune réponse ne dit si une adresse a déjà un compte, sauf pour le
//    patient de CE kiné qui n'a pas fini : on lui renvoie son invitation, et il
//    voit le même écran « Vérifiez vos e-mails » qu'un nouveau patient.

const ipLimiter = createRateLimiter({ limit: 8, windowMs: 10 * 60 * 1000 });

export async function joinViaLink(code: string, formData: FormData) {
  const t = await getTranslations("auth.join.errors");
  const page = `/rejoindre/${encodeURIComponent(code)}`;
  const back = (msg: string) => redirect(`${page}?error=${encodeURIComponent(msg)}`);
  // L'adresse e-mail ne passe jamais dans l'adresse de la page (historique du
  // navigateur, journaux) : un cookie de quelques minutes, lu par la page.
  const done = async (email: string | null) => {
    if (email) {
      (await cookies()).set(JOIN_EMAIL_COOKIE, email, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/rejoindre",
        maxAge: 10 * 60,
      });
    }
    redirect(`${page}?ok=1`);
  };

  // Champ piège : invisible pour une personne, rempli par les robots.
  if (String(formData.get(JOIN_HONEYPOT_FIELD) ?? "").trim()) await done(null);

  if (!ipLimiter.allow(clientIp(await headers()))) back(t("tooManyTries"));

  const instructorId = instructorIdFromJoinCode(code);
  if (!instructorId) back(t("invalidLink"));
  const kine = await joinLinkKine(instructorId!);
  if (!kine || kine.status !== "approved") back(t("kineUnavailable"));
  // Avant le lancement : seul le QR code de l'administrateur fonctionne (lib/launch.ts).
  if (!canInvitePatients(kine!.email)) back(t("notOpen"));

  const fullName = String(formData.get("full_name") ?? "").trim().slice(0, 120);
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!fullName || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) back(t("nameAndEmail"));

  // Identifiant réservé avant l'invitation, comme pour addPatient.
  let appId: string;
  let isNew = false;
  try {
    ({ appId, isNew } = await precreateAppUserId(email));
  } catch (e) {
    console.error("joinViaLink: precreateAppUserId", e);
    back(t("unavailable"));
  }
  const discard = async () => {
    if (!isNew) return;
    try {
      await deleteAppUserById(appId!);
    } catch (err) {
      console.error("joinViaLink: identifiant réservé non supprimé", err);
    }
  };

  const result = await joinPatientByLink({ instructorId: instructorId!, appId: appId!, email, fullName }).catch((e) => {
    console.error("joinViaLink: join_patient_by_link", e);
    return "ERROR";
  });

  // Déjà patient de CE kiné, invitation jamais acceptée (QR code rescanné) :
  // on renvoie l'invitation au nom enregistré par le kiné. Rien n'est créé.
  if (result === "PENDING_SAME_KINE") {
    await discard();
    const storedName = await joinLinkPendingPatientName(instructorId!, email).catch(() => null);
    const outcome = await invitePatient(email, storedName ?? fullName, "joinViaLink (renvoi)");
    if (outcome === "sent" || outcome === "pending") await done(email);
    // Compte déjà créé (mot de passe choisi) : il lui suffit de se connecter.
    back(outcome === "duplicate" ? t("emailTaken") : t("unavailable"));
  }

  if (result !== "OK") {
    await discard();
    if (result === "EMAIL_TAKEN" || result === "IS_KINE") back(t("emailTaken"));
    if (result === "RATE_LIMITED") back(t("kineLimit"));
    back(result === "KINE_UNAVAILABLE" ? t("kineUnavailable") : t("unavailable"));
  }

  const outcome = await invitePatient(email, fullName, "joinViaLink");
  if (outcome === "duplicate" || outcome === "failed") {
    // L'invitation n'est pas partie : on ne laisse pas chez le kiné une fiche
    // sans invitation (même logique qu'addPatient).
    try {
      await undoJoinByLink(instructorId!, appId!);
    } catch (err) {
      console.error("joinViaLink: fiche non retirée après l'échec de l'invitation", err);
    }
    await discard();
    back(outcome === "duplicate" ? t("emailTaken") : t("unavailable"));
  }

  await done(email);
}
