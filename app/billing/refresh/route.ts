import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import { getStripe } from "@/lib/billing/stripe";
import { syncSubscription } from "@/lib/billing/sync";

// Return URL of the Stripe Customer Portal (see openBillingPortal): re-sync the
// patient's subscription from Stripe so a cancel/plan change shows up locally
// right away, without waiting for a webhook, then back to their settings.
//
// Used to read the session through supabase.auth.getUser(), which has been
// dead since the move to Clerk (CLAUDE.md §8) — `user` was always null, so
// nothing was ever re-synced. requireUser() is the Clerk-backed replacement.
export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const supabase = await createClient();
  const user = await requireUser(supabase);

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();
  const customerId = (sub?.stripe_customer_id as string | null) ?? null;
  if (customerId) {
    try {
      const list = await getStripe().subscriptions.list({ customer: customerId, status: "all", limit: 1 });
      const latest = list.data[0];
      if (latest) await syncSubscription(latest, { user_id: user.id });
    } catch {
      /* ignore — still return the user to their settings */
    }
  }

  return NextResponse.redirect(new URL("/patient/compte?refreshed=1", url.origin));
}
