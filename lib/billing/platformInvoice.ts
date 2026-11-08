// =============================================================================
// Facture EasyPhysio du kiné (modèle du 2026-10-24) — côté serveur.
//
// Abonnement kiné arrêté le 2026-11-02 (KINE_SUBSCRIPTION_BILLING = false).
// La facturation mensuelle (tâche du 1er, bouton de secours sur /admin) et
// l'enregistrement d'une carte/IBAN par le kiné ont été retirés
// (Philippe, 2026-11-06 : audit, on allège). Il ne reste que ce que le
// webhook Stripe plateforme lit encore pour d'anciennes sessions ou
// factures déjà émises.
// =============================================================================
import type Stripe from "stripe";
import { getStripe } from "./stripe";
import { upsertPlatformBilling, upsertPlatformInvoice } from "@/lib/db/admin";
import { periodLastDay } from "./reviewModel";
import { verify } from "./signing";

const validSig = (instructorId: string, given: string | undefined) => verify(`platform_billing:${instructorId}`, given);

/** Durée payée d'avance d'une ancienne facture kiné (1, 3, 6 ou 12 mois ; 1 par défaut). */
function planMonthsOf(value: number): number {
  return [1, 3, 6, 12].includes(value) ? value : 1;
}

/** Après le Checkout « setup » (retour du kiné ou webhook plateforme). Rejouable. */
export async function finalizePlatformBillingSetup(sessionId: string): Promise<string | null> {
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["setup_intent", "setup_intent.payment_method"],
  });
  if (session.mode !== "setup" || session.status !== "complete" || session.metadata?.kind !== "platform_billing") return null;
  const instructorId = session.metadata.instructor_id;
  if (!instructorId || !validSig(instructorId, session.metadata.platform_sig)) return null;
  const setupIntent = session.setup_intent as Stripe.SetupIntent | null;
  const pm = (setupIntent?.payment_method as Stripe.PaymentMethod | null) ?? null;
  const customerId = typeof session.customer === "string" ? session.customer : (session.customer?.id ?? null);
  if (!pm || !customerId || setupIntent?.status !== "succeeded") return null;

  // Moyen de paiement par défaut des factures : la facture mensuelle le prélève seule.
  await stripe.customers.update(customerId, { invoice_settings: { default_payment_method: pm.id } });
  const label = pm.sepa_debit
    ? `Prélèvement SEPA •••• ${pm.sepa_debit.last4}`
    : pm.card
      ? `${pm.card.brand.toUpperCase()} •••• ${pm.card.last4}`
      : pm.type;
  await upsertPlatformBilling({ instructorId, stripeCustomerId: customerId, stripePaymentMethodId: pm.id, label });
  return instructorId;
}

/** Webhook plateforme `invoice.paid` / `invoice.payment_failed` : met à jour la facture du mois. */
export async function syncPlatformInvoice(invoice: Stripe.Invoice): Promise<void> {
  const kineId = invoice.metadata?.instructor_id;
  const period = invoice.metadata?.period;
  if (!kineId || !period || !invoice.id) return;
  // Durée payée d'avance (métadonnée posée par l'ancienne facturation mensuelle ; 1 mois par défaut).
  const lastDay = periodLastDay(period, planMonthsOf(Number(invoice.metadata?.months ?? 1)));
  const status = invoice.status === "paid" ? "paid" : invoice.status === "uncollectible" ? "uncollectible" : invoice.status === "void" ? "void" : "open";
  await upsertPlatformInvoice({ instructorId: kineId, periodStart: period, periodEnd: lastDay, patientCount: 0, amountCents: invoice.total, stripeInvoiceId: invoice.id, status });
}
