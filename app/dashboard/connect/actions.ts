"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/supabase/require-user";
import { getStripe } from "@/lib/billing/stripe";
import { TIERS, TIER_KEYS, type TierKey } from "@/lib/billing/plans";

// Sets the kiné's own price for each of the three patient offers (Philippe,
// 2026-09-10: the amounts in lib/billing/plans.ts are the default base, each
// kiné may change them). This is what a patient pays HIM directly via Stripe
// Connect — see app/patient/abonnement/actions.ts.
//
// monthly_patient_price_cents is kept in step with the Standard price as a
// bridge: lib/billing/platformFee.ts (the 16 % estimate) and
// lib/billing/context.ts (the kiné's "pro" level) still read that single
// column. The real 16 % per actual tier is charged automatically by Stripe
// on every invoice (app/patient/abonnement/actions.ts,
// subscription_data.application_fee_percent) — no separate collection step.
export async function setTierPrices(formData: FormData) {
  const supabase = await createClient();
  const user = await requireUser(supabase);

  const fail = (msg: string): never => redirect(`/dashboard/facturation?error=${encodeURIComponent(msg)}`);

  const cents = {} as Record<TierKey, number>;
  for (const key of TIER_KEYS) {
    const euros = Number(formData.get(`${key}_euros`));
    if (!Number.isFinite(euros) || euros <= 0) fail(`Merci d'indiquer un tarif valide pour l'offre ${TIERS[key].label}.`);
    cents[key] = Math.round(euros * 100);
  }
  if (!(cents.essentiel < cents.standard && cents.standard < cents.premium)) {
    fail("Les tarifs doivent être croissants : Essentiel < Standard < Premium.");
  }

  const { error } = await supabase
    .from("instructors")
    .update({
      tier_essentiel_cents: cents.essentiel,
      tier_standard_cents: cents.standard,
      tier_premium_cents: cents.premium,
      monthly_patient_price_cents: cents.standard,
    })
    .eq("id", user.id);
  if (error) fail(error.message);

  redirect("/dashboard/facturation?saved=1");
}

// Starts (or resumes) Stripe Connect onboarding for the kiné — this is the
// account that will receive his patients' payments directly (Flow A).
// EasyPhysio's own Stripe account never touches that money.
//
// NOT YET TESTABLE end-to-end: needs Stripe Connect turned on in the Stripe
// dashboard first (see the project's plan doc). The code itself is ready.
export async function startConnectOnboarding() {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  const admin = createAdminClient();
  const stripe = getStripe();

  const { data: existing } = await supabase
    .from("instructor_connect_accounts")
    .select("stripe_connect_account_id")
    .eq("instructor_id", user.id)
    .maybeSingle();

  let accountId = existing?.stripe_connect_account_id as string | null;
  if (!accountId) {
    // Compte Standard classique. Stripe n'autorise PAS fees.payer:
    // "application" (EasyPhysio absorbant les frais Stripe) sur un compte
    // avec stripe_dashboard.type "full" (= Standard) — combinaison rejetée
    // par l'API (essayé le 2026-09-10, erreur "type and controller
    // mutually exclusive", puis confirmé incompatible même en listant les
    // deux séparément). Le kiné paie donc le frais Stripe sur sa part, comme
    // pour tout compte Standard — un seul montant net par paiement, pas de
    // ligne de frais séparée visible pour lui.
    const account = await stripe.accounts.create({ type: "standard", email: user.email });
    accountId = account.id;
    await admin.from("instructor_connect_accounts").upsert(
      {
        instructor_id: user.id,
        stripe_connect_account_id: accountId,
        status: "onboarding",
      },
      { onConflict: "instructor_id" },
    );
  }

  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${base}/dashboard/connect/refresh`,
    return_url: `${base}/dashboard/connect/return`,
    type: "account_onboarding",
  });
  redirect(link.url);
}
