import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/billing/stripe";
import { syncSubscription } from "@/lib/billing/sync";

// Re-sync the current user's subscription from Stripe, then return to /billing.
// Used as the Customer Portal return URL so a cancel/plan-change is reflected
// locally during testing without a webhook.
export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();
    const customerId = (sub?.stripe_customer_id as string | null) ?? null;
    if (customerId) {
      try {
        const list = await stripe.subscriptions.list({
          customer: customerId,
          status: "all",
          limit: 1,
        });
        const latest = list.data[0];
        if (latest) await syncSubscription(latest, { user_id: user.id });
      } catch {
        /* ignore — still return the user to the billing page */
      }
    }
  }

  return NextResponse.redirect(new URL("/billing", url.origin));
}
