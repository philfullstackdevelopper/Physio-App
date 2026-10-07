import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import { refreshConnectStatus } from "@/lib/billing/connectStatus";

// The kiné lands here after finishing (or leaving) Stripe's own Connect
// onboarding flow. Checks the account's real status with Stripe directly —
// don't just trust that arriving here means onboarding succeeded.
export async function GET(request: Request) {
  const supabase = await createClient();
  const user = await requireUser(supabase);

  const { data: row } = await supabase
    .from("instructor_connect_accounts")
    .select("stripe_connect_account_id")
    .eq("instructor_id", user.id)
    .maybeSingle();
  const accountId = row?.stripe_connect_account_id as string | null;

  const target = new URL("/dashboard/facturation", request.url);
  if (accountId) {
    // (Philippe, 2026-10-07) Stripe indisponible ou compte introuvable : un
    // message lisible sur la page Facturation plutôt qu'une erreur 500 brute.
    try {
      await refreshConnectStatus(user.id, accountId);
    } catch (err) {
      console.error("[connect/return] vérification du compte Stripe impossible :", err);
      target.searchParams.set(
        "error",
        "Impossible de vérifier votre compte Stripe pour le moment. Rechargez cette page dans quelques minutes.",
      );
    }
  }

  return NextResponse.redirect(target);
}
