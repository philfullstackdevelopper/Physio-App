"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import { getStripe } from "@/lib/billing/stripe";
import { requestOrigin } from "@/lib/requestOrigin";
import { ACCESS_PLAN_KEY, KINE_FOLLOW_UP_CENTS, PLATFORM_ACCESS_TTC_CENTS, TRIAL_DAYS, eurosFR } from "@/lib/billing/patientPlans";
import { signedSubscriptionMetadata } from "@/lib/billing/subscriptionSignature";
import { PLATFORM_SIGNATURE_ACCOUNT, platformVatRateId, refreshPatientSubscription } from "@/lib/billing/patientSubscription";

// Modèle définitif (Philippe, 2026-11-04 ; lib/billing/patientPlans.ts) :
// le patient souscrit UNE fois, sur le compte d'EasyPhysio, l'accès à la
// plateforme (3,99 € / mois, 10 jours d'essai la première fois). Sa carte y est
// enregistrée, puis copiée chez son kiné, qui prélève lui-même ses 6 € les mois
// où il met à jour le programme (lib/billing/autoReview.ts). Résiliable à tout
// moment : l'accès dure jusqu'à la fin du mois en cours.

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
    supabase.from("subscriptions").select("plan, status, stripe_subscription_id, stripe_customer_id, stripe_account_id").eq("user_id", user.id).maybeSingle(),
  ]);
  const accountId = connect?.status === "active" ? ((connect.stripe_connect_account_id as string | null) ?? null) : null;
  return { user, patient: patient!, kine, accountId, sub };
}

export async function startPlan(formData: FormData) {
  if (formData.get("consent") !== "on") fail("Cochez la case pour accepter les deux montants et le prélèvement mensuel.");
  const { user, patient, kine, accountId, sub } = await context();
  if (((kine?.status as string | null) ?? "approved") !== "approved") fail("Votre kinésithérapeute ne propose pas de suivi pour le moment.");
  if (!accountId) fail("Votre kinésithérapeute n'a pas encore activé ses paiements en ligne. Prévenez-le, puis revenez ici.");

  const stripe = getStripe();
  let url: string | null = null;
  try {
    // Abonnement d'accès en échec de paiement : on l'arrête avant d'en créer
    // un nouveau (un seul abonnement par patient).
    const onPlatform = sub?.plan === ACCESS_PLAN_KEY && !sub?.stripe_account_id;
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
    // Essai gratuit seulement à la toute première souscription.
    const firstTime = !sub;
    const base = await requestOrigin();
    const metadata = signedSubscriptionMetadata(user.id, ACCESS_PLAN_KEY, PLATFORM_SIGNATURE_ACCOUNT);
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
            unit_amount: PLATFORM_ACCESS_TTC_CENTS,
            tax_behavior: "inclusive",
            recurring: { interval: "month" },
            product_data: {
              name: "Accès à la plateforme EasyPhysio",
              description: "Hébergement de vos données de santé, application, vidéos et messagerie.",
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

/** Résilier : l'abonnement s'arrête à la fin du mois en cours (plus aucun prélèvement ensuite). */
export async function cancelPlan() {
  const { sub } = await context();
  const id = sub?.stripe_subscription_id as string | undefined;
  if (!id) fail("Aucun abonnement en cours.");
  const account = accountOf(sub);
  try {
    await getStripe().subscriptions.update(id!, { cancel_at_period_end: true }, account ? { stripeAccount: account } : undefined);
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
  if (!id || sub?.plan !== ACCESS_PLAN_KEY || accountOf(sub)) fail("Aucun abonnement à reprendre.");
  try {
    await getStripe().subscriptions.update(id!, { cancel_at_period_end: false });
    await refreshPatientSubscription(id!, null);
  } catch (e) {
    console.error("resumePlan:", e);
    fail("La reprise n'a pas pu être enregistrée. Réessayez.");
  }
  redirect("/patient/suivi?reprise=1");
}
