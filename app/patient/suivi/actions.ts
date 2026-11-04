"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import { getStripe } from "@/lib/billing/stripe";
import { requestOrigin } from "@/lib/requestOrigin";
import { applicationFeePercent, isPatientPlanKey, patientPlan } from "@/lib/billing/patientPlans";
import { signedSubscriptionMetadata } from "@/lib/billing/subscriptionSignature";
import { refreshPatientSubscription } from "@/lib/billing/patientSubscription";

// Formules patient (Philippe, 2026-11-02) : le patient choisit 1, 3 ou 6
// mois ; Stripe Checkout crée l'abonnement sur le compte Stripe de SON kiné,
// renouvelé automatiquement, avec la part EasyPhysio prélevée au passage
// (lib/billing/patientPlans.ts). Résiliable à tout moment : l'accès dure
// jusqu'à la fin de la période payée.

const fail = (msg: string): never => redirect(`/patient/suivi?error=${encodeURIComponent(msg)}`);

/** Le patient connecté, le compte Stripe de son kiné et son abonnement actuel. */
async function context() {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  const { data: patient } = await supabase.from("patients").select("id, instructor_id, full_name").eq("id", user.id).maybeSingle();
  if (!patient) fail("Compte patient introuvable.");
  const instructorId = patient!.instructor_id as string;
  const [{ data: kine }, { data: connect }, { data: sub }] = await Promise.all([
    supabase.from("instructors").select("status, review_price_cents").eq("id", instructorId).maybeSingle(),
    supabase.from("instructor_connect_accounts").select("stripe_connect_account_id, status").eq("instructor_id", instructorId).maybeSingle(),
    supabase.from("subscriptions").select("plan, status, stripe_subscription_id, stripe_customer_id, stripe_account_id").eq("user_id", user.id).maybeSingle(),
  ]);
  const accountId = connect?.status === "active" ? ((connect.stripe_connect_account_id as string | null) ?? null) : null;
  return { user, patient: patient!, kine, accountId, sub };
}

export async function startPlan(formData: FormData) {
  const plan = formData.get("plan");
  if (!isPatientPlanKey(plan)) fail("Choisissez une formule.");
  if (formData.get("consent") !== "on") fail("Cochez la case pour accepter le tarif et le renouvellement automatique.");
  const { user, patient, kine, accountId, sub } = await context();
  if (((kine?.status as string | null) ?? "approved") !== "approved") fail("Votre kinésithérapeute ne propose pas de suivi pour le moment.");
  if ((kine?.review_price_cents as number | null) === 0) redirect("/patient");
  if (!accountId) fail("Votre kinésithérapeute n'a pas encore activé les paiements en ligne. Prévenez-le, puis revenez ici.");

  const stripe = getStripe();
  const p = patientPlan(plan as Parameters<typeof patientPlan>[0]);
  let url: string | null = null;
  try {
    // Ancien abonnement en échec de paiement chez ce kiné : on l'arrête avant
    // d'en créer un nouveau (un seul abonnement par patient).
    if (sub?.stripe_subscription_id && sub.stripe_account_id === accountId && ["past_due", "unpaid", "incomplete"].includes(sub.status as string)) {
      await stripe.subscriptions.cancel(sub.stripe_subscription_id as string, undefined, { stripeAccount: accountId! }).catch(() => null);
    }
    // Même client Stripe chez ce kiné si possible (carte déjà connue).
    let customerId: string | null = sub?.stripe_account_id === accountId ? ((sub?.stripe_customer_id as string | null) ?? null) : null;
    if (!customerId) {
      const c = await stripe.customers.create(
        { email: user.email ?? undefined, name: (patient.full_name as string | null) ?? undefined, metadata: { patient_id: user.id } },
        { stripeAccount: accountId! },
      );
      customerId = c.id;
    }
    const base = await requestOrigin();
    const metadata = signedSubscriptionMetadata(user.id, p.key, accountId!);
    const session = await stripe.checkout.sessions.create(
      {
        mode: "subscription",
        customer: customerId,
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: "eur",
              unit_amount: p.priceCents,
              recurring: { interval: "month", interval_count: p.months },
              product_data: { name: `Suivi de rééducation — ${p.label}` },
            },
          },
        ],
        subscription_data: { application_fee_percent: applicationFeePercent(p), metadata },
        metadata,
        locale: "fr",
        success_url: `${base}/patient/suivi/retour?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${base}/patient/suivi?checkout=annule`,
      },
      { stripeAccount: accountId! },
    );
    url = session.url;
  } catch (e) {
    console.error("startPlan:", e);
  }
  if (!url) fail("Le paiement est momentanément indisponible. Réessayez dans quelques minutes.");
  redirect(url!);
}

/** Résilier : l'abonnement s'arrête à la fin de la période payée. */
export async function cancelPlan() {
  const { sub } = await context();
  const id = sub?.stripe_subscription_id as string | undefined;
  const account = sub?.stripe_account_id as string | undefined;
  if (!id || !account) fail("Aucune formule en cours.");
  try {
    await getStripe().subscriptions.update(id!, { cancel_at_period_end: true }, { stripeAccount: account! });
    await refreshPatientSubscription(id!, account!);
  } catch (e) {
    console.error("cancelPlan:", e);
    fail("La résiliation n'a pas pu être enregistrée. Réessayez.");
  }
  redirect("/patient/suivi?arret=1");
}

/** Annuler la résiliation : la formule se renouvelle à nouveau. */
export async function resumePlan() {
  const { sub } = await context();
  const id = sub?.stripe_subscription_id as string | undefined;
  const account = sub?.stripe_account_id as string | undefined;
  if (!id || !account) fail("Aucune formule en cours.");
  try {
    await getStripe().subscriptions.update(id!, { cancel_at_period_end: false }, { stripeAccount: account! });
    await refreshPatientSubscription(id!, account!);
  } catch (e) {
    console.error("resumePlan:", e);
    fail("La reprise n'a pas pu être enregistrée. Réessayez.");
  }
  redirect("/patient/suivi?reprise=1");
}
