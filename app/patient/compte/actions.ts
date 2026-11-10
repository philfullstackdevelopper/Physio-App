"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { deleteAppUserById } from "@/lib/db/admin";
import { requireUser, forgetKnownUser } from "@/lib/supabase/require-user";
import { revokeCurrentSession } from "@/lib/auth/clerk-session";
import { deleteClerkUserWithRetry } from "@/lib/auth/deleteClerkUser";
import { getStripe } from "@/lib/billing/stripe";
import { getTranslations } from "next-intl/server";

// RGPD droit à l'effacement: a patient deletes their own account. Every
// table referencing patients.id has "on delete cascade" (see the
// migrations), so removing the row here removes the profile, feedback,
// logs, and messages with it.
export async function deleteMyAccount(formData: FormData) {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  const t = await getTranslations("patient.compte");

  // Réservé aux patients (audit du 2026-10-08) : appelée par un kiné, cette
  // action supprimerait son compte praticien — et, par cascade, toutes les
  // données de ses patients. La RLS ne renvoie la ligne patients qu'à son
  // propre titulaire.
  //
  // Audit du 2026-11-10 (A1, C5) : une lecture en échec n'est PAS « pas de
  // fiche » — on s'arrête sans rien supprimer. Et une personne qui a AUSSI une
  // fiche kiné (double rôle) est refusée : supprimer son identité emporterait,
  // par cascade, son compte praticien et tous ses patients.
  const [ownPatientRes, ownKineRes] = await Promise.all([
    supabase.from("patients").select("id").eq("id", user.id).maybeSingle(),
    supabase.from("instructors").select("id").eq("id", user.id).maybeSingle(),
  ]);
  if (ownPatientRes.error || ownKineRes.error) {
    console.error("deleteMyAccount: lecture du compte impossible", ownPatientRes.error ?? ownKineRes.error);
    redirect(`/patient/compte?error=${encodeURIComponent(t("deleteFailed"))}`);
  }
  if (ownKineRes.data) {
    if (!ownPatientRes.data) redirect("/dashboard");
    redirect(`/patient/compte?error=${encodeURIComponent(t("deleteKineAccount"))}`);
  }
  if (!ownPatientRes.data) redirect("/dashboard");

  const confirmation = String(formData.get("confirmation") ?? "").trim().toUpperCase();
  // Le mot à taper dépend de la langue (« SUPPRIMER » / « DELETE ») : les deux sont acceptés.
  if (confirmation !== "SUPPRIMER" && confirmation !== t("confirmWord").toUpperCase()) {
    redirect(`/patient/compte?error=${encodeURIComponent(t("confirmError"))}`);
  }

  // redirect() lève une exception interne à Next : toujours HORS des try.
  let failure: string | null = null;

  // 0) Formule en cours (2026-11-02) : arrêtée tout de suite chez Stripe,
  // sinon le patient continuerait d'être prélevé après la suppression.
  // Lecture en échec : on ABANDONNE (audit du 2026-11-10, A2) — sinon l'arrêt
  // chez Stripe serait sauté, les données effacées, et le prélèvement continuerait.
  const { data: sub, error: subError } = await supabase
    .from("subscriptions")
    .select("stripe_subscription_id, stripe_account_id, status")
    .eq("user_id", user.id)
    .maybeSingle();
  if (subError) {
    console.error("deleteMyAccount: lecture de l'abonnement impossible", subError);
    redirect(`/patient/compte?error=${encodeURIComponent(t("cancelFailed"))}`);
  }
  // Abonnement d'accès : compte EasyPhysio (stripe_account_id vide) ; ancienne formule : compte du kiné.
  if (sub?.stripe_subscription_id && sub.status !== "canceled") {
    try {
      await getStripe().subscriptions.cancel(
        sub.stripe_subscription_id as string,
        undefined,
        sub.stripe_account_id ? { stripeAccount: sub.stripe_account_id as string } : undefined,
      );
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (code !== "resource_missing") {
        console.error("deleteMyAccount: résiliation Stripe impossible", err);
        failure = t("cancelFailed");
      }
    }
  }
  if (failure) redirect(`/patient/compte?error=${encodeURIComponent(failure)}`);

  // 1) Les données : la ligne d'identité interne (cascade sur toutes les
  // tables du patient). Connexion directe, pas le client supabase-js. Si ça
  // échoue, l'identité Clerk existe encore : le patient peut se reconnecter
  // et réessayer.
  try {
    await deleteAppUserById(user.id);
  } catch (err) {
    console.error("deleteMyAccount: suppression des données impossible", err);
    failure = t("deleteFailed");
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

  const t = await getTranslations("patient.compte");
  const [{ data: patientRow, error: patientError }, { data: kineRow, error: kineError }] = await Promise.all([
    supabase.from("patients").select("id").eq("id", user.id).maybeSingle(),
    supabase.from("instructors").select("id").eq("id", user.id).maybeSingle(),
  ]);
  // Lecture en échec (PostgREST indisponible…) : on ne sait PAS si une fiche
  // existe — on ne supprime RIEN (audit du 2026-11-10, A1 : sinon une simple
  // panne de lecture pouvait finir en dossier patient effacé par cascade).
  if (patientError || kineError) {
    console.error("deleteOrphanIdentity: lecture du compte impossible", patientError ?? kineError);
    redirect(`/patient?error=${encodeURIComponent(t("orphanDeleteFailed"))}`);
  }
  if (patientRow) redirect("/patient");
  if (kineRow) redirect("/dashboard");

  let failure: string | null = null;
  try {
    await deleteAppUserById(user.id);
  } catch (err) {
    console.error("deleteOrphanIdentity: suppression de la correspondance impossible", err);
    failure = t("orphanDeleteFailed");
  }
  if (failure) redirect(`/patient?error=${encodeURIComponent(failure)}`);

  const identityDeleted = await deleteClerkUserWithRetry(user.clerkId);
  forgetKnownUser(user.clerkId);
  await revokeCurrentSession();
  redirect(identityDeleted ? "/login?deleted=1" : "/login?deleted=partial");
}
