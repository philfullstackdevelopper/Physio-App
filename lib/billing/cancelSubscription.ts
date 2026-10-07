// Résiliation IMMÉDIATE de l'abonnement Stripe d'un patient (Philippe,
// 2026-10-07 : avant ce helper, supprimer un compte patient laissait
// l'abonnement tourner chez Stripe — le patient continuait d'être prélevé
// par son kiné alors qu'il n'avait plus de compte).
//
// Server-only : importe la clé secrète Stripe (lib/billing/stripe.ts) — ne
// jamais l'importer depuis un composant client.
//
// L'abonnement vit sur le compte Stripe Connect du KINÉ (Direct charge, voir
// app/patient/abonnement/actions.ts) — on résout ce compte exactement comme
// app/billing/return/route.ts et app/billing/actions.ts : patients.instructor_id
// puis instructor_connect_accounts. Lectures via le client RLS normal :
//   - le patient lui-même lit sa ligne `subscriptions` (subscriptions_self_read),
//     sa fiche `patients` et le compte Connect de SON kiné
//     (connect_accounts_patient_read, migration 0057) ;
//   - son kiné lit les mêmes lignes via subscriptions_instructor_read
//     (migration 0055) et ses propres patients / son propre compte Connect.
// Appelé par quelqu'un d'autre, rien n'est visible → retour silencieux.
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "./stripe";

// Statuts Stripe où il n'y a plus rien à résilier.
const ENDED_STATUSES = new Set(["canceled", "incomplete_expired"]);

function isResourceMissing(err: unknown): boolean {
  return (err as { code?: unknown })?.code === "resource_missing";
}

/**
 * Résilie immédiatement l'abonnement Stripe du patient, s'il en a un.
 * Pas d'abonnement / déjà résilié / introuvable chez Stripe → retour silencieux.
 * Toute autre erreur Stripe est relancée : c'est à l'appelant de décider
 * (ex. ne PAS supprimer le compte si la résiliation a échoué).
 */
export async function cancelPatientSubscription(patientUserId: string): Promise<void> {
  const supabase = await createClient();

  const [{ data: sub }, { data: patient }] = await Promise.all([
    supabase
      .from("subscriptions")
      .select("stripe_subscription_id, status")
      .eq("user_id", patientUserId)
      .maybeSingle(),
    supabase.from("patients").select("instructor_id").eq("id", patientUserId).maybeSingle(),
  ]);
  const subscriptionId = (sub?.stripe_subscription_id as string | null) ?? null;
  if (!subscriptionId) return;
  if (ENDED_STATUSES.has((sub?.status as string | null) ?? "")) return;

  const instructorId = (patient?.instructor_id as string | null) ?? null;
  const { data: connect } = instructorId
    ? await supabase
        .from("instructor_connect_accounts")
        .select("stripe_connect_account_id")
        .eq("instructor_id", instructorId)
        .maybeSingle()
    : { data: null };
  const stripeAccount = (connect?.stripe_connect_account_id as string | null) ?? null;
  // Sans compte Connect : ancien abonnement plateforme (patient_monthly).
  const opts = stripeAccount ? { stripeAccount } : undefined;

  const stripe = getStripe();
  try {
    // La ligne locale peut être en retard sur Stripe (webhook pas encore
    // arrivé) : on relit le vrai statut avant de résilier.
    const current = await stripe.subscriptions.retrieve(subscriptionId, undefined, opts);
    if (ENDED_STATUSES.has(current.status)) return;
    await stripe.subscriptions.cancel(subscriptionId, {}, opts);
  } catch (err) {
    if (isResourceMissing(err)) return;
    throw err;
  }
}
