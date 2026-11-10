// Suspension d'un kiné par l'administrateur (Philippe, 2026-10-07) : son
// accès est coupé ; ses patients gardent leur programme, gratuitement.
// Leurs abonnements sont arrêtés tout de suite chez Stripe, sinon ils
// continueraient d'être prélevés pour un suivi que le kiné ne peut plus
// assurer : l'abonnement d'accès (compte EasyPhysio, modèle du 2026-11-04) et,
// s'il en reste, une formule de l'ancien modèle (compte du kiné). Plus aucun
// prélèvement des 6 € du kiné non plus : lib/billing/autoReview.ts refuse de
// prélever pour un kiné suspendu.
import { instructorSubscriptions, setInstructorStatus } from "@/lib/db/admin";
import { getStripe } from "./stripe";
import { refreshPatientSubscription } from "./patientSubscription";

const LIVE = new Set(["active", "trialing", "past_due", "unpaid", "incomplete"]);

const missing = (e: unknown) => (e as { code?: string })?.code === "resource_missing";

export async function suspendInstructor(instructorId: string): Promise<void> {
  await cancelPatientSubscriptionsOf(instructorId);
  await setInstructorStatus(instructorId, "suspended");
}

/**
 * Refus d'un kiné par l'administrateur (audit du 2026-11-10) : comme pour une
 * suspension, ses patients gardent leur programme gratuitement
 * (lib/patient/patientGate.ts traite « refusé » comme « suspendu ») — leurs
 * abonnements sont donc arrêtés chez Stripe AVANT de changer son statut,
 * sinon ils continueraient d'être prélevés. Si Stripe échoue, le statut ne
 * change pas : on peut recommencer.
 */
export async function rejectInstructorAndStopBilling(instructorId: string): Promise<void> {
  await cancelPatientSubscriptionsOf(instructorId);
  await setInstructorStatus(instructorId, "rejected");
}

/** Arrête tout de suite, chez Stripe, les abonnements encore ouverts des patients de ce kiné. Rejouable. */
async function cancelPatientSubscriptionsOf(instructorId: string): Promise<void> {
  const subs = await instructorSubscriptions(instructorId);
  const stripe = getStripe();
  for (const s of subs) {
    if (!LIVE.has(s.status)) continue;
    // D'abord sur le compte EasyPhysio (abonnement d'accès) ; s'il n'y est
    // pas, c'est une formule de l'ancien modèle, sur le compte du kiné.
    let account: string | null = null;
    try {
      await stripe.subscriptions.cancel(s.stripe_subscription_id);
    } catch (e) {
      if (!missing(e)) throw e;
      if (!s.connect_account_id) continue;
      account = s.connect_account_id;
      try {
        await stripe.subscriptions.cancel(s.stripe_subscription_id, undefined, { stripeAccount: account });
      } catch (e2) {
        if (!missing(e2)) throw e2;
      }
    }
    await refreshPatientSubscription(s.stripe_subscription_id, account);
  }
}
