"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import { getStripe } from "@/lib/billing/stripe";
import { requestOrigin } from "@/lib/requestOrigin";
import { followUpForCharge, upsertFollowUp } from "@/lib/db/admin";
import { followUpSetupMetadata } from "@/lib/billing/followUp";
import { effectiveReviewPrice } from "@/lib/billing/reviewModel";

// Suivi mensuel, côté patient (nouveau modèle, 2026-10-24).
// Le patient accepte par écrit le tarif de son kiné (art. R.4321-98 CSP :
// information préalable sur le montant), puis enregistre sa carte chez
// Stripe, sur le compte de son kiné. Aucun prélèvement à ce moment-là : il
// n'est prélevé que le mois où son kiné valide un bilan.

const fail = (msg: string): never => redirect(`/patient/suivi?error=${encodeURIComponent(msg)}`);

export async function startFollowUp(formData: FormData) {
  if (formData.get("consent") !== "on") fail("Cochez la case pour accepter le tarif et les conditions du suivi.");
  const supabase = await createClient();
  const user = await requireUser(supabase);

  const { data: patient } = await supabase.from("patients").select("id, instructor_id, full_name").eq("id", user.id).maybeSingle();
  if (!patient) fail("Compte patient introuvable.");
  const instructorId = patient!.instructor_id as string;
  const [{ data: kine }, { data: connect }] = await Promise.all([
    supabase.from("instructors").select("full_name, status, review_price_cents").eq("id", instructorId).maybeSingle(),
    supabase.from("instructor_connect_accounts").select("stripe_connect_account_id, status").eq("instructor_id", instructorId).maybeSingle(),
  ]);
  if (((kine?.status as string | null) ?? "approved") !== "approved") fail("Votre kinésithérapeute ne propose pas de suivi pour le moment.");
  const accountId = connect?.status === "active" ? ((connect.stripe_connect_account_id as string | null) ?? null) : null;
  if (!accountId) fail("Votre kinésithérapeute n'a pas encore activé les paiements en ligne. Prévenez-le, puis revenez ici.");

  // Le tarif accepté est celui affiché sur la page, relu ici côté serveur.
  const priceCents = effectiveReviewPrice((kine?.review_price_cents as number | null) ?? null);
  if (Number(formData.get("price_cents")) !== priceCents) fail("Le tarif de votre kiné vient de changer : vérifiez-le et recommencez.");

  const stripe = getStripe();
  const existing = await followUpForCharge(user.id);
  let url: string | null = null;
  try {
    // Réutiliser le client Stripe déjà créé chez ce kiné (même carte possible).
    let customerId: string | null = null;
    if (existing?.stripe_customer_id && existing.connect_account_id === accountId) {
      try {
        const c = await stripe.customers.retrieve(existing.stripe_customer_id, undefined, { stripeAccount: accountId! });
        if (!("deleted" in c && c.deleted)) customerId = c.id;
      } catch {
        /* introuvable : un nouveau client est créé */
      }
    }
    if (!customerId) {
      const c = await stripe.customers.create(
        { email: user.email ?? undefined, name: (patient!.full_name as string | null) ?? undefined, metadata: { patient_id: user.id } },
        { stripeAccount: accountId! },
      );
      customerId = c.id;
    }
    await upsertFollowUp({
      patientId: user.id,
      instructorId,
      priceCents,
      status: existing?.status === "active" ? "active" : "pending_card",
      stripeCustomerId: customerId,
      stripePaymentMethodId: null,
      cardLabel: null,
    });
    const base = await requestOrigin();
    const session = await stripe.checkout.sessions.create(
      {
        mode: "setup",
        customer: customerId,
        currency: "eur",
        payment_method_types: ["card"],
        metadata: followUpSetupMetadata({ patientId: user.id, instructorId, priceCents, accountId: accountId! }),
        success_url: `${base}/patient/suivi/retour?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${base}/patient/suivi?checkout=annule`,
      },
      { stripeAccount: accountId! },
    );
    url = session.url;
  } catch (e) {
    console.error("startFollowUp:", e);
  }
  if (!url) fail("L'enregistrement de la carte est momentanément indisponible. Réessayez dans quelques minutes.");
  redirect(url!);
}

export async function stopFollowUp() {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  const existing = await followUpForCharge(user.id);
  if (existing) {
    await upsertFollowUp({
      patientId: user.id,
      instructorId: existing.instructor_id,
      priceCents: existing.price_cents,
      status: "stopped",
      stripeCustomerId: null,
      stripePaymentMethodId: null,
      cardLabel: null,
    });
  }
  redirect("/patient/suivi?arret=1");
}
