// =============================================================================
// Abonnement patient — côté serveur (modèle définitif, Philippe 2026-11-04 ;
// montants et règles : lib/billing/patientPlans.ts).
//
// - L'ACCÈS À LA PLATEFORME (6,99 / 3,99 / 2,99 € par mois selon l'engagement) est un abonnement Stripe sur le
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
import { followUpForCharge, upsertFollowUp, upsertSubscription } from "@/lib/db/admin";
import { hasValidSubscriptionSignature } from "./subscriptionSignature";
import { EARLY_ACCESS_PLAN_KEY, KINE_FOLLOW_UP_CENTS, PLATFORM_VAT_RATE, isPlatformOfferKey } from "./patientPlans";
import { sign, verify } from "./signing";

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
  // Compte EasyPhysio : une des trois offres d'accès (ou l'accès à 3,99 € du
  // 2026-11-04). Compte du kiné : formule de l'ancien modèle.
  if (accountId === null ? !isPlatformOfferKey(plan) && plan !== EARLY_ACCESS_PLAN_KEY : !isPlatformOfferKey(plan)) return null;

  // Résiliation en fin de mois (cancel_at_period_end) ou à la fin d'un engagement (cancel_at).
  let cancelAtPeriodEnd = !!sub.cancel_at_period_end || !!sub.cancel_at;
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

  // La base ignore un message en retard sur un ANCIEN abonnement quand un plus
  // récent est vivant (migration 0086) — ex. la fin d'un abonnement refusé,
  // annoncée après la souscription de son remplaçant.
  const applied = await upsertSubscription({
    userId,
    plan,
    stripeCustomerId: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
    stripeSubscriptionId: sub.id,
    status: sub.status,
    currentPeriodEnd: periodEndISO(sub),
    stripeAccountId: accountId,
    cancelAtPeriodEnd,
    stripeCreated: sub.created ? new Date(sub.created * 1000).toISOString() : null,
  });
  if (!applied) console.warn(`[abonnement] ${sub.id} (${sub.status}) ignoré : un abonnement plus récent est en cours.`);
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

/**
 * Webhook customer.subscription.* : les événements peuvent arriver dans le
 * désordre, on recopie donc l'état ACTUEL de l'abonnement chez Stripe plutôt
 * que la photo contenue dans l'événement (qui ne sert qu'en secours).
 */
export async function syncPatientSubscriptionFromEvent(sub: Stripe.Subscription, accountId: string | null): Promise<void> {
  let fresh = sub;
  try {
    fresh = await getStripe().subscriptions.retrieve(sub.id, undefined, accountId ? { stripeAccount: accountId } : undefined);
  } catch (e) {
    console.warn(`[abonnement] ${sub.id} : relecture impossible, on garde l'événement`, e);
  }
  await syncPatientSubscription(fresh, accountId);
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
    // La carte ACTUELLE (audit du 2026-11-08) : celle de l'abonnement, sinon
    // celle par défaut du client — après un changement de carte, c'est la
    // nouvelle qui est copiée, jamais une ancienne.
    const sub = await stripe.subscriptions.retrieve(p.platformSubscriptionId, {
      expand: ["default_payment_method", "customer.invoice_settings.default_payment_method"],
    });
    const customerObj = typeof sub.customer === "string" ? null : sub.customer;
    const customerDefault =
      customerObj && !("deleted" in customerObj && customerObj.deleted)
        ? ((customerObj as Stripe.Customer).invoice_settings?.default_payment_method as Stripe.PaymentMethod | string | null)
        : null;
    const pm =
      (sub.default_payment_method as Stripe.PaymentMethod | null) ??
      (customerDefault && typeof customerDefault !== "string" ? customerDefault : null);
    const platformCustomer = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
    // Cartes seulement : un mandat SEPA ne peut pas être copié chez le kiné.
    if (!pm || pm.type !== "card") return false;
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
 * Le patient a changé de carte : la copie chez son kiné est périmée. On
 * repasse son suivi en « carte à copier » ; le prochain prélèvement du kiné
 * (lib/billing/autoReview.ts) recopie alors la NOUVELLE carte. Ne lève jamais.
 */
export async function markKineCardStale(patientId: string): Promise<void> {
  try {
    const f = await followUpForCharge(patientId);
    if (!f || f.status !== "active") return;
    await upsertFollowUp({
      patientId,
      instructorId: f.instructor_id,
      priceCents: f.price_cents,
      status: "pending_card",
      stripeCustomerId: null,
      stripePaymentMethodId: null,
      cardLabel: null,
    });
  } catch (e) {
    console.error("[abonnement] carte du kiné non marquée à recopier :", e);
  }
}

// ---- Changement de carte par le patient --------------------------------------
// Checkout en mode « setup », CARTE seulement, sur le compte d'EasyPhysio. Une
// fois la carte enregistrée, elle devient la carte de l'abonnement d'accès et
// du client, et la copie chez le kiné est refaite au prochain prélèvement.

const cardChangePayload = (userId: string, subscriptionId: string) => `card_change:${userId}:${subscriptionId}`;

export function cardChangeMetadata(userId: string, subscriptionId: string): Record<string, string> {
  return {
    kind: "patient_card",
    user_id: userId,
    subscription_id: subscriptionId,
    card_sig: sign(cardChangePayload(userId, subscriptionId)),
  };
}

/**
 * Après le Checkout « changement de carte » (retour du patient ou webhook
 * plateforme). Rejouable. Renvoie l'id du patient, ou null si la session
 * n'est pas une des nôtres / pas terminée.
 */
export async function finalizePatientCardChange(sessionId: string): Promise<string | null> {
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ["setup_intent", "setup_intent.payment_method"] });
  const meta = session.metadata;
  if (session.mode !== "setup" || session.status !== "complete" || meta?.kind !== "patient_card") return null;
  const userId = meta.user_id;
  const subscriptionId = meta.subscription_id;
  if (!userId || !subscriptionId || !verify(cardChangePayload(userId, subscriptionId), meta.card_sig)) return null;
  const setupIntent = session.setup_intent as Stripe.SetupIntent | null;
  const pm = (setupIntent?.payment_method as Stripe.PaymentMethod | null) ?? null;
  const customerId = typeof session.customer === "string" ? session.customer : (session.customer?.id ?? null);
  if (!pm || pm.type !== "card" || !customerId || setupIntent?.status !== "succeeded") return null;

  await stripe.customers.update(customerId, { invoice_settings: { default_payment_method: pm.id } });
  await stripe.subscriptions.update(subscriptionId, { default_payment_method: pm.id });
  await markKineCardStale(userId);
  return userId;
}

/** Webhook plateforme `checkout.session.completed` en mode setup : changement de carte d'un patient ? */
export function isPatientCardSession(session: Stripe.Checkout.Session): boolean {
  return session.mode === "setup" && session.metadata?.kind === "patient_card";
}

/**
 * Portail client Stripe du patient : factures d'EasyPhysio seulement. Le
 * changement de carte passe par notre propre page (carte seulement, recopie
 * chez le kiné) et la résiliation par « Mon suivi » (règles d'engagement) :
 * les deux sont donc fermés dans le portail. Configuration créée une fois
 * puis retrouvée par sa metadata.
 */
export async function patientPortalConfigurationId(): Promise<string> {
  const stripe = getStripe();
  const existing = await stripe.billingPortal.configurations.list({ active: true, limit: 100 });
  const found = existing.data.find((c) => c.metadata?.easyphysio === "patient_invoices");
  if (found) return found.id;
  const created = await stripe.billingPortal.configurations.create({
    name: "EasyPhysio — factures patient",
    features: {
      invoice_history: { enabled: true },
      payment_method_update: { enabled: false },
      customer_update: { enabled: false },
      subscription_cancel: { enabled: false },
      subscription_update: { enabled: false },
    },
    metadata: { easyphysio: "patient_invoices" },
  });
  return created.id;
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
