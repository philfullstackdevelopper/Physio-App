"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
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

// Démarre un Stripe Checkout (page hébergée) pour l'offre choisie et y
// redirige le patient. Appelé depuis un <form action={startTierCheckout}>
// avec un champ caché `tier`.
//
// L'argent va DIRECTEMENT sur le compte Stripe Connect du kiné du patient
// (subscription_data.transfer_data.destination) — EasyPhysio n'y touche
// jamais (CLAUDE.md §4, risque de compérage). Les 15 % de plateforme ne sont
// pas prélevés ici : sous-projet 2 du spec. Prix = ceux du kiné
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

  // Le compte Connect n'est lisible que par le kiné lui-même (0020) — lecture
  // serveur avec la clé service-role, jamais exposée au navigateur. On ne
  // garde l'id que si Stripe a validé le compte (status = active).
  const admin = createAdminClient();
  const { data: connect } = await admin
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
    const session = await getStripe().checkout.sessions.create({
      mode: "subscription",
      customer_email: user.email ?? undefined,
      client_reference_id: user.id,
      metadata: { user_id: user.id, plan: tier.key },
      subscription_data: {
        metadata: { user_id: user.id, plan: tier.key },
        trial_period_days: TRIAL_DAYS,
        transfer_data: { destination },
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
    });
    checkoutUrl = session.url;
  } catch (e) {
    console.error("startTierCheckout: Stripe checkout failed", e);
  }
  if (!checkoutUrl) fail("Le paiement est momentanément indisponible. Réessayez dans quelques minutes.");

  redirect(checkoutUrl);
}
