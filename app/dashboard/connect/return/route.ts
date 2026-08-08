import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/supabase/require-user";
import { getStripe } from "@/lib/billing/stripe";

// The kiné lands here after finishing (or leaving) Stripe's own Connect
// onboarding flow. Checks the account's real status with Stripe directly —
// don't just trust that arriving here means onboarding succeeded.
export async function GET(request: Request) {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  const admin = createAdminClient();

  const { data: row } = await supabase
    .from("instructor_connect_accounts")
    .select("stripe_connect_account_id")
    .eq("instructor_id", user.id)
    .maybeSingle();
  const accountId = row?.stripe_connect_account_id as string | null;

  if (accountId) {
    const account = await getStripe().accounts.retrieve(accountId);
    const status = account.details_submitted && account.charges_enabled ? "active" : "onboarding";
    await admin
      .from("instructor_connect_accounts")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("instructor_id", user.id);
  }

  return NextResponse.redirect(new URL("/dashboard/facturation", request.url));
}
