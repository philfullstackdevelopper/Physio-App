"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { upsertConnectAccount } from "@/lib/db/admin";
import { requireApprovedInstructor } from "@/lib/dashboard/requireApprovedInstructor";
import { getStripe } from "@/lib/billing/stripe";
import { requestOrigin } from "@/lib/requestOrigin";

// Starts (or resumes) Stripe Connect onboarding for the kiné — this is the
// account that will receive his patients' payments directly (Flow A).
// EasyPhysio's own Stripe account never touches that money.
//
// NOT YET TESTABLE end-to-end: needs Stripe Connect turned on in the Stripe
// dashboard first (see the project's plan doc). The code itself is ready.
export async function startConnectOnboarding() {
  const supabase = await createClient();
  // Kiné validé uniquement (audit du 2026-10-08) : un compte en attente,
  // refusé ou suspendu — ou un patient — ne crée pas de compte Stripe.
  const { user } = await requireApprovedInstructor(supabase);
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
    // Clé d'idempotence : un double clic ne crée pas deux comptes Stripe.
    const account = await stripe.accounts.create(
      { type: "standard", email: user.email },
      { idempotencyKey: `connect-account-${user.id}` },
    );
    accountId = account.id;
    await upsertConnectAccount({ instructorId: user.id, stripeConnectAccountId: accountId, status: "onboarding" });
  }

  const base = await requestOrigin();
  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${base}/dashboard/connect/refresh`,
    return_url: `${base}/dashboard/connect/return`,
    type: "account_onboarding",
  });
  redirect(link.url);
}
