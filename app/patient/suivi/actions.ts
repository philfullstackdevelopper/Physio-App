"use server";

import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import { getStripe } from "@/lib/billing/stripe";
import { requestOrigin } from "@/lib/requestOrigin";
import {
  KINE_FOLLOW_UP_CENTS,
  TRIAL_DAYS,
  commitmentEnd,
  commitmentEndOfSubscription,
  eurosFR,
  isPlatformOfferKey,
  isPlatformSubscription,
  platformOffer,
  subscriptionGivesAccess,
  type SubscriptionRow,
} from "@/lib/billing/patientPlans";
import { signedSubscriptionMetadata } from "@/lib/billing/subscriptionSignature";
import {
  PLATFORM_SIGNATURE_ACCOUNT,
  cardChangeMetadata,
  patientPortalConfigurationId,
  platformVatRateId,
  refreshPatientSubscription,
} from "@/lib/billing/patientSubscription";
import { followUpForCharge } from "@/lib/db/admin";
import { createReviewPaymentCheckout } from "@/lib/billing/followUp";
import { reviewPayableByPatient } from "@/lib/billing/reviewPayment";
import { reviewChargeDescription } from "@/lib/billing/autoReview";
import { periodLabel } from "@/lib/billing/reviewModel";

// Modèle définitif (Philippe, 2026-11-04 ; lib/billing/patientPlans.ts) : le
// patient choisit une offre d'accès à la plateforme (sans engagement, 3 mois
// ou 6 mois), payée chaque mois à EasyPhysio, sur le compte d'EasyPhysio
// (10 jours d'essai la première fois). Sa carte y est enregistrée, puis copiée
// chez son kiné, qui prélève lui-même ses 6 € les mois où il met à jour le
// programme (lib/billing/autoReview.ts). L'engagement ne porte que sur
// l'accès : une résiliation pendant l'engagement prend effet à sa fin.

const fail = (msg: string): never => redirect(`/patient/suivi?error=${encodeURIComponent(msg)}`);
// Messages d'erreur dans la langue du patient (cookie de langue).
const tr = () => getTranslations("billing.suiviActions");

/** Le patient connecté, l'état des paiements de son kiné et son abonnement actuel. */
async function context() {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  const { data: patient } = await supabase.from("patients").select("id, instructor_id, full_name").eq("id", user.id).maybeSingle();
  if (!patient) fail((await tr())("patientNotFound"));
  const instructorId = patient!.instructor_id as string;
  const [{ data: kine }, { data: connect }, { data: sub }] = await Promise.all([
    supabase.from("instructors").select("status, full_name").eq("id", instructorId).maybeSingle(),
    supabase.from("instructor_connect_accounts").select("stripe_connect_account_id, status").eq("instructor_id", instructorId).maybeSingle(),
    supabase
      .from("subscriptions")
      .select("plan, status, current_period_end, cancel_at_period_end, stripe_subscription_id, stripe_customer_id, stripe_account_id")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);
  const accountId = connect?.status === "active" ? ((connect.stripe_connect_account_id as string | null) ?? null) : null;
  return { user, patient: patient!, kine, accountId, sub };
}

export async function startPlan(formData: FormData) {
  const t = await tr();
  const key = formData.get("plan");
  if (!isPlatformOfferKey(key)) fail(t("chooseOffer"));
  if (formData.get("consent") !== "on") fail(t("consentRequired"));
  // L'accès est vendu par EasyPhysio : pas besoin que le kiné ait activé
  // Stripe. Sa part (6 €) démarre quand ses paiements sont actifs.
  const { user, patient, kine, sub } = await context();
  if (((kine?.status as string | null) ?? "approved") !== "approved") fail(t("kineUnavailable"));

  // Un seul abonnement à la fois (audit du 2026-11-08) : un abonnement en
  // essai ou actif — même résilié pour la fin de période — n'en ouvre pas un
  // deuxième (le patient annule plutôt sa résiliation).
  if (subscriptionGivesAccess((sub as unknown as SubscriptionRow | null) ?? null)) fail(t("alreadySubscribed"));

  const offer = platformOffer(key as Parameters<typeof platformOffer>[0]);
  const stripe = getStripe();
  let url: string | null = null;
  try {
    // Abonnement d'accès en échec de paiement : on l'arrête avant d'en créer
    // un nouveau (un seul abonnement par patient). Si Stripe annonce sa fin
    // APRÈS la création du nouveau, la base l'ignore (migration 0086).
    const onPlatform = isPlatformSubscription((sub as unknown as SubscriptionRow | null) ?? null);
    if (onPlatform && sub?.stripe_subscription_id && ["past_due", "unpaid", "incomplete"].includes(sub.status as string)) {
      await stripe.subscriptions.cancel(sub.stripe_subscription_id as string).catch(() => null);
    }
    // Même client Stripe chez EasyPhysio si possible.
    let customerId: string | null = onPlatform ? ((sub?.stripe_customer_id as string | null) ?? null) : null;
    if (!customerId) {
      const c = await stripe.customers.create({
        email: user.email ?? undefined,
        name: (patient.full_name as string | null) ?? undefined,
        metadata: { patient_id: user.id },
      });
      customerId = c.id;
    }
    // Essai gratuit seulement à la toute première souscription ; l'engagement
    // court à partir du premier mois payé. commit_until n'est qu'une
    // estimation : la résiliation et « Mon suivi » recalculent la fin
    // d'engagement sur l'abonnement réel (commitmentEndOfSubscription).
    const firstTime = !sub;
    const paidStart = new Date(Date.now() + (firstTime ? TRIAL_DAYS * 86_400_000 : 0));
    const commitUntil = commitmentEnd(offer, paidStart);
    const base = await requestOrigin();
    const metadata = {
      ...signedSubscriptionMetadata(user.id, offer.key, PLATFORM_SIGNATURE_ACCOUNT),
      ...(commitUntil ? { commit_until: commitUntil } : {}),
    };
    const kineName = (kine?.full_name as string | null) ?? t("kineFallback");
    // Langue de la page de paiement Stripe = celle du patient. Le nom et la
    // description du produit restent en français : ils figurent sur la
    // facture d'EasyPhysio (TVA).
    const locale = (await getLocale()) === "en" ? "en" : "fr";
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      payment_method_collection: "always",
      // Carte seulement (audit du 2026-11-08) : la carte est ensuite copiée
      // chez le kiné pour ses 6 € ; un mandat SEPA ou un moyen Link ne peut
      // pas l'être.
      payment_method_types: ["card"],
      line_items: [
        {
          quantity: 1,
          tax_rates: [await platformVatRateId()],
          price_data: {
            currency: "eur",
            unit_amount: offer.platformCents,
            tax_behavior: "inclusive",
            recurring: { interval: "month" },
            product_data: {
              name: `Accès à la plateforme EasyPhysio — ${offer.label.toLowerCase()}`,
              description: "Application, vidéos, messagerie et hébergement sécurisé de vos données de santé.",
            },
          },
        },
      ],
      subscription_data: {
        metadata,
        ...(firstTime ? { trial_period_days: TRIAL_DAYS } : {}),
      },
      custom_text: {
        submit: {
          message: t("checkoutNote", {
            kineName,
            amount: (await getTranslations("billing.format"))("eur", { amount: eurosFR(KINE_FOLLOW_UP_CENTS, locale) }),
          }),
        },
      },
      metadata,
      locale,
      success_url: `${base}/patient/suivi/retour?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/patient/suivi?checkout=annule`,
    });
    url = session.url;
  } catch (e) {
    console.error("startPlan:", e);
  }
  if (!url) fail(t("paymentUnavailable"));
  redirect(url!);
}

/** Le compte Stripe où vit l'abonnement : celui du kiné pour une formule de l'ancien modèle, sinon EasyPhysio. */
function accountOf(sub: { stripe_account_id?: unknown } | null): string | null {
  return (sub?.stripe_account_id as string | null | undefined) ?? null;
}

/**
 * Résilier. Sans engagement (ou engagement terminé) : fin du mois en cours,
 * plus aucun prélèvement ensuite. Pendant un engagement : la résiliation prend
 * effet à la fin de l'engagement (les mois restants de l'accès sont dus ; les
 * honoraires du kiné, eux, ne sont jamais dus sans mise à jour du programme).
 */
export async function cancelPlan() {
  const t = await tr();
  const { sub } = await context();
  const id = sub?.stripe_subscription_id as string | undefined;
  if (!id) fail(t("noSubscription"));
  const account = accountOf(sub);
  const stripe = getStripe();
  try {
    const opts = account ? { stripeAccount: account } : undefined;
    const live = await stripe.subscriptions.retrieve(id!, undefined, opts);
    // Fin d'engagement calculée sur l'abonnement réel (fin de l'essai ou début).
    const commitUntil = !account
      ? commitmentEndOfSubscription({
          plan: live.metadata?.plan,
          trial_end: live.trial_end,
          start_date: live.start_date,
          commit_until: live.metadata?.commit_until,
        })
      : null;
    // proration_behavior "none" : jamais de remboursement ni de facture au
    // prorata — les mois engagés restent dus, le mois en cours va à son terme.
    if (commitUntil && new Date(commitUntil) > new Date()) {
      await stripe.subscriptions.update(id!, {
        cancel_at: Math.floor(new Date(commitUntil).getTime() / 1000),
        proration_behavior: "none",
      });
    } else {
      await stripe.subscriptions.update(id!, { cancel_at_period_end: true, proration_behavior: "none" }, opts);
    }
    await refreshPatientSubscription(id!, account);
  } catch (e) {
    console.error("cancelPlan:", e);
    fail(t("cancelFailed"));
  }
  redirect("/patient/suivi?arret=1");
}

/** Annuler la résiliation : l'abonnement d'accès continue. */
export async function resumePlan() {
  const t = await tr();
  const { sub } = await context();
  const id = sub?.stripe_subscription_id as string | undefined;
  if (!id || accountOf(sub)) fail(t("nothingToResume"));
  try {
    await getStripe().subscriptions.update(id!, { cancel_at_period_end: false, cancel_at: "", proration_behavior: "none" });
    await refreshPatientSubscription(id!, null);
  } catch (e) {
    console.error("resumePlan:", e);
    fail(t("resumeFailed"));
  }
  redirect("/patient/suivi?reprise=1");
}

/** Abonnement d'accès en cours sur le compte d'EasyPhysio (carte, factures), ou fin avec un message. */
async function platformSubOrFail(t: Awaited<ReturnType<typeof tr>>) {
  const ctx = await context();
  const sub = ctx.sub;
  if (!sub?.stripe_subscription_id || !sub.stripe_customer_id || accountOf(sub) || !isPlatformSubscription(sub as unknown as SubscriptionRow)) {
    fail(t("noSubscription"));
  }
  return { ...ctx, subscriptionId: sub!.stripe_subscription_id as string, customerId: sub!.stripe_customer_id as string };
}

/**
 * Changer de carte (audit du 2026-11-08) : page Stripe d'enregistrement de
 * carte (carte seulement, aucun prélèvement). Au retour, elle devient la carte
 * de l'abonnement d'accès, et la copie chez le kiné est refaite
 * (lib/billing/patientSubscription.ts finalizePatientCardChange).
 */
export async function changeCard() {
  const t = await tr();
  const { user, subscriptionId, customerId } = await platformSubOrFail(t);
  let url: string | null = null;
  try {
    const base = await requestOrigin();
    const session = await getStripe().checkout.sessions.create({
      mode: "setup",
      customer: customerId,
      payment_method_types: ["card"],
      metadata: cardChangeMetadata(user.id, subscriptionId),
      locale: (await getLocale()) === "en" ? "en" : "fr",
      success_url: `${base}/patient/suivi/carte?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/patient/suivi`,
    });
    url = session.url;
  } catch (e) {
    console.error("changeCard:", e);
  }
  if (!url) fail(t("paymentUnavailable"));
  redirect(url!);
}

/** Mes factures EasyPhysio : portail client Stripe, en lecture (factures seulement). */
export async function openInvoices() {
  const t = await tr();
  const { customerId } = await platformSubOrFail(t);
  let url: string | null = null;
  try {
    const base = await requestOrigin();
    const session = await getStripe().billingPortal.sessions.create({
      customer: customerId,
      configuration: await patientPortalConfigurationId(),
      locale: (await getLocale()) === "en" ? "en" : "fr",
      return_url: `${base}/patient/suivi`,
    });
    url = session.url;
  } catch (e) {
    console.error("openInvoices:", e);
  }
  if (!url) fail(t("paymentUnavailable"));
  redirect(url!);
}

/**
 * Régler soi-même les honoraires d'un mois que la banque a refusés ou dont
 * elle demande la validation (3-D Secure). Page de paiement Stripe sur le
 * compte du KINÉ (ses honoraires, 0 % pour EasyPhysio), pour ce mois précis :
 * même note d'honoraires, même montant. Le webhook marque le mois payé.
 */
export async function payReview(formData: FormData) {
  const t = await tr();
  const reviewId = String(formData.get("review_id") ?? "");
  const supabase = await createClient();
  const user = await requireUser(supabase);
  // Lecture par la session du patient : la règle d'accès ne lui rend que SES mois.
  const { data: review } = reviewId
    ? await supabase
        .from("monthly_reviews")
        .select("id, patient_id, instructor_id, period, amount_cents, payment_status, fee_note_year, fee_note_seq")
        .eq("id", reviewId)
        .eq("patient_id", user.id)
        .maybeSingle()
    : { data: null };
  if (!review || !reviewPayableByPatient(review.payment_status as string)) fail(t("reviewNotPayable"));

  const [{ data: connect }, followUp] = await Promise.all([
    supabase
      .from("instructor_connect_accounts")
      .select("stripe_connect_account_id, status")
      .eq("instructor_id", review!.instructor_id as string)
      .maybeSingle(),
    followUpForCharge(user.id),
  ]);
  const accountId = connect?.status === "active" ? ((connect.stripe_connect_account_id as string | null) ?? null) : null;
  if (!accountId) fail(t("reviewKineUnavailable"));

  let url: string | null = null;
  try {
    const base = await requestOrigin();
    const locale = (await getLocale()) === "en" ? "en" : "fr";
    const period = review!.period as string;
    url = await createReviewPaymentCheckout({
      reviewId: review!.id as string,
      amountCents: review!.amount_cents as number,
      accountId: accountId!,
      // Client du patient chez le kiné (carte copiée), s'il vit bien sur ce compte.
      customerId:
        followUp && followUp.instructor_id === review!.instructor_id && followUp.connect_account_id === accountId
          ? followUp.stripe_customer_id
          : null,
      productName: t("reviewProductName", { period: periodLabel(period, locale) }),
      description: reviewChargeDescription(period, review!.fee_note_year as number, review!.fee_note_seq as number, review!.amount_cents as number),
      receiptEmail: user.email ?? null,
      locale,
      successUrl: `${base}/patient/suivi?paye=1`,
      cancelUrl: `${base}/patient/suivi`,
    });
  } catch (e) {
    console.error("payReview:", e);
  }
  if (!url) fail(t("paymentUnavailable"));
  redirect(url!);
}
