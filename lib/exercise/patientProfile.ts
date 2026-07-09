// =============================================================================
// Patient profile helpers — bridge `patient_profiles` (DB) ⇄ PatientContext.
// Pure functions (no DB import) so they're safe to use on server or client.
// =============================================================================

import type {
  ActivityLevel,
  InjuryStage,
  PatientContext,
} from "@/lib/exercise/prescription";

export interface ProfileRow {
  date_of_birth: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  activity_level: ActivityLevel | null;
  condition_id: string | null;
  injury_stage: InjuryStage | null;
}

/** Compute age in whole years from an ISO date string. */
export function ageFromDob(dob: string | null): number | undefined {
  if (!dob) return undefined;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return undefined;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
  return age >= 0 ? age : undefined;
}

/**
 * A profile is "complete" once we know the patient's situation (condition +
 * stage) and physical profile — everything needed to suggest and tailor a session.
 */
export function isProfileComplete(p: ProfileRow | null | undefined): boolean {
  return Boolean(
    p &&
      p.condition_id &&
      p.injury_stage &&
      p.date_of_birth &&
      p.height_cm &&
      p.weight_kg &&
      p.activity_level,
  );
}

/** Map a stored profile row into the context the prescription engine expects. */
export function profileToContext(p: ProfileRow): PatientContext {
  return {
    ageYears: ageFromDob(p.date_of_birth),
    heightCm: p.height_cm ?? undefined,
    weightKg: p.weight_kg ?? undefined,
    activityLevel: p.activity_level ?? undefined,
    stage: p.injury_stage ?? undefined,
  };
}
