// Server helpers: what a patient's billing state allows, read in one place so
// the layout, the home page and the guided session can never disagree on who
// is let in. The pure rules live in access.ts.
import type { SupabaseClient } from "@supabase/supabase-js";
import { hasActiveTier, type TierBilling } from "./access";

/** Ce que hasActiveTier() a besoin de savoir sur un patient, en une requête. */
export async function getTierBilling(supabase: SupabaseClient, userId: string): Promise<TierBilling> {
  const [{ data: pat }, { data: sub }] = await Promise.all([
    supabase.from("patients").select("trial_ends_at").eq("id", userId).maybeSingle(),
    supabase.from("subscriptions").select("plan, status, current_period_end").eq("user_id", userId).maybeSingle(),
  ]);
  return {
    trialEndsAt: (pat?.trial_ends_at as string | null) ?? null,
    subPlan: (sub?.plan as string | null) ?? null,
    subStatus: (sub?.status as string | null) ?? null,
    subCurrentPeriodEnd: (sub?.current_period_end as string | null) ?? null,
  };
}

/** Le kiné de ce patient a-t-il été suspendu par l'administrateur ? */
export async function isPatientKineSuspended(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const { data } = await supabase.from("patients").select("instructors ( status )").eq("id", userId).maybeSingle();
  const kine = data?.instructors as unknown as { status: string | null } | null;
  return kine?.status === "suspended";
}

/**
 * Le patient peut-il utiliser l'appli (programme, séances) ?
 * Oui s'il a une offre active — ou si son kiné a été suspendu : ses
 * abonnements sont alors résiliés et remboursés, et ses patients gardent
 * l'accès GRATUIT à leur programme (Philippe, 2026-10-07 ; le bandeau de
 * app/patient/layout.tsx le leur annonce). Avant l'audit du 2026-10-08,
 * seule la mise en page faisait l'exception : l'Accueil et les séances
 * renvoyaient quand même vers le paiement.
 */
export async function hasPatientAppAccess(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const [billing, suspended] = await Promise.all([getTierBilling(supabase, userId), isPatientKineSuspended(supabase, userId)]);
  return suspended || hasActiveTier(billing);
}
