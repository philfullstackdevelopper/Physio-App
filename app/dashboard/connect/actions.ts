"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/supabase/require-user";
import { getStripe } from "@/lib/billing/stripe";

// Sets the kiné's own declared monthly patient price. This is what a patient
// pays HIM directly (Flow A) and what Physio-App's 15% platform fee (Flow B)
// is calculated from — see lib/billing/platformFee.ts.
export async function setPatientPrice(formData: FormData) {
  const supabase = await createClient();
  const user = await requireUser(supabase);

  const euros = Number(formData.get("price_euros"));
  if (!Number.isFinite(euros) || euros <= 0) {
    redirect(
      `/dashboard/facturation?error=${encodeURIComponent("Merci d'indiquer un tarif valide.")}`,
    );
  }

  const { error } = await supabase
    .from("instructors")
    .update({ monthly_patient_price_cents: Math.round(euros * 100) })
    .eq("id", user.id);
  if (error) {
    redirect(`/dashboard/facturation?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/dashboard/facturation?saved=1");
}

// Starts (or resumes) Stripe Connect onboarding for the kiné — this is the
// account that will receive his patients' payments directly (Flow A).
// Physio-App's own Stripe account never touches that money.
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
