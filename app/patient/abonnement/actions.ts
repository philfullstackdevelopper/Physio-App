"use server";

import { signedSubscriptionMetadata } from "@/lib/billing/subscriptionSignature";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import { getStripe } from "@/lib/billing/stripe";
import {
  CURRENCY,
  TIERS,
  TRIAL_DAYS,
  isTierKey,
  resolveTierPrices,
  type InstructorTierPriceRow,
} from "@/lib/billing/plans";
import { PLATFORM_FEE_RATE } from "@/lib/billing/platformFee";
import { hasActiveTier } from "@/lib/billing/access";
import { requestOrigin } from "@/lib/requestOrigin";
import { getTierBilling } from "@/lib/billing/context";

// Démarre un Stripe Checkout (page hébergée) pour l'offre choisie et y
// redirige le patient. Appelé depuis un <form action={startTierCheckout}>
// avec un champ caché `tier`.
//
// Paiement direct (option `stripeAccount`, voir plus bas) : le kiné est le
// "merchant of record", l'argent du patient ne transite jamais par le compte
// EasyPhysio (CLAUDE.md §4). La commission de 16 % est prélevée
// automatiquement par Stripe sur chaque facture
// (subscription_data.application_fee_percent) — décision Philippe du
// 2026-09-10, risque de compérage assumé en connaissance de cause (question
// posée au CNOMK en parallèle). Prix = ceux du kiné
// (instructors.tier_*_cents), sinon les défauts de lib/billing/plans.ts.
export async function startTierCheckout(formData: FormData) {
  // Annotation explicite sur la variable : c'est ce qui permet à TypeScript de
  // traiter chaque `fail(...)` comme une assertion et de resserrer les types
  // après (patient non null, tierKey valide, destination string).
  const fail: (msg: string) => never = (msg) => redirect(`/patient/abonnement?error=${encodeURIComponent(msg)}`);

  const tierKey = formData.get("tier");
  if (!isTierKey(tierKey)) fail("Offre inconnue.");
  const tier = TIERS[tierKey];

  const supabase = await createClient();
  const user = await requireUser(supabase);

  // (Philippe, 2026-10-07) Revérifié côté serveur : un double clic, un
  // onglet resté ouvert ou un formulaire rejoué ne doit jamais créer un
  // DEUXIÈME abonnement (deux prélèvements par mois) à côté de celui en cours.
  const [billing, { data: existingSub }] = await Promise.all([
    getTierBilling(supabase, user.id),
    supabase
      .from("subscriptions")
      .select("stripe_customer_id, stripe_subscription_id, status")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);
  if (hasActiveTier(billing)) redirect("/patient");
  if (existingSub?.status === "past_due" || existingSub?.status === "unpaid") {
    fail("Un paiement de votre abonnement a échoué : mettez à jour votre carte plutôt que de souscrire à nouveau.");
  }
  // Essai gratuit : une seule fois par patient. Toute trace d'un abonnement
  // passé (même résilié) l'exclut — avant, chaque nouvelle souscription
  // offrait 7 jours de plus, indéfiniment.
  const storedCustomerId = (existingSub?.stripe_customer_id as string | null) ?? null;
  const hadSubscription = !!existingSub?.stripe_subscription_id || !!storedCustomerId;

  const { data: patient } = await supabase
    .from("patients")
    .select("id, instructor_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!patient) fail("Compte patient introuvable.");
  const instructorId = patient.instructor_id as string;

  // Un patient peut lire la ligne de SON kiné (migration 0028) : nom + prix.
  const { data: kine } = await supabase
    .from("instructors")
    .select("full_name, status, tier_essentiel_cents, tier_standard_cents, tier_premium_cents")
    .eq("id", instructorId)
    .maybeSingle();
  const prices = resolveTierPrices(kine as InstructorTierPriceRow | null);

  // Kiné suspendu ou pas (encore) validé : aucun paiement vers son compte
  // (audit du 2026-10-08). Ses patients gardent l'accès gratuit s'il est
  // suspendu (lib/billing/context.ts) — rien à payer.
  if (((kine?.status as string | null) ?? "approved") !== "approved") {
    fail("Votre kinésithérapeute n'accepte pas de nouvel abonnement pour le moment. Votre accès à votre programme reste ouvert.");
  }

  // Un patient peut lire le compte Connect de SON PROPRE kiné (voir
  // connect_accounts_patient_read, migration 0057) — on ne garde l'id que si
  // Stripe a validé le compte (status = active).
  const { data: connect } = await supabase
    .from("instructor_connect_accounts")
    .select("stripe_connect_account_id, status")
    .eq("instructor_id", instructorId)
    .maybeSingle();
  const destination =
    connect?.status === "active" ? ((connect.stripe_connect_account_id as string | null) ?? null) : null;
  if (!destination) {
    fail("Votre kinésithérapeute n'a pas encore activé les paiements en ligne. Prévenez-le, puis revenez ici.");
  }

  // Adresse du site configurée (NEXT_PUBLIC_SITE_URL), pas l'en-tête Host
  // de la requête, qui peut être falsifié (audit du 2026-10-08).
  const base = await requestOrigin();
  const kineName = (kine?.full_name as string | null) ?? "votre kiné";
  const stripe = getStripe();

  // redirect() fonctionne en levant une exception interne à Next : il doit
  // rester HORS du try, sinon le catch l'avalerait.
  let checkoutUrl: string | null = null;
  try {
    // Réutiliser le client Stripe déjà connu (même carte, historique de
    // factures, et un seul client à retrouver côté webhook) — seulement s'il
    // existe bien sur le compte Connect de CE kiné : un client d'un ancien
    // abonnement plateforme ou d'un autre kiné n'y existe pas.
    let customerId: string | null = null;
    if (storedCustomerId) {
      try {
        const c = await stripe.customers.retrieve(storedCustomerId, undefined, { stripeAccount: destination });
        if (!("deleted" in c && c.deleted)) customerId = c.id;
      } catch {
        /* introuvable sur ce compte — un nouveau client sera créé */
      }
    }


    // Paiement direct (Direct charge) : la session est créée SUR le compte
    // Connect du kiné (option `stripeAccount`, pas transfer_data.destination)
    // — Stripe recommande ce mode pour les comptes "Standard" (le type utilisé
    // ici, voir startConnectOnboarding()). Le kiné est le "merchant of
    // record" : l'argent du patient ne transite jamais, même techniquement,
    // par le compte plateforme — cohérent avec CLAUDE.md §4 ("EasyPhysio n'y
    // touche jamais"). `application_fee_percent` prélève quand même
    // automatiquement la commission plateforme sur chaque facture. Décision
    // Philippe du 2026-09-10 : risque déontologique (compérage,
    // R.4321-70/71/72 CSP) assumé en connaissance de cause, question posée
    // au CNOMK en parallèle — ce mode de paiement ne change rien à ce
    // risque, seulement à qui est légalement le vendeur de la transaction.
    const session = await stripe.checkout.sessions.create(
      {
        mode: "subscription",
        ...(customerId ? { customer: customerId } : { customer_email: user.email ?? undefined }),
        client_reference_id: user.id,
        metadata: { user_id: user.id, plan: tier.key },
        subscription_data: {
          // Signé : seul un abonnement créé ici est reconnu par le webhook
          // (lib/billing/subscriptionSignature.ts).
          metadata: signedSubscriptionMetadata(user.id, tier.key, destination),
          ...(hadSubscription ? {} : { trial_period_days: TRIAL_DAYS }),
          application_fee_percent: PLATFORM_FEE_RATE * 100,
        },
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: CURRENCY,
              product_data: { name: `EasyPhysio — Offre ${tier.label} · ${kineName}` },
              unit_amount: prices[tier.key],
              recurring: { interval: "month" },
            },
          },
        ],
        // Stripe remplace {CHECKOUT_SESSION_ID} ; /billing/return synchronise
        // l'abonnement puis renvoie vers `next`.
        success_url: `${base}/billing/return?session_id={CHECKOUT_SESSION_ID}&next=${encodeURIComponent("/patient?subscribed=1")}`,
        cancel_url: `${base}/patient/abonnement?checkout=cancel`,
      },
      { stripeAccount: destination },
    );
    checkoutUrl = session.url;
  } catch (e) {
    console.error("startTierCheckout: Stripe checkout failed", e);
  }
  if (!checkoutUrl) fail("Le paiement est momentanément indisponible. Réessayez dans quelques minutes.");

  redirect(checkoutUrl);
}
