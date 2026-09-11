// =============================================================================
// Compteur de patients actifs, par offre — pure logic (no DB). Réutilise
// hasActiveTier (access.ts) pour la définition de « actif », jamais
// redéfinie ici. Sert la page Tarifs et paiements (facturation), et plus
// tard la collecte de la commission plateforme (prorata par patient actif).
// =============================================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import { hasActiveTier, type TierBilling } from "./access.ts";
import { isTierKey, type TierKey } from "./plans.ts";

export interface SubscriptionRow {
  user_id: string;
  plan: string | null;
  status: string | null;
  current_period_end: string | null;
}

export interface PatientRow {
  id: string;
  trial_ends_at: string | null;
}

export interface PatientCounts {
  total: number;
  active: number;
  byTier: Record<TierKey, number>;
}

/** Compte les patients d'un kiné et répartit les actifs par offre. */
export function computePatientCounts(
  patients: PatientRow[],
  subscriptions: SubscriptionRow[],
  now: Date = new Date(),
): PatientCounts {
  const subByPatient = new Map(subscriptions.map((s) => [s.user_id, s]));
  const byTier: Record<TierKey, number> = { essentiel: 0, standard: 0, premium: 0 };
  let active = 0;

  for (const p of patients) {
    const sub = subByPatient.get(p.id);
    const billing: TierBilling = {
      subPlan: sub?.plan ?? null,
      subStatus: sub?.status ?? null,
      subCurrentPeriodEnd: sub?.current_period_end ?? null,
      trialEndsAt: p.trial_ends_at,
    };
    if (!hasActiveTier(billing, now)) continue;
    active++;
    if (isTierKey(billing.subPlan)) byTier[billing.subPlan]++;
  }

  return { total: patients.length, active, byTier };
}

/** Charge les patients d'un instructeur et leurs abonnements, puis agrège. */
export async function loadPatientCounts(
  supabase: SupabaseClient,
  instructorId: string,
  now: Date = new Date(),
): Promise<PatientCounts> {
  const { data: patients } = await supabase
    .from("patients")
    .select("id, trial_ends_at")
    .eq("instructor_id", instructorId);

  const ids = (patients ?? []).map((p) => p.id as string);
  const { data: subscriptions } = ids.length
    ? await supabase.from("subscriptions").select("user_id, plan, status, current_period_end").in("user_id", ids)
    : { data: [] as SubscriptionRow[] };

  return computePatientCounts(
    (patients ?? []) as PatientRow[],
    (subscriptions ?? []) as SubscriptionRow[],
    now,
  );
}
