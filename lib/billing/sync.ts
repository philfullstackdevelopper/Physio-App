// Writes a Stripe subscription into our `subscriptions` table via a
// privileged, server-only write (see lib/db/admin.ts) — no user session
// exists at webhook time. Shared by the Stripe webhook and the
// checkout-return handler so both stay consistent.
import type Stripe from "stripe";
import { upsertSubscription } from "@/lib/db/admin";
import { getStripe } from "./stripe";

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
  const userId = sub.metadata?.user_id ?? fallback?.user_id;
  const plan = sub.metadata?.plan ?? fallback?.plan;
  if (!userId || !plan) return;

  if (await supersededByAnotherLiveSubscription(sub, userId, options?.stripeAccount)) {
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
