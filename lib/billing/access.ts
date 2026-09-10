// =============================================================================
// Access tiers — pure logic (no DB, no framework). Given a user's billing state,
// compute their effective level and which features are unlocked. Reused on the
// server (page gating) and to inform the UI. All feature gating should go
// through this so the rules live in ONE place.
//
// Business model (see CLAUDE.md / the build brief):
//   PATIENT:  free floor  ->  2-month trial (full)  ->  premium €10/mo (full)
//   KINÉ:     free  ->  "pro" once he has set his own patient price and pays
//             EasyPhysio a prorated 15% platform fee per active patient
//             (lib/billing/platformFee.ts) — there is no separate flat
//             instructor subscription anymore (the old "kine_pro" €30/mo
//             plan was removed). Fees ARE now proportional to how many
//             patients a kiné brings — that was a deliberate, carefully
//             reasoned choice (see the project's plan docs): the money only
//             ever flows kiné -> EasyPhysio, never the reverse, which is
//             what avoids the compérage risk a reversed flow would create.
// =============================================================================

// Extension explicite : ce module tourne aussi sous `node --test` (sans
// bundler), qui ne résout pas les imports sans extension — même convention
// que lib/dashboard/patientRows.ts.
import { isTierKey } from "./plans.ts";

export type PatientLevel = "free" | "trial" | "premium";
export type InstructorLevel = "free" | "pro";

// Stripe subscription statuses that grant access.
const ACTIVE_STATUSES = new Set(["active", "trialing"]);

/** True when a Stripe-backed subscription is currently granting access. */
export function isSubscriptionActive(
  status: string | null | undefined,
  currentPeriodEnd: string | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!status || !ACTIVE_STATUSES.has(status)) return false;
  // Honour the paid period end if Stripe gave us one (grace until then).
  if (currentPeriodEnd && new Date(currentPeriodEnd).getTime() < now.getTime()) return false;
  return true;
}

// ---- Patient -------------------------------------------------------------

export interface PatientBilling {
  trialEndsAt?: string | null;
  subStatus?: string | null;
  subCurrentPeriodEnd?: string | null;
}

export interface PatientCapabilities {
  /** Browse/prescribe from the full library, not just kiné-assigned exercises. */
  selfServiceLibrary: boolean;
  /** The program adapting (stage held/advanced) from the patient's post-session
   *  feedback — see lib/exercise/stageProgress.ts. Per-exercise adaptation was
   *  removed; this flag now describes only the stage-level brake. */
  adaptationEngine: boolean;
}

export interface PatientAccess {
  level: PatientLevel;
  capabilities: PatientCapabilities;
}

/** Whole days left in the patient trial (0 if none / already ended). */
export function trialDaysLeft(trialEndsAt: string | null | undefined, now: Date = new Date()): number {
  if (!trialEndsAt) return 0;
  const ms = new Date(trialEndsAt).getTime() - now.getTime();
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

export function patientAccess(b: PatientBilling, now: Date = new Date()): PatientAccess {
  const paid = isSubscriptionActive(b.subStatus, b.subCurrentPeriodEnd, now);
  const inTrial = !!b.trialEndsAt && new Date(b.trialEndsAt).getTime() > now.getTime();
  const level: PatientLevel = paid ? "premium" : inTrial ? "trial" : "free";
  const full = level !== "free"; // trial and premium both unlock the full experience
  return {
    level,
    capabilities: {
      selfServiceLibrary: full,
      adaptationEngine: full,
    },
  };
}

// ---- Patient : porte « offre active » -----------------------------------------

export interface TierBilling extends PatientBilling {
  /** subscriptions.plan — une des trois offres, ou une clé historique. */
  subPlan?: string | null;
}

/**
 * Le patient a-t-il le droit d'entrer dans l'app (au-delà de l'onboarding) ?
 * Vrai si une des trois offres est active — `trialing` compte : c'est l'essai
 * gratuit de 7 jours de Stripe — OU, grandfathering (spec §7), si l'ancien
 * abonnement `patient_monthly` est actif ou si l'ancien essai « maison »
 * (patients.trial_ends_at) court encore. Sinon → /patient/abonnement.
 */
export function hasActiveTier(b: TierBilling, now: Date = new Date()): boolean {
  const paid = isSubscriptionActive(b.subStatus, b.subCurrentPeriodEnd, now);
  if (paid && (isTierKey(b.subPlan) || b.subPlan === "patient_monthly")) return true;
  return !!b.trialEndsAt && new Date(b.trialEndsAt).getTime() > now.getTime();
}

// ---- Instructor (kiné) ---------------------------------------------------

export interface InstructorBilling {
  /** Has the kiné set his own monthly patient price? That's what "opted in"
   *  to the new pricing model means now — there's no separate subscription
   *  to check anymore. */
  hasPatientPricing: boolean;
}

export interface InstructorCapabilities {
  /** Stage-level adaptation detail surfaced in the dashboard (see
   *  PatientCapabilities.adaptationEngine — per-exercise adaptation was removed). */
  adaptationDetail: boolean;
  /** Advanced roster dashboards (flagged-first, trend charts). */
  advancedDashboards: boolean;
}

export interface InstructorAccess {
  level: InstructorLevel;
  capabilities: InstructorCapabilities;
}

export function instructorAccess(b: InstructorBilling): InstructorAccess {
  const pro = b.hasPatientPricing;
  return {
    level: pro ? "pro" : "free",
    capabilities: {
      adaptationDetail: pro,
      advancedDashboards: pro,
    },
  };
}
