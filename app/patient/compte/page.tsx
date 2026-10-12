import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import { TIERS, isTierKey, resolveTierPrices, type InstructorTierPriceRow } from "@/lib/billing/plans";
import { hasActiveTier, isSubscriptionActive } from "@/lib/billing/access";
import { getTierBilling } from "@/lib/billing/context";
import { getStripe } from "@/lib/billing/stripe";
import CompteView from "./CompteView";

const frDate = (iso: string) =>
  new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(new Date(iso));
// Hors du composant : react-hooks/purity refuse Date.now() dans le rendu.
const isFuture = (iso: string) => new Date(iso).getTime() > Date.now();

// Statut affiché en pastille dans « Mon abonnement » — même logique de
// couleur que le reste du dashboard (ok/warn/danger + -soft).
function statusBadge(status: string | null | undefined, active: boolean) {
  if (status === "trialing") return { label: "Essai en cours", tone: "ok" as const };
  if (status === "past_due" || status === "unpaid") return { label: "Paiement en échec", tone: "danger" as const };
  if (status === "canceled") return { label: "Résilié", tone: "warn" as const };
  if (active) return { label: "Actif", tone: "ok" as const };
  return { label: "Inactif", tone: "warn" as const };
}

/** Date de fin si une résiliation est programmée chez Stripe, sinon null. */
async function scheduledCancellation(
  subscriptionId: string | null,
  instructorId: string | null,
  status: string | null | undefined,
): Promise<string | null> {
  if (!subscriptionId || !instructorId || (status !== "active" && status !== "trialing")) return null;
  try {
    const supabase = await createClient();
    const { data: connect } = await supabase
      .from("instructor_connect_accounts")
      .select("stripe_connect_account_id")
      .eq("instructor_id", instructorId)
      .maybeSingle();
    const account = (connect?.stripe_connect_account_id as string | null) ?? null;
    const stripeSub = await getStripe().subscriptions.retrieve(subscriptionId, undefined, account ? { stripeAccount: account } : undefined);
    if (!stripeSub.cancel_at_period_end && !stripeSub.cancel_at) return null;
    const end = stripeSub.cancel_at ?? stripeSub.items.data[0]?.current_period_end ?? null;
    return end ? new Date(end * 1000).toISOString() : null;
  } catch (e) {
    console.error("[compte] lecture de l'abonnement Stripe impossible :", e);
    return null;
  }
}

// Refonte 2026-09-11 (Philippe, à partir d'une maquette fournie) : deux
// cartes côte à côte (abonnement + compte), une zone de danger en pleine
// largeur bien distincte, et les actions secondaires (export de données,
// déconnexion) réduites à de simples liens en bas — elles n'ont pas besoin
// du même poids visuel que résilier un abonnement ou supprimer un compte.
// "Notifications" de la maquette d'origine a été retiré : rien derrière
// aujourd'hui, pas de préférences à activer/désactiver dans ce projet.
export default async function CompteePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; refreshed?: string; changed?: string }>;
}) {
  const { error, refreshed, changed } = await searchParams;
  const supabase = await createClient();
  const user = await requireUser(supabase);

  const [billing, { data: sub }, { data: patient }] = await Promise.all([
    getTierBilling(supabase, user.id),
    supabase.from("subscriptions").select("stripe_customer_id, stripe_subscription_id").eq("user_id", user.id).maybeSingle(),
    supabase.from("patients").select("full_name, instructor_id").eq("id", user.id).maybeSingle(),
  ]);
  // (Philippe, 2026-10-07) Le prix affiché est celui de SON kiné (lisible par
  // le patient, migration 0028 — même lecture que /patient/abonnement), pas
  // le défaut plateforme de TIERS : c'est ce montant-là que Stripe prélève.
  const instructorId = (patient?.instructor_id as string | null) ?? null;
  const { data: kine } = instructorId
    ? await supabase
        .from("instructors")
        .select("tier_essentiel_cents, tier_standard_cents, tier_premium_cents")
        .eq("id", instructorId)
        .maybeSingle()
    : { data: null };
  const kinePrices = resolveTierPrices(kine as InstructorTierPriceRow | null);
  const hasCustomer = !!(sub?.stripe_customer_id as string | null);
  const active = hasActiveTier(billing);
  const paid = isSubscriptionActive(billing.subStatus, billing.subCurrentPeriodEnd);
  const badge = statusBadge(billing.subStatus, active);
  const badgeClass = { ok: "bg-ok-soft text-ok", warn: "bg-warn-soft text-warn", danger: "bg-danger-soft text-danger" }[
    badge.tone
  ];

  const offerLabel = isTierKey(billing.subPlan)
    ? TIERS[billing.subPlan].label
    : billing.subPlan === "patient_monthly"
      ? "EasyPhysio (offre historique)"
      : active
        ? "Essai gratuit (offre historique)"
        : "Aucune offre active";
  // Résiliation demandée depuis le portail Stripe, effective en fin de période
  // (audit du 2026-10-08) : le statut reste « actif » jusque-là, et la page
  // annonçait encore un « prochain prélèvement ». On le demande à Stripe.
  const cancelAt = await scheduledCancellation(
    (sub?.stripe_subscription_id as string | null) ?? null,
    instructorId,
    billing.subStatus,
  );
  const nextChargeLine = cancelAt
    ? `Résiliation demandée : accès jusqu'au ${frDate(cancelAt)}, plus aucun prélèvement`
    : billing.subStatus === "trialing" && billing.subCurrentPeriodEnd
      ? `Premier prélèvement le ${frDate(billing.subCurrentPeriodEnd)}`
      : paid && billing.subCurrentPeriodEnd
        ? `Prochain prélèvement le ${frDate(billing.subCurrentPeriodEnd)}`
        : billing.subStatus === "canceled" && billing.subCurrentPeriodEnd
          ? isFuture(billing.subCurrentPeriodEnd)
            ? `Accès jusqu'au ${frDate(billing.subCurrentPeriodEnd)}`
            : null
          : !billing.subPlan && billing.trialEndsAt && active
            ? `Jusqu'au ${frDate(billing.trialEndsAt)}`
            : null;
  const priceCents = isTierKey(billing.subPlan) ? kinePrices[billing.subPlan] : null;
  // Résiliable : un abonnement Stripe en cours (payé ou en essai), pas déjà résilié.
  const canCancel = hasCustomer && (billing.subStatus === "active" || billing.subStatus === "trialing") && !cancelAt;
  const accessEnd = billing.subCurrentPeriodEnd ? frDate(billing.subCurrentPeriodEnd) : null;

  return (
    <CompteView
      fullName={(patient?.full_name as string | null) ?? null}
      error={error}
      refreshed={refreshed}
      changed={changed}
      offerLabel={offerLabel}
      priceCents={priceCents}
      badgeLabel={badge.label}
      badgeClass={badgeClass}
      nextChargeLine={nextChargeLine}
      hasCustomer={hasCustomer}
      canChangeOffer={isTierKey(billing.subPlan)}
      active={active}
      canCancel={canCancel}
      cancelAt={cancelAt}
      accessEnd={accessEnd}
    />
  );
}
