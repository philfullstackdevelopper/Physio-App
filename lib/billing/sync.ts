// Writes a Stripe subscription into our `subscriptions` table via a
// privileged, server-only write (see lib/db/admin.ts) — no user session
// exists at webhook time. Shared by the Stripe webhook and the
// checkout-return handler so both stay consistent.
import type Stripe from "stripe";
import { upsertSubscription } from "@/lib/db/admin";
import { getStripe } from "./stripe";
import { LEGACY_PLATFORM_FEE_PERCENT, platformFeePercentFor } from "./platformFee";
import { hasValidSubscriptionSignature, SIGNATURE_REQUIRED_FROM } from "./subscriptionSignature";

/** Stripe moved current_period_end onto items in recent API versions — read it
 *  from either place. Returns an ISO string or null. */
function periodEndISO(sub: Stripe.Subscription): string | null {
  const top = (sub as unknown as { current_period_end?: number }).current_period_end;
  const item = (sub.items?.data?.[0] as unknown as { current_period_end?: number } | undefined)
    ?.current_period_end;
  const unix = top ?? item ?? null;
  return unix ? new Date(unix * 1000).toISOString() : null;
}

// Statuts d'un abonnement encore « vivant » côté Stripe.
const LIVE_STATUSES = new Set(["active", "trialing", "past_due"]);

const customerIdOf = (sub: Stripe.Subscription) =>
  typeof sub.customer === "string" ? sub.customer : sub.customer.id;

/**
 * (Philippe, 2026-10-07) Un événement tardif d'un ANCIEN abonnement (ex.
 * `customer.subscription.deleted` d'une offre résiliée qui arrive après la
 * souscription de la nouvelle) ne doit pas écraser l'abonnement en cours :
 * la table n'a qu'une ligne par patient.
 *
 * La base n'est pas lisible ici (pas de session au moment du webhook, et
 * FORCE ROW LEVEL SECURITY sur Scalingo — aucune fonction `internal` ne lit
 * `subscriptions`), donc on demande à Stripe lui-même : si cet événement
 * n'est PAS vivant et qu'un AUTRE abonnement vivant existe pour le même
 * patient sur le même compte, on l'ignore. Deux recherches :
 *  - même client Stripe (fiable, immédiat — le client est réutilisé depuis
 *    le 2026-10-07, voir app/patient/abonnement/actions.ts) ;
 *  - par metadata.user_id (Search API, pour les anciens abonnements créés
 *    avec un client différent ; indexation différée d'environ une minute,
 *    d'où l'échec silencieux toléré).
 */
async function supersededByAnotherLiveSubscription(
  sub: Stripe.Subscription,
  userId: string,
  stripeAccount: string | null | undefined,
): Promise<boolean> {
  if (LIVE_STATUSES.has(sub.status)) return false;
  const stripe = getStripe();
  const opts = stripeAccount ? { stripeAccount } : undefined;
  const isOtherLive = (s: Stripe.Subscription) =>
    s.id !== sub.id && LIVE_STATUSES.has(s.status) && (s.metadata?.user_id ?? userId) === userId;

  try {
    const sameCustomer = await stripe.subscriptions.list(
      { customer: customerIdOf(sub), status: "all", limit: 10 },
      opts,
    );
    if (sameCustomer.data.some(isOtherLive)) return true;
  } catch (err) {
    console.error("[billing/sync] liste des abonnements du client impossible :", err);
  }

  try {
    const byUser = await stripe.subscriptions.search(
      { query: `metadata['user_id']:'${userId.replace(/'/g, "")}'`, limit: 10 },
      opts,
    );
    if (byUser.data.some(isOtherLive)) return true;
  } catch {
    /* Search API indisponible sur ce compte — on s'en tient à la liste ci-dessus. */
  }
  return false;
}

export async function syncSubscription(
  sub: Stripe.Subscription,
  fallback?: { user_id?: string | null; plan?: string | null },
  options?: { stripeAccount?: string | null },
) {
  const stripeAccount = options?.stripeAccount ?? null;

  // Abonnement sur le compte Stripe d'un kiné (audit du 2026-10-08) : il doit
  // avoir été créé par EasyPhysio — signature valide pour CE compte — et
  // porter la commission de la plateforme. Sinon c'est un abonnement fait à
  // la main dans le tableau de bord Stripe du kiné : on l'ignore, et on ne
  // se fie pas non plus aux metadata qu'il porte.
  if (stripeAccount && sub.created >= SIGNATURE_REQUIRED_FROM) {
    if (!hasValidSubscriptionSignature(sub.metadata, stripeAccount)) {
      console.warn(`[billing/sync] abonnement ${sub.id} ignoré : pas créé par EasyPhysio (signature absente ou invalide).`);
      return;
    }
    const fee = (sub as unknown as { application_fee_percent?: number | null }).application_fee_percent ?? null;
    // Commission attendue : celle du tarif de CET abonnement (règle des
    // 15 % tout compris, platformFee.ts). Les abonnements créés avant le
    // 2026-10-10 portent encore l'ancien taux unique de 16 % : acceptés.
    const unitAmount = sub.items?.data?.[0]?.price?.unit_amount ?? null;
    const expected = unitAmount != null ? platformFeePercentFor(unitAmount) : null;
    const feeOk =
      fee != null && (fee === LEGACY_PLATFORM_FEE_PERCENT || (expected != null && Math.abs(fee - expected) < 0.005));
    if (LIVE_STATUSES.has(sub.status) && !feeOk) {
      console.warn(`[billing/sync] abonnement ${sub.id} ignoré : commission ${fee ?? "absente"} au lieu de ${expected ?? "?"} %.`);
      return;
    }
  }

  const signed = !!stripeAccount && sub.created >= SIGNATURE_REQUIRED_FROM;
  const userId = sub.metadata?.user_id ?? (signed ? undefined : fallback?.user_id);
  const plan = sub.metadata?.plan ?? (signed ? undefined : fallback?.plan);
  if (!userId || !plan) return;

  if (await supersededByAnotherLiveSubscription(sub, userId, stripeAccount)) {
    console.warn(`[billing/sync] événement ignoré : ${sub.id} (${sub.status}) remplacé par un autre abonnement actif.`);
    return;
  }

  await upsertSubscription({
    userId,
    plan,
    stripeCustomerId: customerIdOf(sub),
    stripeSubscriptionId: sub.id,
    status: sub.status,
    currentPeriodEnd: periodEndISO(sub),
  });
}
