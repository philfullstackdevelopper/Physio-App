// =============================================================================
// Abonnement patient — côté serveur (modèle définitif, Philippe 2026-11-04 ;
// montants et règles : lib/billing/patientPlans.ts).
//
// - L'ACCÈS À LA PLATEFORME (3,99 € / mois) est un abonnement Stripe sur le
//   compte d'EasyPhysio (accountId = null ici). Il est recopié dans la table
//   `subscriptions` depuis le webhook, le retour de paiement et la relecture
//   quand la période est dépassée (pour ne pas dépendre des seuls webhooks).
// - Pour que le kiné puisse prélever SES 6 € directement sur son propre compte
//   Stripe, la carte enregistrée chez EasyPhysio est copiée sur le compte du
//   kiné (« clonage » Stripe) : ensureKineCard. EasyPhysio ne touche jamais
//   l'argent du kiné, et le kiné jamais celui d'EasyPhysio.
// - Les formules de l'ancien modèle (plan_1m / 3m / 6m, sur le compte du kiné
//   avec une part EasyPhysio prélevée au passage) ne se renouvellent plus :
//   chaque fois qu'on en voit une, on lui demande de s'arrêter à la fin de sa
//   période payée.
// =============================================================================
import "server-only";
import type Stripe from "stripe";
import { getStripe } from "./stripe";
import { upsertFollowUp, upsertSubscription } from "@/lib/db/admin";
import { hasValidSubscriptionSignature } from "./subscriptionSignature";
import { ACCESS_PLAN_KEY, KINE_FOLLOW_UP_CENTS, PLATFORM_VAT_RATE, isLegacyPlanKey } from "./patientPlans";

/** Clé de signature des abonnements qui vivent sur le compte d'EasyPhysio. */
export const PLATFORM_SIGNATURE_ACCOUNT = "platform";

/** Fin de période : sur l'abonnement ou, depuis les versions récentes de l'API, sur l'article. */
function periodEndISO(sub: Stripe.Subscription): string | null {
  const top = (sub as unknown as { current_period_end?: number }).current_period_end;
  const item = (sub.items?.data?.[0] as unknown as { current_period_end?: number } | undefined)?.current_period_end;
  const unix = top ?? item ?? null;
  return unix ? new Date(unix * 1000).toISOString() : null;
}

/**
 * Enregistre l'abonnement s'il a été créé par EasyPhysio.
 * accountId = null : abonnement d'accès, sur le compte d'EasyPhysio.
 * accountId = compte du kiné : formule de l'ancien modèle (arrêtée).
 * Renvoie l'id du patient, ou null si l'abonnement est ignoré.
 */
export async function syncPatientSubscription(sub: Stripe.Subscription, accountId: string | null): Promise<string | null> {
  if (!hasValidSubscriptionSignature(sub.metadata, accountId ?? PLATFORM_SIGNATURE_ACCOUNT)) {
    console.warn(`[abonnement] ${sub.id} ignoré : pas créé par EasyPhysio.`);
    return null;
  }
  const userId = sub.metadata.user_id;
  const plan = sub.metadata.plan;
  if (accountId === null ? plan !== ACCESS_PLAN_KEY : !isLegacyPlanKey(plan)) return null;

  let cancelAtPeriodEnd = !!sub.cancel_at_period_end;
  // Ancien modèle : on arrête le renouvellement (l'accès dure jusqu'à la fin
  // de la période déjà payée).
  if (accountId !== null && !cancelAtPeriodEnd && sub.status !== "canceled") {
    try {
      await getStripe().subscriptions.update(sub.id, { cancel_at_period_end: true }, { stripeAccount: accountId });
      cancelAtPeriodEnd = true;
    } catch (e) {
      console.error(`[abonnement] ${sub.id} : arrêt de l'ancienne formule impossible`, e);
    }
  }

  await upsertSubscription({
    userId,
    plan,
    stripeCustomerId: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
    stripeSubscriptionId: sub.id,
    status: sub.status,
    currentPeriodEnd: periodEndISO(sub),
    stripeAccountId: accountId,
    cancelAtPeriodEnd,
  });
  return userId;
}

/** Relit un abonnement chez Stripe et le recopie (période dépassée, retour de paiement…). */
export async function refreshPatientSubscription(stripeSubscriptionId: string, accountId: string | null): Promise<void> {
  try {
    const sub = await getStripe().subscriptions.retrieve(
      stripeSubscriptionId,
      undefined,
      accountId ? { stripeAccount: accountId } : undefined,
    );
    await syncPatientSubscription(sub, accountId);
  } catch (e) {
    console.error("[abonnement] relecture impossible :", e);
  }
}

function cardLabel(pm: Stripe.PaymentMethod | null): string | null {
  if (!pm) return null;
  if (pm.card) return `${pm.card.brand.toUpperCase()} •••• ${pm.card.last4}`;
  if (pm.sepa_debit) return `Prélèvement SEPA •••• ${pm.sepa_debit.last4}`;
  return pm.type;
}

/**
 * Copie la carte de l'abonnement d'accès (compte EasyPhysio) sur le compte
 * Stripe du kiné, pour qu'il prélève lui-même ses honoraires, et l'enregistre
 * comme moyen de paiement du programme du patient. Rejouable : renvoie true si
 * la carte est prête chez le kiné. Ne lève jamais d'erreur.
 */
export async function ensureKineCard(p: {
  patientId: string;
  instructorId: string;
  connectAccountId: string;
  platformSubscriptionId: string;
  email?: string | null;
  name?: string | null;
}): Promise<boolean> {
  const stripe = getStripe();
  try {
    const sub = await stripe.subscriptions.retrieve(p.platformSubscriptionId, { expand: ["default_payment_method"] });
    const pm = (sub.default_payment_method as Stripe.PaymentMethod | null) ?? null;
    const platformCustomer = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
    if (!pm) return false;
    const clone = await stripe.paymentMethods.create(
      { customer: platformCustomer, payment_method: pm.id },
      { stripeAccount: p.connectAccountId, idempotencyKey: `clone-${pm.id}-${p.connectAccountId}` },
    );
    const customer = await stripe.customers.create(
      {
        email: p.email ?? undefined,
        name: p.name ?? undefined,
        payment_method: clone.id,
        metadata: { patient_id: p.patientId },
      },
      { stripeAccount: p.connectAccountId, idempotencyKey: `kine-customer-${pm.id}-${p.connectAccountId}` },
    );
    await upsertFollowUp({
      patientId: p.patientId,
      instructorId: p.instructorId,
      priceCents: KINE_FOLLOW_UP_CENTS,
      status: "active",
      stripeCustomerId: customer.id,
      stripePaymentMethodId: clone.id,
      cardLabel: cardLabel(pm),
    });
    return true;
  } catch (e) {
    console.error("[abonnement] copie de la carte chez le kiné impossible :", e);
    return false;
  }
}

/**
 * Taux de TVA 20 % « inclus dans le prix » du compte EasyPhysio, créé une seule
 * fois puis retrouvé (pour que la facture d'accès affiche la TVA).
 */
export async function platformVatRateId(): Promise<string> {
  const stripe = getStripe();
  const percentage = PLATFORM_VAT_RATE * 100;
  const existing = await stripe.taxRates.list({ active: true, inclusive: true, limit: 100 });
  const found = existing.data.find((r) => r.percentage === percentage && r.metadata?.easyphysio === "tva_fr_20");
  if (found) return found.id;
  const created = await stripe.taxRates.create({
    display_name: "TVA",
    jurisdiction: "FR",
    country: "FR",
    percentage,
    inclusive: true,
    description: "TVA française 20 % (accès à la plateforme EasyPhysio)",
    metadata: { easyphysio: "tva_fr_20" },
  });
  return created.id;
}
