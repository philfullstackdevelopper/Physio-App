"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { upsertConnectAccount } from "@/lib/db/admin";
import { requireApprovedInstructor } from "@/lib/dashboard/requireApprovedInstructor";
import { getStripe } from "@/lib/billing/stripe";
import { isMissingStripeObject } from "@/lib/billing/connectStatus";
import { requestOrigin } from "@/lib/requestOrigin";
import { getTranslations } from "next-intl/server";
import { instructorCountry } from "@/lib/billing/countries";
import { pricingForCountry } from "@/lib/billing/patientPlans";

// Starts (or resumes) Stripe Connect onboarding for the kiné — this is the
// account that receives his 6 € monthly fees from his patients directly
// (lib/billing/patientPlans.ts). EasyPhysio's own Stripe account never
// touches that money. Live since the switch to Stripe live mode (2026-11-02).
//
// Reconnecting: if the stored account is unknown in this mode, or the kiné
// disconnected it from EasyPhysio (account.application.deauthorized), Stripe
// refuses to read it and a fresh Standard account is created below.
export async function startConnectOnboarding() {
  const supabase = await createClient();
  // Kiné validé uniquement (audit du 2026-10-08) : un compte en attente,
  // refusé ou suspendu — ou un patient — ne crée pas de compte Stripe.
  const { user } = await requireApprovedInstructor(supabase);
  const stripe = getStripe();

  // Pays du compte Stripe = pays d'exercice du kiné (migration 0101 ; vide =
  // France). Un pays fermé (lib/billing/countries.ts) ne crée aucun compte :
  // ses patients ne pourraient pas être facturés.
  const { data: kineRow } = await supabase.from("instructors").select("country").eq("id", user.id).maybeSingle();
  const country = instructorCountry((kineRow?.country as string | null) ?? null);
  if (!pricingForCountry(country)) {
    const t = await getTranslations("dashboard.patientActions");
    redirect(`/dashboard/facturation?error=${encodeURIComponent(t("connectCountryClosed"))}`);
  }

  // Lecture vérifiée (audit du 2026-11-10, A6) : en cas d'échec on s'arrête,
  // au lieu de conclure « pas encore de compte » et d'en créer un second.
  const { data: existing, error: existingError } = await supabase
    .from("instructor_connect_accounts")
    .select("stripe_connect_account_id")
    .eq("instructor_id", user.id)
    .maybeSingle();
  if (existingError) {
    console.error("startConnectOnboarding: lecture du compte Stripe Connect impossible", existingError);
    const t = await getTranslations("dashboard.patientActions");
    redirect(`/dashboard/facturation?error=${encodeURIComponent(t("connectCheckFailed"))}`);
  }

  let accountId = existing?.stripe_connect_account_id as string | null;
  // Compte créé en mode test, inconnu en mode réel : on en crée un neuf.
  const staleId = accountId;
  if (accountId) {
    try {
      await stripe.accounts.retrieve(accountId);
    } catch (err) {
      if (!isMissingStripeObject(err)) throw err;
      accountId = null;
    }
  }
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
    // Elle change toutes les 10 minutes (2026-11-19) : Stripe garde une clé
    // 24 h, y compris quand la demande a échoué ; une clé fixe bloquait donc
    // toute nouvelle tentative pendant 24 h (« Keys for idempotent requests
    // can only be used with the same parameters »).
    const window = Math.floor(Date.now() / 600_000);
    const key = staleId ? `connect-account-${user.id}-replaces-${staleId}-${window}` : `connect-account-${user.id}-${window}`;
    try {
      const account = await stripe.accounts.create({ type: "standard", email: user.email, country }, { idempotencyKey: key });
      accountId = account.id;
    } catch (err) {
      // Refus de Stripe (profil de plateforme, paramètres…) : un message
      // clair plutôt que la page « Une erreur est survenue ».
      console.error("startConnectOnboarding: création du compte Stripe refusée", err);
      const t = await getTranslations("dashboard.patientActions");
      redirect(`/dashboard/facturation?error=${encodeURIComponent(t("connectStartFailed"))}`);
    }
    await upsertConnectAccount({ instructorId: user.id, stripeConnectAccountId: accountId, status: "onboarding" });
  }

  const base = await requestOrigin();
  let linkUrl: string;
  try {
    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${base}/dashboard/connect/refresh`,
      return_url: `${base}/dashboard/connect/return`,
      type: "account_onboarding",
    });
    linkUrl = link.url;
  } catch (err) {
    console.error("startConnectOnboarding: lien d'inscription Stripe refusé", err);
    const t = await getTranslations("dashboard.patientActions");
    redirect(`/dashboard/facturation?error=${encodeURIComponent(t("connectStartFailed"))}`);
  }
  redirect(linkUrl);
}
