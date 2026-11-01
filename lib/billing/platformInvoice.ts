// =============================================================================
// Facture EasyPhysio du kiné (nouveau modèle, 2026-10-24) — côté serveur.
//
// Flux entièrement séparé des honoraires : ici tout se passe sur le compte
// Stripe d'EasyPhysio (la plateforme), jamais sur celui du kiné.
//   - Le kiné enregistre une carte ou un mandat de prélèvement SEPA
//     (Checkout « setup », aucun débit).
//   - Le 1er de chaque mois (tâche planifiée, ou bouton de secours sur
//     /admin), chaque kiné validé reçoit la facture du mois qui commence :
//     l'abonnement fixe (KINE_SUBSCRIPTION_*), payé d'avance, patients
//     illimités, prélevé automatiquement. Premier mois offert.
// =============================================================================
import { createHmac, timingSafeEqual } from "node:crypto";
import type Stripe from "stripe";
import { getStripe } from "./stripe";
import {
  listAllInstructors,
  listTestAccounts,
  platformBillingList,
  platformInvoicesList,
  upsertPlatformBilling,
  upsertPlatformInvoice,
} from "@/lib/db/admin";
import { KINE_SUBSCRIPTION_HT_CENTS, VAT_RATE, nextPeriod, periodLabel, platformFeeForMonth } from "./reviewModel";

function sig(instructorId: string): string {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set.");
  return createHmac("sha256", key).update(`platform_billing:${instructorId}`).digest("hex");
}

function validSig(instructorId: string, given: string | undefined): boolean {
  if (!given || !/^[0-9a-f]+$/i.test(given)) return false;
  const a = Buffer.from(given, "hex");
  const b = Buffer.from(sig(instructorId), "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Crée (ou réutilise) le client Stripe du kiné sur le compte plateforme et ouvre un Checkout « setup ». */
export async function createPlatformBillingSetupUrl(p: {
  instructorId: string;
  email: string | null;
  name: string | null;
  existingCustomerId: string | null;
  baseUrl: string;
}): Promise<string | null> {
  const stripe = getStripe();
  let customerId = p.existingCustomerId;
  if (customerId) {
    try {
      const c = await stripe.customers.retrieve(customerId);
      if ("deleted" in c && c.deleted) customerId = null;
    } catch {
      customerId = null;
    }
  }
  if (!customerId) {
    const customer = await stripe.customers.create(
      { email: p.email ?? undefined, name: p.name ?? undefined, metadata: { instructor_id: p.instructorId } },
      { idempotencyKey: `platform-customer-${p.instructorId}` },
    );
    customerId = customer.id;
    await upsertPlatformBilling({ instructorId: p.instructorId, stripeCustomerId: customerId, stripePaymentMethodId: null, label: null });
  }
  const session = await stripe.checkout.sessions.create({
    mode: "setup",
    customer: customerId,
    currency: "eur",
    payment_method_types: ["sepa_debit", "card"],
    metadata: { kind: "platform_billing", instructor_id: p.instructorId, platform_sig: sig(p.instructorId) },
    success_url: `${p.baseUrl}/dashboard/facturation/moyen-de-paiement?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${p.baseUrl}/dashboard/facturation?moyen=annule`,
  });
  return session.url;
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

// ---- Facturation mensuelle (administrateur) -------------------------------------

async function vatTaxRateId(stripe: Stripe): Promise<string> {
  const existing = await stripe.taxRates.list({ active: true, limit: 100 });
  const found = existing.data.find((t) => t.metadata?.easyphysio === "tva_fr_20");
  if (found) return found.id;
  const created = await stripe.taxRates.create({
    display_name: "TVA",
    percentage: VAT_RATE * 100,
    inclusive: false,
    country: "FR",
    jurisdiction: "FR",
    metadata: { easyphysio: "tva_fr_20" },
  });
  return created.id;
}

// Le produit « Patient actif » du catalogue Stripe d'EasyPhysio (créé une fois).
async function platformProductId(stripe: Stripe): Promise<string> {
  const found = await stripe.products.search({ query: "metadata['easyphysio']:'abonnement_kine'" });
  if (found.data[0]) return found.data[0].id;
  const product = await stripe.products.create({
    name: "EasyPhysio — abonnement mensuel",
    metadata: { easyphysio: "abonnement_kine" },
  });
  return product.id;
}

export type MonthlyInvoicingReport = {
  period: string;
  invoiced: { instructorId: string; ttcCents: number; free: boolean }[];
  missingPaymentMethod: { instructorId: string }[];
  alreadyDone: string[];
  errors: { instructorId: string; message: string }[];
};

/**
 * Facture le mois `period` (« AAAA-MM-01 », le mois qui commence) à chaque
 * kiné validé, hors comptes de test : l'abonnement fixe, d'avance. Ne
 * facture jamais deux fois un même mois (table platform_invoices, unique par
 * kiné et par mois). L'appelant doit avoir vérifié que c'est
 * l'administrateur (ou la tâche planifiée).
 */
export async function runMonthlyInvoicing(period: string): Promise<MonthlyInvoicingReport> {
  const stripe = getStripe();
  const periodEnd = nextPeriod(period);
  const [kines, testAccounts, billing, invoices] = await Promise.all([
    listAllInstructors(),
    listTestAccounts(),
    platformBillingList(),
    platformInvoicesList(),
  ]);
  const testIds = new Set(testAccounts.filter((t) => t.kind === "kine").map((t) => t.app_id));
  const report: MonthlyInvoicingReport = { period, invoiced: [], missingPaymentMethod: [], alreadyDone: [], errors: [] };
  const billingByKine = new Map(billing.map((b) => [b.instructor_id, b]));
  const lastDay = new Date(Date.UTC(Number(periodEnd.slice(0, 4)), Number(periodEnd.slice(5, 7)) - 1, 0)).toISOString().slice(0, 10);
  let taxRate: string | null = null;

  for (const kine of kines) {
    if (kine.status !== "approved" || testIds.has(kine.id)) continue;
    const kineId = kine.id;
    const pastInvoices = invoices.filter((i) => i.instructor_id === kineId);
    if (pastInvoices.some((i) => i.period_start === period && i.status !== "draft")) {
      report.alreadyDone.push(kineId);
      continue;
    }
    // Premier mois = aucune facture plus ancienne (même offerte).
    const firstMonth = !pastInvoices.some((i) => i.period_start < period && i.status !== "draft");
    const fee = platformFeeForMonth(firstMonth);

    if (fee.free) {
      await upsertPlatformInvoice({ instructorId: kineId, periodStart: period, periodEnd: lastDay, patientCount: 0, amountCents: 0, stripeInvoiceId: null, status: "paid" });
      report.invoiced.push({ instructorId: kineId, ttcCents: 0, free: true });
      continue;
    }

    const b = billingByKine.get(kineId);
    if (!b?.stripe_payment_method_id) {
      // Gardé en brouillon : visible sur /admin, facturé dès que le kiné a enregistré son moyen de paiement.
      await upsertPlatformInvoice({ instructorId: kineId, periodStart: period, periodEnd: lastDay, patientCount: 0, amountCents: fee.ttcCents, stripeInvoiceId: null, status: "draft" });
      report.missingPaymentMethod.push({ instructorId: kineId });
      continue;
    }

    try {
      taxRate ??= await vatTaxRateId(stripe);
      const invoice = await stripe.invoices.create(
        {
          customer: b.stripe_customer_id,
          collection_method: "charge_automatically",
          auto_advance: true,
          default_tax_rates: [taxRate],
          pending_invoice_items_behavior: "exclude",
          description: `EasyPhysio — abonnement de ${periodLabel(period)}`,
          metadata: { instructor_id: kineId, period },
        },
        { idempotencyKey: `platform-invoice-${kineId}-${period}` },
      );
      await stripe.invoiceItems.create(
        {
          customer: b.stripe_customer_id,
          invoice: invoice.id,
          quantity: 1,
          price_data: { currency: "eur", product: await platformProductId(stripe), unit_amount: KINE_SUBSCRIPTION_HT_CENTS },
          description: `Abonnement EasyPhysio — ${periodLabel(period)} (patients illimités)`,
        },
        { idempotencyKey: `platform-invoice-item-${kineId}-${period}` },
      );
      const finalized = await stripe.invoices.finalizeInvoice(invoice.id!);
      let status: "open" | "paid" = finalized.status === "paid" ? "paid" : "open";
      try {
        const paid = await stripe.invoices.pay(invoice.id!);
        if (paid.status === "paid") status = "paid";
      } catch {
        // Prélèvement SEPA en cours (quelques jours) ou carte refusée : la facture reste « open ».
      }
      await upsertPlatformInvoice({ instructorId: kineId, periodStart: period, periodEnd: lastDay, patientCount: 0, amountCents: fee.ttcCents, stripeInvoiceId: invoice.id!, status });
      report.invoiced.push({ instructorId: kineId, ttcCents: fee.ttcCents, free: false });
    } catch (e) {
      report.errors.push({ instructorId: kineId, message: e instanceof Error ? e.message : String(e) });
    }
  }
  return report;
}

/** Webhook plateforme `invoice.paid` / `invoice.payment_failed` : met à jour la facture du mois. */
export async function syncPlatformInvoice(invoice: Stripe.Invoice): Promise<void> {
  const kineId = invoice.metadata?.instructor_id;
  const period = invoice.metadata?.period;
  if (!kineId || !period || !invoice.id) return;
  const periodEnd = nextPeriod(period);
  const lastDay = new Date(Date.UTC(Number(periodEnd.slice(0, 4)), Number(periodEnd.slice(5, 7)) - 1, 0)).toISOString().slice(0, 10);
  const status = invoice.status === "paid" ? "paid" : invoice.status === "uncollectible" ? "uncollectible" : invoice.status === "void" ? "void" : "open";
  await upsertPlatformInvoice({ instructorId: kineId, periodStart: period, periodEnd: lastDay, patientCount: 0, amountCents: invoice.total, stripeInvoiceId: invoice.id, status });
}
