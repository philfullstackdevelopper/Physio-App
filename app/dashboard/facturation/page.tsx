import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import { TIER_KEYS, resolveTierPrices, type InstructorTierPriceRow } from "@/lib/billing/plans";
import { loadPatientCounts } from "@/lib/billing/patientCounts";
import { estimateMonthlySplit } from "@/lib/billing/platformFee";
import FacturationView, { type ConnectStatus } from "./FacturationView";

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
  const user = await requireUser(supabase);

  const [{ data: kine }, { data: connect }, counts] = await Promise.all([
    supabase
      .from("instructors")
      .select("tier_essentiel_cents, tier_standard_cents, tier_premium_cents")
      .eq("id", user.id)
      .maybeSingle(),
    supabase.from("instructor_connect_accounts").select("status").eq("instructor_id", user.id).maybeSingle(),
    loadPatientCounts(supabase, user.id),
  ]);

  const prices = resolveTierPrices(kine as InstructorTierPriceRow | null);
  const connectStatus = ((connect?.status as string | null) ?? "not_started") as ConnectStatus;

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
