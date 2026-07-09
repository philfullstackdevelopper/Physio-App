// =============================================================================
// Access tiers — pure logic (no DB, no framework). Given a user's billing state,
// compute their effective level and which features are unlocked. Reused on the
// server (page gating) and to inform the UI. All feature gating should go
// through this so the rules live in ONE place.
//
// Business model (see CLAUDE.md / the build brief):
//   PATIENT:  free floor  ->  2-month trial (full)  ->  premium €10/mo (full)
//   KINÉ:     free         ->  Pro €30/mo
// Physio-App fees are flat and never tied to a kiné's télésoin billing volume.
// =============================================================================

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
  /** The adaptive-suggestion engine surfaced in the patient UI. */
  adaptationEngine: boolean;
  /** Precision camera-AI (form/depth/hold quality), not just rep counting. */
  precisionCameraAI: boolean;
  /** Distance booking + join a live télésoin video call. */
  bookingVisio: boolean;
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
      precisionCameraAI: full, // may ALSO be granted by the kiné's Pro tier — see patientPrecisionAI()
      bookingVisio: full,
    },
  };
}

// ---- Instructor (kiné) ---------------------------------------------------

export interface InstructorBilling {
  subStatus?: string | null;
  subCurrentPeriodEnd?: string | null;
}

export interface InstructorCapabilities {
  /** Full camera-AI precision for the kiné's patients (reliable exercises). */
  precisionCameraAI: boolean;
  /** Adaptation-suggestion engine surfaced in full detail in the dashboard. */
  adaptationDetail: boolean;
  /** The télésoin review workflow (brief → live call → program update). */
  telesoinWorkflow: boolean;
  /** Advanced roster dashboards (flagged-first, trend charts). */
  advancedDashboards: boolean;
}

export interface InstructorAccess {
  level: InstructorLevel;
  capabilities: InstructorCapabilities;
}

export function instructorAccess(b: InstructorBilling, now: Date = new Date()): InstructorAccess {
  const pro = isSubscriptionActive(b.subStatus, b.subCurrentPeriodEnd, now);
  return {
    level: pro ? "pro" : "free",
    capabilities: {
      precisionCameraAI: pro,
      adaptationDetail: pro,
      telesoinWorkflow: pro,
      advancedDashboards: pro,
    },
  };
}

/**
 * Whether a patient may use precision camera-AI on a given exercise. Granted if
 * the patient is on trial/premium OR their kiné is on the Pro tier (Level 2
 * enables it across the kiné's patients). The exercise must also be tagged as
 * camera-AI-reliable — that check lives with the exercise, not here.
 */
export function patientPrecisionAI(patient: PatientAccess, kineIsPro: boolean): boolean {
  return patient.capabilities.precisionCameraAI || kineIsPro;
}
