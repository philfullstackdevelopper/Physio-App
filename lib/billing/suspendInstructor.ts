import "server-only";
import type Stripe from "stripe";
import { getStripe } from "@/lib/billing/stripe";
import { listInstructorSubscriptions, setInstructorStatus } from "@/lib/db/admin";

// Suspension d'un kiné par l'administrateur (Philippe, 2026-10-07 : « be able
// to kick some out … it shouldn't be a problem for the clients, they should
// automatically stop being charged / be reimbursed if possible »).
//
//  1. Statut « suspended » : le kiné n'a plus accès au dashboard.
//  2. Chaque abonnement de ses patients est résilié IMMÉDIATEMENT sur son
//     compte Stripe Connect (paiement direct : l'argent est chez le kiné).
//  3. Patient qui avait payé la période en cours : remboursé au prorata des
//     jours restants, repris sur le compte du kiné ; la commission EasyPhysio
//     correspondante est rendue elle aussi (refund_application_fee).
//     En période d'essai : simple résiliation, rien n'a été prélevé.
//  4. Les patients gardent l'accès gratuit à leur programme, leur historique et
//     leurs données (app/patient/layout.tsx) — seule la messagerie est coupée.
//
// Rejouable : un abonnement résilié par une suspension précédente est repris
// (remboursement manquant terminé, jamais deux fois) ; les autres sont ignorés.

export type SuspensionReport = {
  cancelled: number;
  refunds: number;
  refundedCents: number;
  failures: number;
};

const MIN_REFUND_CENTS = 50; // Stripe refuse les remboursements sous 0,50 €.
// Marque posée sur l'abonnement résilié par une suspension : permet, en cas de
// relance, de reconnaître nos propres résiliations et de finir le remboursement.
const SUSPENSION_COMMENT = "kine_suspendu";

async function paymentIntentOf(stripe: Stripe, invoiceId: string, opts?: Stripe.RequestOptions): Promise<string | null> {
  const payments = await stripe.invoicePayments.list({ invoice: invoiceId, limit: 5 }, opts);
  for (const p of payments.data) {
    if (p.status !== "paid") continue;
    const pi = p.payment.payment_intent;
    if (pi) return typeof pi === "string" ? pi : pi.id;
  }
  return null;
}

export async function suspendInstructor(instructorId: string): Promise<SuspensionReport> {
  await setInstructorStatus(instructorId, "suspended");

  const stripe = getStripe();
  const report: SuspensionReport = { cancelled: 0, refunds: 0, refundedCents: 0, failures: 0 };
  const nowSec = Math.floor(Date.now() / 1000);

  for (const row of await listInstructorSubscriptions(instructorId)) {
    // Anciens abonnements « patient_monthly » : sur le compte plateforme.
    const opts = row.connect_account_id ? { stripeAccount: row.connect_account_id } : undefined;
    try {
      let sub: Stripe.Subscription;
      try {
        sub = await stripe.subscriptions.retrieve(row.stripe_subscription_id, { expand: ["latest_invoice"] }, opts);
      } catch (e) {
        if ((e as { code?: string }).code === "resource_missing") continue;
        throw e;
      }
      // Ordre revu à l'audit du 2026-10-08 : RÉSILIER D'ABORD (le patient
      // n'est plus prélevé, quoi qu'il arrive ensuite), rembourser ENSUITE.
      // Avant, un remboursement réussi suivi d'une résiliation en échec
      // laissait le patient prélevé ; et le montant, recalculé à chaque
      // relance, changeait sous la même clé d'idempotence.
      const suspendedByUs = sub.status === "canceled" && sub.cancellation_details?.comment === SUSPENSION_COMMENT;
      if ((sub.status === "canceled" && !suspendedByUs) || sub.status === "incomplete_expired") continue;

      const wasPaying = suspendedByUs || sub.status === "active" || sub.status === "past_due";
      if (sub.status !== "canceled") {
        // Résiliation immédiate, sans facture de régularisation (le prorata
        // est rendu ci-dessous). Le webhook customer.subscription.deleted met
        // ensuite la ligne `subscriptions` à jour.
        sub = await stripe.subscriptions.cancel(
          sub.id,
          { prorate: false, invoice_now: false, cancellation_details: { comment: SUSPENSION_COMMENT }, expand: ["latest_invoice"] },
          opts,
        );
        report.cancelled += 1;
      }

      if (wasPaying) {
        // Prorata calculé au moment de la résiliation (canceled_at) : le même
        // montant à chaque relance.
        const cancelledAt = sub.canceled_at ?? nowSec;
        const item = sub.items.data[0];
        const start = item?.current_period_start ?? 0;
        const end = item?.current_period_end ?? 0;
        const remaining = end > start ? Math.min(Math.max((end - cancelledAt) / (end - start), 0), 1) : 0;
        const invoice = sub.latest_invoice && typeof sub.latest_invoice !== "string" ? sub.latest_invoice : null;
        const amount = invoice ? Math.floor(invoice.amount_paid * remaining) : 0;
        if (invoice?.id && amount >= MIN_REFUND_CENTS) {
          const paymentIntent = await paymentIntentOf(stripe, invoice.id, opts);
          // Déjà remboursé lors d'une suspension précédente ? On ne refait rien
          // (la clé d'idempotence de Stripe ne dure que 24 h).
          const already = paymentIntent
            ? (await stripe.refunds.list({ payment_intent: paymentIntent, limit: 20 }, opts)).data.some(
                (r) => r.metadata?.cause === "kine_suspendu" && r.status !== "failed" && r.status !== "canceled",
              )
            : true;
          if (paymentIntent && !already) {
            await stripe.refunds.create(
              {
                payment_intent: paymentIntent,
                amount,
                refund_application_fee: !!opts,
                reason: "requested_by_customer",
                metadata: { cause: "kine_suspendu", instructor_id: instructorId, patient_id: row.patient_id },
              },
              { ...opts, idempotencyKey: `suspend-refund-${sub.id}-${invoice.id}` },
            );
            report.refunds += 1;
            report.refundedCents += amount;
          }
        }
      }
    } catch (e) {
      report.failures += 1;
      console.error(`[suspendInstructor] abonnement ${row.stripe_subscription_id} :`, e);
    }
  }
  return report;
}
