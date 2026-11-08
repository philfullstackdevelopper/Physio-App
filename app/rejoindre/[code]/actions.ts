"use server";

import { redirect } from "next/navigation";
import { clerkClient } from "@clerk/nextjs/server";
import { isClerkAPIResponseError } from "@clerk/shared/error";
import { precreateAppUserId } from "@/lib/auth/user-map";
import { canInvitePatients } from "@/lib/launch";
import { requestOrigin } from "@/lib/requestOrigin";
import { deleteAppUserById, joinLinkKine, joinPatientByLink } from "@/lib/db/admin";
import { instructorIdFromJoinCode } from "@/lib/patient/joinLink";

// Le patient a scanné le QR code de son kiné (Philippe, 2026-11-04). Même
// chemin qu'une invitation envoyée par le kiné (app/dashboard/patients/
// actions.ts, addPatient) : la fiche patient est créée chez CE kiné, puis
// Clerk envoie l'e-mail d'invitation — qui prouve que l'adresse est bien la
// sienne — et la suite ne change pas (mot de passe, CGU, questionnaire,
// formule).

export async function joinViaLink(code: string, formData: FormData) {
  const back = (msg: string) => redirect(`/rejoindre/${encodeURIComponent(code)}?error=${encodeURIComponent(msg)}`);

  const instructorId = instructorIdFromJoinCode(code);
  if (!instructorId) back("Ce lien n'est pas valide. Demandez à votre kiné de vous le renvoyer.");
  const kine = await joinLinkKine(instructorId!);
  if (!kine || kine.status !== "approved") back("Ce kinésithérapeute n'accepte pas de nouveaux patients pour le moment.");
  // Avant le lancement : seul le QR code de l'administrateur fonctionne (lib/launch.ts).
  if (!canInvitePatients(kine!.email)) back("Les inscriptions de patients ouvriront au lancement d'EasyPhysio.");

  const fullName = String(formData.get("full_name") ?? "").trim().slice(0, 120);
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!fullName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) back("Indiquez votre nom et une adresse e-mail valide.");

  // Identifiant réservé avant l'invitation, comme pour addPatient.
  let appId: string;
  let isNew = false;
  try {
    ({ appId, isNew } = await precreateAppUserId(email));
  } catch (e) {
    console.error("joinViaLink: precreateAppUserId", e);
    back("Inscription momentanément impossible. Réessayez dans un instant.");
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
  if (result !== "OK") {
    await discard();
    if (result === "EMAIL_TAKEN" || result === "IS_KINE") {
      back("Un compte EasyPhysio existe déjà avec cette adresse : connectez-vous avec elle.");
    }
    back(result === "KINE_UNAVAILABLE" ? "Ce kinésithérapeute n'accepte pas de nouveaux patients pour le moment." : "Inscription momentanément impossible. Réessayez dans un instant.");
  }

  try {
    const client = await clerkClient();
    const origin = await requestOrigin();
    await client.invitations.createInvitation({
      emailAddress: email,
      // Rien qui révèle le suivi chez un kiné : Clerk est hors HDS (voir
      // addPatient dans app/dashboard/patients/actions.ts).
      redirectUrl: `${origin}/invitation`,
      publicMetadata: { full_name: fullName },
    });
  } catch (e) {
    // La fiche est créée : le kiné pourra renvoyer l'invitation. On le dit
    // simplement au patient plutôt que d'afficher une erreur technique.
    const pending = isClerkAPIResponseError(e) && e.errors.some((ce) => ce.code === "invitation_already_pending" || ce.code === "duplicate_invitation");
    if (!pending) console.error("joinViaLink: invitation Clerk", isClerkAPIResponseError(e) ? e.errors : e);
  }

  redirect(`/rejoindre/${encodeURIComponent(code)}?ok=1&email=${encodeURIComponent(email)}`);
}
