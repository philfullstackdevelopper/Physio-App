import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import { getStripe } from "@/lib/billing/stripe";

// Stripe's Account Links expire quickly. If the kiné comes back after that,
// this re-issues a fresh link for the SAME account instead of creating a
// second one.
export async function GET(request: Request) {
  const supabase = await createClient();
  const user = await requireUser(supabase);

  const { data: row } = await supabase
    .from("instructor_connect_accounts")
    .select("stripe_connect_account_id")
    .eq("instructor_id", user.id)
    .maybeSingle();
  const accountId = row?.stripe_connect_account_id as string | null;

  if (!accountId) {
    return NextResponse.redirect(new URL("/dashboard/facturation", request.url));
  }

  const base = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin;
  const link = await getStripe().accountLinks.create({
    account: accountId,
    refresh_url: `${base}/dashboard/connect/refresh`,
    return_url: `${base}/dashboard/connect/return`,
    type: "account_onboarding",
  });
  return NextResponse.redirect(link.url);
}
