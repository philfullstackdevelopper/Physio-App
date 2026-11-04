// Suspension d'un kiné par l'administrateur (Philippe, 2026-10-07) : son
// accès est coupé ; ses patients gardent leur programme, gratuitement.
// Formules patient (2026-11-02) : les abonnements de ses patients sont
// arrêtés tout de suite chez Stripe, sinon ils continueraient d'être prélevés
// pour un suivi que le kiné ne peut plus assurer.
import { instructorSubscriptions, setInstructorStatus } from "@/lib/db/admin";
import { getStripe } from "./stripe";
import { refreshPatientSubscription } from "./patientSubscription";

const LIVE = new Set(["active", "trialing", "past_due", "unpaid", "incomplete"]);

export async function suspendInstructor(instructorId: string): Promise<void> {
  const subs = await instructorSubscriptions(instructorId);
  const stripe = getStripe();
  for (const s of subs) {
    if (!LIVE.has(s.status) || !s.connect_account_id) continue;
    try {
      await stripe.subscriptions.cancel(s.stripe_subscription_id, undefined, { stripeAccount: s.connect_account_id });
    } catch (e) {
      if ((e as { code?: string })?.code !== "resource_missing") throw e;
    }
    await refreshPatientSubscription(s.stripe_subscription_id, s.connect_account_id);
  }
  await setInstructorStatus(instructorId, "suspended");
}
