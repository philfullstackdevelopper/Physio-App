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
// `intent="cancel"` (the dedicated "Annuler mon abonnement" button,
// 2026-09-11) deep-links straight into the portal's cancellation screen
// instead of its generic landing page — "gérer" and "annuler" are two
// different buttons in the UI precisely so only the cancel one skips ahead.
//
// startCheckout (the old €10/month patient plan) used to live here too; it
// was retired with app/billing/page.tsx — see app/patient/abonnement/actions.ts.
export async function openBillingPortal(formData?: FormData) {
  const intent = formData?.get("intent") === "cancel" ? "cancel" : "manage";
  const supabase = await createClient();
  const user = await requireUser(supabase);

  const [{ data: sub }, { data: patient }] = await Promise.all([
    supabase.from("subscriptions").select("stripe_customer_id, stripe_subscription_id").eq("user_id", user.id).maybeSingle(),
    supabase.from("patients").select("instructor_id").eq("id", user.id).maybeSingle(),
  ]);
  const customerId = (sub?.stripe_customer_id as string | null) ?? null;
  if (!customerId) redirect("/patient/compte");
  const subscriptionId = (sub?.stripe_subscription_id as string | null) ?? null;

  // The patient's Stripe customer lives on the KINÉ's own Connect account
  // (Direct charge — app/patient/abonnement/actions.ts), never on the
  // platform account. Same bug class as the webhook fix (2026-09-11): every
  // call here without `stripeAccount` failed with "No such customer" — this
  // is what silently broke the "annuler mon abonnement" button.
  const instructorId = (patient?.instructor_id as string | null) ?? null;
  const { data: connect } = instructorId
    ? await supabase
        .from("instructor_connect_accounts")
        .select("stripe_connect_account_id")
        .eq("instructor_id", instructorId)
        .maybeSingle()
    : { data: null };
  const stripeAccount = (connect?.stripe_connect_account_id as string | null) ?? undefined;

  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https";
  const base = `${proto}://${host}`;

  const portal = await getStripe().billingPortal.sessions.create(
    {
      customer: customerId,
      // Returns through a route that re-syncs status, so a cancel/change is
      // reflected locally without needing a webhook during local testing.
      return_url: `${base}/billing/refresh`,
      ...(intent === "cancel" && subscriptionId
        ? { flow_data: { type: "subscription_cancel" as const, subscription_cancel: { subscription: subscriptionId } } }
        : {}),
    },
    stripeAccount ? { stripeAccount } : undefined,
  );
  redirect(portal.url);
}
