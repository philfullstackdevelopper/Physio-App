"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import { getStripe } from "@/lib/billing/stripe";

// Opens the Stripe Customer Portal so the patient can cancel, change card, or
// view invoices — the one-click cancellation Philippe asked for (2026-09-10),
// reached from /patient/compte. Requires an existing Stripe customer (created
// at the first checkout on /patient/abonnement).
//
// startCheckout (the old €10/month patient plan) used to live here too; it
// was retired with app/billing/page.tsx — see app/patient/abonnement/actions.ts.
export async function openBillingPortal() {
  const supabase = await createClient();
  const user = await requireUser(supabase);

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();
  const customerId = (sub?.stripe_customer_id as string | null) ?? null;
  if (!customerId) redirect("/patient/compte");

  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https";
  const base = `${proto}://${host}`;

  const portal = await getStripe().billingPortal.sessions.create({
    customer: customerId,
    // Returns through a route that re-syncs status, so a cancel/change is
    // reflected locally without needing a webhook during local testing.
    return_url: `${base}/billing/refresh`,
  });
  redirect(portal.url);
}
