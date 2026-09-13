// Writes a Stripe subscription into our `subscriptions` table via a
// privileged, server-only write (see lib/db/admin.ts) — no user session
// exists at webhook time. Shared by the Stripe webhook and the
// checkout-return handler so both stay consistent.
import type Stripe from "stripe";
import { upsertSubscription } from "@/lib/db/admin";

/** Stripe moved current_period_end onto items in recent API versions — read it
 *  from either place. Returns an ISO string or null. */
function periodEndISO(sub: Stripe.Subscription): string | null {
  const top = (sub as unknown as { current_period_end?: number }).current_period_end;
  const item = (sub.items?.data?.[0] as unknown as { current_period_end?: number } | undefined)
    ?.current_period_end;
  const unix = top ?? item ?? null;
  return unix ? new Date(unix * 1000).toISOString() : null;
}

export async function syncSubscription(
  sub: Stripe.Subscription,
  fallback?: { user_id?: string | null; plan?: string | null },
) {
  const userId = sub.metadata?.user_id ?? fallback?.user_id;
  const plan = sub.metadata?.plan ?? fallback?.plan;
  if (!userId || !plan) return;

  await upsertSubscription({
    userId,
    plan,
    stripeCustomerId: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
    stripeSubscriptionId: sub.id,
    status: sub.status,
    currentPeriodEnd: periodEndISO(sub),
  });
}
