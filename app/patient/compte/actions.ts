"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { deleteAppUserById } from "@/lib/db/admin";
import { requireUser, forgetKnownUser } from "@/lib/supabase/require-user";
import { revokeCurrentSession } from "@/lib/auth/clerk-session";
import { deleteClerkUserWithRetry } from "@/lib/auth/deleteClerkUser";

// RGPD droit à l'effacement: a patient deletes their own account. Every
// table referencing patients.id has "on delete cascade" (see the
// migrations), so removing the row here removes the profile, feedback,
// logs, and messages with it.
export async function deleteMyAccount(formData: FormData) {
  const supabase = await createClient();
  const user = await requireUser(supabase);

  // Réservé aux patients (audit du 2026-10-08) : appelée par un kiné, cette
  // action supprimerait son compte praticien — et, par cascade, toutes les
  // données de ses patients. La RLS ne renvoie la ligne patients qu'à son
  // propre titulaire.
  const { data: ownPatientRow } = await supabase.from("patients").select("id").eq("id", user.id).maybeSingle();
  if (!ownPatientRow) redirect("/dashboard");

  const confirmation = String(formData.get("confirmation") ?? "").trim().toUpperCase();
  if (confirmation !== "SUPPRIMER") {
    redirect(
      `/patient/compte?error=${encodeURIComponent(
        'Tapez exactement "SUPPRIMER" pour confirmer.',
      )}`,
    );
  }

  // redirect() lève une exception interne à Next : toujours HORS des try.
  let failure: string | null = null;

  // 1) Les données : la ligne d'identité interne  // 2) Les données : la ligne d'identité interne (cascade sur toutes les
  // tables du patient). Connexion directe, pas le client supabase-js. Si ça
  // échoue, l'identité Clerk existe encore : le patient peut se reconnecter
  // et réessayer.
  try {
    await deleteAppUserById(user.id);
  } catch (err) {
    console.error("deleteMyAccount: suppression des données impossible", err);
    failure = "Suppression des données impossible pour le moment. Votre compte est intact — réessayez dans quelques minutes.";
  }
  if (failure) redirect(`/patient/compte?error=${encodeURIComponent(failure)}`);

  // 3) EN DERNIER, l'identité Clerk (connexion, e-mail, mot de passe), avec
  // plusieurs tentatives. Les données de santé sont déjà effacées à ce stade.
  // Si Clerk refuse quand même, l'identifiant reste (sans aucune donnée) et
  // l'e-mail serait bloqué pour une future invitation : la personne pourra
  // terminer elle-même en se reconnectant une fois — l'écran « compte non
  // associé » (PatientNoRecordGate) propose alors de supprimer l'identifiant.
  const identityDeleted = await deleteClerkUserWithRetry(user.clerkId);

  forgetKnownUser(user.clerkId);
  await revokeCurrentSession();
  redirect(identityDeleted ? "/login?deleted=1" : "/login?deleted=partial");
}

// Identifiant de connexion resté sans aucune donnée (compte supprimé par le
// patient ou par son kiné, mais la suppression de l'identifiant avait échoué) :
// la personne connectée le supprime elle-même, ce qui libère son e-mail pour
// une nouvelle invitation. Elle n'agit que sur SON PROPRE identifiant, et
// seulement s'il n'est rattaché ni à une fiche patient ni à un compte kiné.
export async function deleteOrphanIdentity() {
  const supabase = await createClient();
  const user = await requireUser(supabase);

  const [{ data: patientRow }, { data: kineRow }] = await Promise.all([
    supabase.from("patients").select("id").eq("id", user.id).maybeSingle(),
    supabase.from("instructors").select("id").eq("id", user.id).maybeSingle(),
  ]);
  if (patientRow) redirect("/patient");
  if (kineRow) redirect("/dashboard");

  let failure: string | null = null;
  try {
    await deleteAppUserById(user.id);
  } catch (err) {
    console.error("deleteOrphanIdentity: suppression de la correspondance impossible", err);
    failure = "Suppression impossible pour le moment. Réessayez dans quelques minutes.";
  }
  if (failure) redirect(`/patient?error=${encodeURIComponent(failure)}`);

  const identityDeleted = await deleteClerkUserWithRetry(user.clerkId);
  forgetKnownUser(user.clerkId);
  await revokeCurrentSession();
  redirect(identityDeleted ? "/login?deleted=1" : "/login?deleted=partial");
}
