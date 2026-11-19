import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import { getStripe } from "@/lib/billing/stripe";
import { isMissingStripeObject } from "@/lib/billing/connectStatus";
import { requestOrigin } from "@/lib/requestOrigin";

// Stripe's Account Links expire quickly. If the kiné comes back after that,
// this re-issues a fresh link for the SAME account instead of creating a
// second one.
// Adresse publique (requestOrigin), jamais request.url : derrière le proxy de
// Scalingo, request.url vaut https://localhost:<port> et renvoyait le kiné
// vers une page inaccessible (constaté le 2026-11-19).
export async function GET() {
  const supabase = await createClient();
  const user = await requireUser(supabase);

  const { data: row } = await supabase
    .from("instructor_connect_accounts")
    .select("stripe_connect_account_id")
    .eq("instructor_id", user.id)
    .maybeSingle();
  const accountId = row?.stripe_connect_account_id as string | null;

  if (!accountId) {
    return NextResponse.redirect(`${await requestOrigin()}/dashboard/facturation`);
  }

  const base = await requestOrigin();
  try {
    const link = await getStripe().accountLinks.create({
      account: accountId,
      refresh_url: `${base}/dashboard/connect/refresh`,
      return_url: `${base}/dashboard/connect/return`,
      type: "account_onboarding",
    });
    return NextResponse.redirect(link.url);
  } catch (err) {
    // Compte du mode test, inconnu en mode réel : retour à la facturation,
    // où « Activer Stripe » en crée un neuf.
    if (isMissingStripeObject(err)) return NextResponse.redirect(`${await requestOrigin()}/dashboard/facturation`);
    throw err;
  }
}
