"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
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
    .select("full_name, tier_essentiel_cents, tier_standard_cents, tier_premium_cents")
    .eq("id", instructorId)
    .maybeSingle();
  const prices = resolveTierPrices(kine as InstructorTierPriceRow | null);

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

  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https";
  const base = `${proto}://${host}`;
  const kineName = (kine?.full_name as string | null) ?? "votre kiné";

  // redirect() fonctionne en levant une exception interne à Next : il doit
  // rester HORS du try, sinon le catch l'avalerait.
  let checkoutUrl: string | null = null;
  try {
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
    const session = await getStripe().checkout.sessions.create(
      {
        mode: "subscription",
        customer_email: user.email ?? undefined,
        client_reference_id: user.id,
        metadata: { user_id: user.id, plan: tier.key },
        subscription_data: {
          metadata: { user_id: user.id, plan: tier.key },
          trial_period_days: TRIAL_DAYS,
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
