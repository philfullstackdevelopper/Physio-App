"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/billing/stripe";
import { PLANS, isPlanKey } from "@/lib/billing/plans";

// Starts a Stripe Checkout (hosted page) for the given plan and redirects there.
// Called from a <form action={startCheckout}> with a hidden `plan` field.
export async function startCheckout(formData: FormData) {
  const planKey = formData.get("plan");
  if (!isPlanKey(planKey)) throw new Error("Offre inconnue.");
  const plan = PLANS[planKey];

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https";
  const base = `${proto}://${host}`;
  const cancelPath = plan.audience === "patient" ? "/patient" : "/dashboard";

  const session = await getStripe().checkout.sessions.create({
    mode: "subscription",
    customer_email: user.email ?? undefined,
    client_reference_id: user.id,
    metadata: { user_id: user.id, plan: plan.key },
    subscription_data: { metadata: { user_id: user.id, plan: plan.key } },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: plan.currency,
          product_data: { name: plan.label },
          unit_amount: plan.amount,
          recurring: { interval: "month" },
        },
      },
    ],
    // Stripe replaces {CHECKOUT_SESSION_ID}; the return handler syncs the sub.
    success_url: `${base}/billing/return?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}${cancelPath}?checkout=cancel`,
  });

  if (!session.url) throw new Error("Impossible de créer la session de paiement.");
  redirect(session.url);
}

// Opens the Stripe Customer Portal so the user can cancel, change card, or view
// invoices. Requires an existing Stripe customer (created at first checkout).
export async function openBillingPortal() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();
  const customerId = (sub?.stripe_customer_id as string | null) ?? null;
  if (!customerId) redirect("/billing");

  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https";
  const base = `${proto}://${host}`;

  const portal = await getStripe().billingPortal.sessions.create({
    customer: customerId,
    // Return through a route that re-syncs status (so a cancel/change reflects
    // locally without needing a webhook during local testing).
    return_url: `${base}/billing/refresh`,
  });
  redirect(portal.url);
}
