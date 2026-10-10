import { createClient } from "@/lib/supabase/server";
import { TIER_KEYS, resolveTierPrices, type InstructorTierPriceRow } from "@/lib/billing/plans";
import { loadPatientCounts } from "@/lib/billing/patientCounts";
import { estimateMonthlySplit } from "@/lib/billing/platformFee";
import { refreshConnectStatus } from "@/lib/billing/connectStatus";
import FacturationView, { type ConnectStatus } from "./FacturationView";
import { requireApprovedInstructor } from "@/lib/dashboard/requireApprovedInstructor";

// Tarifs et paiements : pour l'instant en lecture seule côté kiné — les prix
// des trois offres restent ceux d'EasyPhysio par défaut (lib/billing/plans.ts).
// Le réglage de son propre tarif (documenté dans CLAUDE.md §4.7) est retiré
// de cette page temporairement (Philippe, 2026-09-11 : "remove his choice to
// set his own price, just keep number of ppl using each subscription") pour
// que tout tienne sur un seul écran, sans scroll. Le formulaire d'édition et
// setTierPrices (../connect/actions) restent en place, juste plus appelés ici.
// L'affichage lui-même vit dans FacturationView.tsx.
export default async function FacturationPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const { error, saved } = await searchParams;
  const supabase = await createClient();
  // Validation du compte vérifiée ICI aussi (audit du 2026-10-08) : le
  // layout ne se ré-exécute pas à chaque navigation (doc Next.js 16).
  const { user } = await requireApprovedInstructor(supabase);

  const [{ data: kine }, { data: connect }, counts] = await Promise.all([
    supabase
      .from("instructors")
      .select("tier_essentiel_cents, tier_standard_cents, tier_premium_cents")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("instructor_connect_accounts")
      .select("status, stripe_connect_account_id")
      .eq("instructor_id", user.id)
      .maybeSingle(),
    loadPatientCounts(supabase, user.id),
  ]);

  const prices = resolveTierPrices(kine as InstructorTierPriceRow | null);
  let connectStatus = ((connect?.status as string | null) ?? "not_started") as ConnectStatus;

  // (Philippe, 2026-10-07) Le statut stocké peut être en retard sur Stripe
  // (onboarding terminé plus tard, webhook manqué) : tant qu'il n'est pas
  // « active », on relit le compte chez Stripe à chaque visite — un seul
  // appel, et seulement dans ce cas. Échec → on garde le statut stocké.
  const accountId = (connect?.stripe_connect_account_id as string | null) ?? null;
  if (accountId && connectStatus !== "active") {
    try {
      connectStatus = await refreshConnectStatus(user.id, accountId);
    } catch (err) {
      console.error("[facturation] resynchronisation du compte Stripe impossible :", err);
    }
  }

  // Répartition « roue » : à partir des offres RÉELLEMENT choisies par ses
  // patients aujourd'hui (counts.byTier), pas d'une simulation manuelle.
  const split = estimateMonthlySplit(TIER_KEYS.map((key) => ({ priceCents: prices[key], count: counts.byTier[key] })));

  return (
    <FacturationView
      counts={counts}
      prices={prices}
      connectStatus={connectStatus}
      split={split}
      error={error}
      saved={saved}
    />
  );
}
