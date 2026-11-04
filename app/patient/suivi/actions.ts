"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import { getStripe } from "@/lib/billing/stripe";
import { requestOrigin } from "@/lib/requestOrigin";
import {
  KINE_FOLLOW_UP_CENTS,
  TRIAL_DAYS,
  commitmentEnd,
  eurosFR,
  isPlatformOfferKey,
  isPlatformSubscription,
  platformOffer,
  type SubscriptionRow,
} from "@/lib/billing/patientPlans";
import { signedSubscriptionMetadata } from "@/lib/billing/subscriptionSignature";
import { PLATFORM_SIGNATURE_ACCOUNT, platformVatRateId, refreshPatientSubscription } from "@/lib/billing/patientSubscription";

// Modèle définitif (Philippe, 2026-11-04 ; lib/billing/patientPlans.ts) : le
// patient choisit une offre d'accès à la plateforme (sans engagement, 3 mois
// ou 6 mois), payée chaque mois à EasyPhysio, sur le compte d'EasyPhysio
// (10 jours d'essai la première fois). Sa carte y est enregistrée, puis copiée
// chez son kiné, qui prélève lui-même ses 6 € les mois où il met à jour le
// programme (lib/billing/autoReview.ts). L'engagement ne porte que sur
// l'accès : une résiliation pendant l'engagement prend effet à sa fin.

const fail = (msg: string): never => redirect(`/patient/suivi?error=${encodeURIComponent(msg)}`);

/** Le patient connecté, l'état des paiements de son kiné et son abonnement actuel. */
async function context() {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  const { data: patient } = await supabase.from("patients").select("id, instructor_id, full_name").eq("id", user.id).maybeSingle();
  if (!patient) fail("Compte patient introuvable.");
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
  const key = formData.get("plan");
  if (!isPlatformOfferKey(key)) fail("Choisissez une offre.");
  if (formData.get("consent") !== "on") fail("Cochez la case pour accepter les deux montants et le prélèvement mensuel.");
  const { user, patient, kine, accountId, sub } = await context();
  if (((kine?.status as string | null) ?? "approved") !== "approved") fail("Votre kinésithérapeute ne propose pas de suivi pour le moment.");
  if (!accountId) fail("Votre kinésithérapeute n'a pas encore activé ses paiements en ligne. Prévenez-le, puis revenez ici.");

  const offer = platformOffer(key as Parameters<typeof platformOffer>[0]);
  const stripe = getStripe();
  let url: string | null = null;
  try {
    // Abonnement d'accès en échec de paiement : on l'arrête avant d'en créer
    // un nouveau (un seul abonnement par patient).
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
    // court à partir du premier mois payé.
    const firstTime = !sub;
    const paidStart = new Date(Date.now() + (firstTime ? TRIAL_DAYS * 86_400_000 : 0));
    const commitUntil = commitmentEnd(offer, paidStart);
    const base = await requestOrigin();
    const metadata = {
      ...signedSubscriptionMetadata(user.id, offer.key, PLATFORM_SIGNATURE_ACCOUNT),
      ...(commitUntil ? { commit_until: commitUntil } : {}),
    };
    const kineName = (kine?.full_name as string | null) ?? "votre kinésithérapeute";
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      payment_method_collection: "always",
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
          message: `Votre carte servira aussi à ${kineName}, qui prélèvera ses honoraires de ${eurosFR(KINE_FOLLOW_UP_CENTS)} € directement, seulement les mois où il met à jour votre programme.`,
        },
      },
      metadata,
      locale: "fr",
      success_url: `${base}/patient/suivi/retour?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/patient/suivi?checkout=annule`,
    });
    url = session.url;
  } catch (e) {
    console.error("startPlan:", e);
  }
  if (!url) fail("Le paiement est momentanément indisponible. Réessayez dans quelques minutes.");
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
  const { sub } = await context();
  const id = sub?.stripe_subscription_id as string | undefined;
  if (!id) fail("Aucun abonnement en cours.");
  const account = accountOf(sub);
  const stripe = getStripe();
  try {
    const opts = account ? { stripeAccount: account } : undefined;
    const live = await stripe.subscriptions.retrieve(id!, undefined, opts);
    const commitUntil = !account ? live.metadata?.commit_until : undefined;
    if (commitUntil && new Date(commitUntil) > new Date()) {
      await stripe.subscriptions.update(id!, { cancel_at: Math.floor(new Date(commitUntil).getTime() / 1000) });
    } else {
      await stripe.subscriptions.update(id!, { cancel_at_period_end: true }, opts);
    }
    await refreshPatientSubscription(id!, account);
  } catch (e) {
    console.error("cancelPlan:", e);
    fail("La résiliation n'a pas pu être enregistrée. Réessayez.");
  }
  redirect("/patient/suivi?arret=1");
}

/** Annuler la résiliation : l'abonnement d'accès continue. */
export async function resumePlan() {
  const { sub } = await context();
  const id = sub?.stripe_subscription_id as string | undefined;
  if (!id || accountOf(sub)) fail("Aucun abonnement à reprendre.");
  try {
    await getStripe().subscriptions.update(id!, { cancel_at_period_end: false, cancel_at: "" });
    await refreshPatientSubscription(id!, null);
  } catch (e) {
    console.error("resumePlan:", e);
    fail("La reprise n'a pas pu être enregistrée. Réessayez.");
  }
  redirect("/patient/suivi?reprise=1");
}
