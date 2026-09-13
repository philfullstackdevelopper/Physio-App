"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import { getStripe } from "@/lib/billing/stripe";
import { CURRENCY, TIERS, isTierKey, resolveTierPrices, type InstructorTierPriceRow } from "@/lib/billing/plans";

// Change d'offre un abonnement DÉJÀ actif (contrairement à startTierCheckout,
// qui démarre un nouvel essai de 7 jours) — Philippe, 2026-09-11 : passer à
// une offre supérieure ou inférieure ne doit pas relancer un essai gratuit ni
// redemander la carte, juste ajuster le prix de l'abonnement en cours.
//
// Même contrainte que startTierCheckout : le prix est construit inline
// (price_data), pas un Price Stripe enregistré — la fonctionnalité "changer
// d'offre" du portail client Stripe ne peut pas s'en servir (elle exige une
// liste fixe de Price partagée par tous les clients, incompatible avec des
// tarifs propres à chaque kiné). D'où cette action dédiée plutôt que de
// s'appuyer sur billingPortal.
//
// proration_behavior: "create_prorations" (choix par défaut de Stripe) — le
// changement est immédiat, avec un crédit/débit au prorata sur la prochaine
// facture plutôt qu'attendre la fin de la période en cours.
export async function changeTier(formData: FormData) {
  const fail: (msg: string) => never = (msg) =>
    redirect(`/patient/compte/changer-offre?error=${encodeURIComponent(msg)}`);

  const tierKey = formData.get("tier");
  if (!isTierKey(tierKey)) fail("Offre inconnue.");
  const tier = TIERS[tierKey];

  const supabase = await createClient();
  const user = await requireUser(supabase);

  const [{ data: patient }, { data: sub }] = await Promise.all([
    supabase.from("patients").select("instructor_id").eq("id", user.id).maybeSingle(),
    supabase.from("subscriptions").select("stripe_subscription_id, plan").eq("user_id", user.id).maybeSingle(),
  ]);
  if (!patient) fail("Compte patient introuvable.");
  const subscriptionId = (sub?.stripe_subscription_id as string | null) ?? null;
  if (!subscriptionId) fail("Aucun abonnement actif à modifier.");
  if (sub?.plan === tier.key) redirect("/patient/compte");

  const instructorId = patient.instructor_id as string;
  const [{ data: kine }, { data: connect }] = await Promise.all([
    supabase
      .from("instructors")
      .select("full_name, tier_essentiel_cents, tier_standard_cents, tier_premium_cents")
      .eq("id", instructorId)
      .maybeSingle(),
    supabase
      .from("instructor_connect_accounts")
      .select("stripe_connect_account_id, status")
      .eq("instructor_id", instructorId)
      .maybeSingle(),
  ]);
  const prices = resolveTierPrices(kine as InstructorTierPriceRow | null);
  const destination =
    connect?.status === "active" ? ((connect.stripe_connect_account_id as string | null) ?? null) : null;
  if (!destination) fail("Votre kinésithérapeute n'a pas (ou plus) les paiements activés.");
  const kineName = (kine?.full_name as string | null) ?? "votre kiné";

  const stripe = getStripe();
  try {
    // Le compte connecté du kiné est la seule source de vérité pour l'item
    // d'abonnement à remplacer — jamais mis en cache localement.
    const current = await stripe.subscriptions.retrieve(subscriptionId, undefined, { stripeAccount: destination });
    const itemId = current.items.data[0]?.id;
    if (!itemId) fail("Abonnement introuvable côté Stripe.");

    // Subscription-item price_data wants an existing Product id (unlike
    // Checkout's line_items.price_data, which takes inline product_data) —
    // created fresh on the kiné's own connected account each time, same as
    // every other price here: no shared Price/Product catalog to manage.
    const product = await stripe.products.create(
      { name: `EasyPhysio — Offre ${tier.label} · ${kineName}` },
      { stripeAccount: destination },
    );

    await stripe.subscriptions.update(
      subscriptionId,
      {
        metadata: { user_id: user.id, plan: tier.key },
        proration_behavior: "create_prorations",
        items: [
          {
            id: itemId,
            price_data: {
              currency: CURRENCY,
              product: product.id,
              unit_amount: prices[tier.key],
              recurring: { interval: "month" },
            },
          },
        ],
      },
      { stripeAccount: destination },
    );
  } catch (e) {
    console.error("changeTier: Stripe update failed", e);
    fail("Le changement d'offre a échoué. Réessayez dans quelques minutes.");
  }

  redirect("/patient/compte?changed=1");
}
