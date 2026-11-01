// =============================================================================
// Facture EasyPhysio du kiné (nouveau modèle, 2026-10-24) — côté serveur.
//
// Flux entièrement séparé des honoraires : ici tout se passe sur le compte
// Stripe d'EasyPhysio (la plateforme), jamais sur celui du kiné.
//   - Le kiné enregistre une carte ou un mandat de prélèvement SEPA
//     (Checkout « setup », aucun débit).
//   - Le 1er de chaque mois (tâche planifiée, ou bouton de secours sur
//     /admin), chaque kiné validé dont la période payée est terminée reçoit
//     la facture de la durée qu'il a choisie (1, 3, 6 ou 12 mois), payée
//     d'avance, patients illimités, prélevée automatiquement. Premier mois
//     offert. En cabinet (migration 0078), le payeur règle pour lui et ses
//     collègues, à tarif dégressif ; les collègues ne reçoivent rien.
// =============================================================================
import { createHmac, timingSafeEqual } from "node:crypto";
import type Stripe from "stripe";
import { getStripe } from "./stripe";
import {
  listAllInstructors,
  listTestAccounts,
  platformBillingList,
  cabinetList,
  platformInvoicesWithEnd,
  platformPlans,
  upsertPlatformBilling,
  upsertPlatformInvoice,
} from "@/lib/db/admin";
import { VAT_RATE, periodCovered, periodLabel, periodLastDay, planMonthsOf, platformFeeForPeriod } from "./reviewModel";

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
  invoiced: { instructorId: string; ttcCents: number; free: boolean; months: number; kines: number }[];
  missingPaymentMethod: { instructorId: string }[];
  /** Mois déjà payé (d'avance ou facture déjà émise). */
  alreadyDone: string[];
  /** Collègues d'un cabinet : réglés par leur payeur. */
  coveredByCabinet: string[];
  errors: { instructorId: string; message: string }[];
};

/**
 * Facture, au 1er du mois `period` (« AAAA-MM-01 »), chaque kiné validé hors
 * comptes de test dont ce mois n'est pas déjà payé : la durée qu'il a choisie,
 * d'avance. Le payeur d'un cabinet règle pour lui + ses collègues actifs ;
 * les collègues sont sautés. Ne facture jamais deux fois une même période
 * (table platform_invoices, unique par kiné et par mois de début). L'appelant
 * doit avoir vérifié que c'est l'administrateur (ou la tâche planifiée).
 */
export async function runMonthlyInvoicing(period: string): Promise<MonthlyInvoicingReport> {
  const stripe = getStripe();
  const [kines, testAccounts, billing, invoices, plans, cabinets] = await Promise.all([
    listAllInstructors(),
    listTestAccounts(),
    platformBillingList(),
    platformInvoicesWithEnd(),
    platformPlans(),
    cabinetList(),
  ]);
  const testIds = new Set(testAccounts.filter((t) => t.kind === "kine").map((t) => t.app_id));
  const billable = new Set(kines.filter((k) => k.status === "approved" && !testIds.has(k.id)).map((k) => k.id));
  const report: MonthlyInvoicingReport = { period, invoiced: [], missingPaymentMethod: [], alreadyDone: [], coveredByCabinet: [], errors: [] };
  const billingByKine = new Map(billing.map((b) => [b.instructor_id, b]));
  const planOf = new Map(plans.map((p) => [p.instructor_id, planMonthsOf(p.plan_months)]));
  const paidUp = (kineId: string) =>
    invoices.some((i) => i.instructor_id === kineId && i.status !== "draft" && periodCovered(period, i.period_start, i.period_end));
  // Collègues actifs d'un cabinet dont le payeur est lui-même facturable.
  const activeLinks = cabinets.filter(
    (c) => c.status === "active" && billable.has(c.member_instructor_id) && billable.has(c.payer_instructor_id),
  );
  const payerOf = new Map(activeLinks.map((c) => [c.member_instructor_id, c.payer_instructor_id]));
  let taxRate: string | null = null;

  for (const kineId of billable) {
    if (payerOf.has(kineId)) {
      report.coveredByCabinet.push(kineId);
      continue;
    }
    if (paidUp(kineId)) {
      report.alreadyDone.push(kineId);
      continue;
    }
    // Le payeur + ses collègues qui ne sont plus couverts par leur propre
    // période payée (un nouveau collègue finit d'abord la sienne).
    const members = activeLinks.filter((c) => c.payer_instructor_id === kineId && !paidUp(c.member_instructor_id)).length;
    const pastInvoices = invoices.filter((i) => i.instructor_id === kineId);
    // Premier mois = aucune facture plus ancienne (même offerte).
    const firstMonth = !pastInvoices.some((i) => i.period_start < period && i.status !== "draft");
    const fee = platformFeeForPeriod({ months: planOf.get(kineId) ?? 1, kines: 1 + members, isFirstBilledMonth: firstMonth, day: period });
    const lastDay = periodLastDay(period, fee.months);

    if (fee.free) {
      await upsertPlatformInvoice({ instructorId: kineId, periodStart: period, periodEnd: lastDay, patientCount: 0, amountCents: 0, stripeInvoiceId: null, status: "paid" });
      report.invoiced.push({ instructorId: kineId, ttcCents: 0, free: true, months: 1, kines: fee.kines });
      continue;
    }

    const b = billingByKine.get(kineId);
    if (!b?.stripe_payment_method_id) {
      // Gardé en brouillon : visible sur /admin, facturé dès que le kiné a enregistré son moyen de paiement.
      await upsertPlatformInvoice({ instructorId: kineId, periodStart: period, periodEnd: lastDay, patientCount: 0, amountCents: fee.ttcCents, stripeInvoiceId: null, status: "draft" });
      report.missingPaymentMethod.push({ instructorId: kineId });
      continue;
    }

    const what = `${fee.months} mois à partir de ${periodLabel(period)}${fee.kines > 1 ? `, cabinet de ${fee.kines} kinés` : ""}`;
    const key = `${kineId}-${period}-${fee.months}m-${fee.kines}k`;
    try {
      taxRate ??= await vatTaxRateId(stripe);
      const invoice = await stripe.invoices.create(
        {
          customer: b.stripe_customer_id,
          collection_method: "charge_automatically",
          auto_advance: true,
          default_tax_rates: [taxRate],
          pending_invoice_items_behavior: "exclude",
          description: `EasyPhysio — abonnement, ${what}`,
          metadata: { instructor_id: kineId, period, months: String(fee.months), kines: String(fee.kines) },
        },
        { idempotencyKey: `platform-invoice-${key}` },
      );
      await stripe.invoiceItems.create(
        {
          customer: b.stripe_customer_id,
          invoice: invoice.id,
          quantity: 1,
          price_data: { currency: "eur", product: await platformProductId(stripe), unit_amount: fee.htCents },
          description: `Abonnement EasyPhysio — ${what} (patients illimités)`,
        },
        { idempotencyKey: `platform-invoice-item-${key}` },
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
      report.invoiced.push({ instructorId: kineId, ttcCents: fee.ttcCents, free: false, months: fee.months, kines: fee.kines });
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
  // Durée payée d'avance (métadonnée posée par runMonthlyInvoicing ; 1 mois pour les anciennes factures).
  const lastDay = periodLastDay(period, planMonthsOf(Number(invoice.metadata?.months ?? 1)));
  const status = invoice.status === "paid" ? "paid" : invoice.status === "uncollectible" ? "uncollectible" : invoice.status === "void" ? "void" : "open";
  await upsertPlatformInvoice({ instructorId: kineId, periodStart: period, periodEnd: lastDay, patientCount: 0, amountCents: invoice.total, stripeInvoiceId: invoice.id, status });
}
