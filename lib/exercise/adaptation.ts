// =============================================================================
// Adaptation engine — turns a patient's "ressenti" (difficulty 1-10) on an
// exercise into a NON-BINDING suggestion: adjust the intensity first, and only
// when the rating is extreme, propose substituting a comparable exercise.
//
// Pure and framework-free on purpose, so it is trivial to test and can be reused
// by both the patient screen (single latest rating) and the instructor screen
// (average of recent ratings). It never changes any program itself.
// =============================================================================

export type AdaptationDirection = "easier" | "harder" | "none";

export interface AdaptationSuggestion {
  direction: AdaptationDirection;
  /** Short French reason, e.g. "trop difficile (8/10)". */
  reason: string;
  /** Current rep target, echoed for display. */
  currentReps?: number;
  /** Suggested new rep target (intensity change), if it differs from current. */
  newReps?: number;
  /** Suggested alternative exercise name (same body area), if one is available. */
  substitute?: string;
}

export interface AdaptationInput {
  /** Aggregated difficulty rating, 1 (very easy) – 10 (very hard). */
  difficulty: number;
  /** Current rep target for the exercise. */
  goalReps: number;
  /**
   * Candidate alternative exercise names for the SAME body area, ordered from
   * gentler to harder when that is known. Used only for the substitution step.
   */
  candidates?: string[];
}

// Thresholds — kept here so they are easy to tune in one place.
const TOO_HARD = 8;
const TOO_EASY = 3;
const VERY_HARD = 9; // at/above this, also propose an easier substitute
const VERY_EASY = 2; // at/below this, also propose a harder substitute

/** Round the average of several ratings to a single 1-10 value (0 if none). */
export function aggregateDifficulty(ratings: number[]): number {
  const valid = ratings.filter((r) => typeof r === "number" && r >= 1 && r <= 10);
  if (valid.length === 0) return 0;
  return Math.round(valid.reduce((s, r) => s + r, 0) / valid.length);
}

export function suggestAdaptation({
  difficulty,
  goalReps,
  candidates = [],
}: AdaptationInput): AdaptationSuggestion {
  if (difficulty >= TOO_HARD) {
    const newReps = Math.max(1, Math.round(goalReps * 0.75)); // ~25% fewer reps
    return {
      direction: "easier",
      reason: `trop difficile (${difficulty}/10)`,
      currentReps: goalReps,
      newReps: newReps < goalReps ? newReps : undefined,
      // Escalate to a substitute only when it's really hard (gentlest candidate).
      substitute: difficulty >= VERY_HARD && candidates.length ? candidates[0] : undefined,
    };
  }
  if (difficulty <= TOO_EASY) {
    const newReps = Math.round(goalReps * 1.25); // ~25% more reps
    return {
      direction: "harder",
      reason: `trop facile (${difficulty}/10)`,
      currentReps: goalReps,
      newReps: newReps > goalReps ? newReps : undefined,
      // Escalate to a substitute only when it's really easy (hardest candidate).
      substitute:
        difficulty <= VERY_EASY && candidates.length ? candidates[candidates.length - 1] : undefined,
    };
  }
  return { direction: "none", reason: `bien calibré (${difficulty}/10)` };
}
