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

  const [{ data: sub }, { data: patient }] = await Promise.all([
    supabase.from("subscriptions").select("stripe_customer_id").eq("user_id", user.id).maybeSingle(),
    supabase.from("patients").select("instructor_id").eq("id", user.id).maybeSingle(),
  ]);
  const customerId = (sub?.stripe_customer_id as string | null) ?? null;

  // (Philippe, 2026-10-07) Le client Stripe du patient vit sur le compte
  // Connect de SON kiné (Direct charge) : sans `stripeAccount`, la liste
  // échouait toujours (« No such customer »), erreur avalée — rien n'était
  // jamais resynchronisé. Même résolution que app/billing/actions.ts.
  const instructorId = (patient?.instructor_id as string | null) ?? null;
  const { data: connect } = instructorId
    ? await supabase
        .from("instructor_connect_accounts")
        .select("stripe_connect_account_id")
        .eq("instructor_id", instructorId)
        .maybeSingle()
    : { data: null };
  const stripeAccount = (connect?.stripe_connect_account_id as string | null) ?? null;

  if (customerId) {
    try {
      const list = await getStripe().subscriptions.list(
        { customer: customerId, status: "all", limit: 1 },
        stripeAccount ? { stripeAccount } : undefined,
      );
      const latest = list.data[0];
      if (latest) await syncSubscription(latest, { user_id: user.id }, { stripeAccount });
    } catch (err) {
      // Still return the user to their settings — but never silently.
      console.error("[billing/refresh] resynchronisation impossible :", err);
    }
  }

  return NextResponse.redirect(new URL("/patient/compte?refreshed=1", url.origin));
}
