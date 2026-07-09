// =============================================================================
// Prescription overrides — the instructor's explicit, stored decision to change
// how many reps a given patient does of a given exercise.
//
// This is the piece that turns the adaptation engine from a printed suggestion
// into an actual change to the program.
//
// SAFETY RULE, and the reason `baseReps` is stored alongside:
// an override is a snapshot of a clinical judgement made on a given day, about a
// patient who was in a given state. Easing is always safe to honour later. But a
// decision to INCREASE the load assumed the patient was doing well — and it must
// not survive the patient getting worse. So:
//
//   - "do fewer reps"  → always honoured, forever.
//   - "do more reps"   → honoured only while the standard prescription has not
//                        fallen below what it was when the instructor decided.
//
// The result: as with the stage brake, the app on its own can only ever make a
// program gentler. Making it harder needs a human, and even then the increase
// lapses the moment the patient's baseline drops.
// =============================================================================

export interface RepOverride {
  /** Reps the instructor decided on. */
  goalReps: number;
  /** What the standard prescription said at that moment. */
  baseReps: number;
}

/** Overrides for one patient, keyed by exercise name. */
export type RepOverrideMap = Record<string, RepOverride>;

/**
 * How many reps this patient should actually do, given today's standard
 * prescription and any stored decision.
 */
export function effectiveGoalReps(baseReps: number, override?: RepOverride | null): number {
  if (!override) return baseReps;

  // Easing: honour it whatever the baseline has done since.
  if (override.goalReps <= baseReps) return override.goalReps;

  // An increase, but the patient has regressed since it was decided — the
  // instructor's assumption no longer holds. Fall back to today's baseline.
  if (baseReps < override.baseReps) return baseReps;

  return override.goalReps;
}

/** True when the stored increase has lapsed because the patient regressed. */
export function isLapsedIncrease(baseReps: number, override?: RepOverride | null): boolean {
  return !!override && override.goalReps > baseReps && baseReps < override.baseReps;
}
