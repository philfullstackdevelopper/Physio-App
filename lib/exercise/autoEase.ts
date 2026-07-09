// =============================================================================
// Automatic easing — the last link of the feedback loop.
//
// The stage brake already slows a struggling patient down. The instructor can
// already apply a suggestion by hand. What was missing: when the instructor has
// no time to react, the patient's own program must still soften on its own.
//
// SAFETY RULE, third and last statement of the same principle:
// this function calls the very same adaptation engine the instructor sees, but
// it acts on ONLY HALF of its verdict. `direction: "easier"` is applied.
// `direction: "harder"` is deliberately discarded — raising a patient's load
// without a human looking is exactly what must never happen. And the result is
// clamped below the incoming target, so the thresholds in adaptation.ts can be
// retuned freely without this ever becoming able to add a repetition.
// =============================================================================

import { suggestAdaptation, aggregateDifficulty } from "@/lib/exercise/adaptation";

/** Ratings below this count are noise: one hard day must not rewrite a program. */
const MIN_SAMPLES = 2;

export interface EasedTarget {
  /** Reps the patient should actually be asked for. */
  goalReps: number;
  /** True when recent feedback pulled the target down. */
  eased: boolean;
  /** French phrase naming the cause; empty when nothing was changed. */
  reason: string;
}

/**
 * Soften a rep target in light of how hard the patient recently found this
 * exercise. `target` is what they would otherwise do — the standard prescription
 * already adjusted by any instructor override.
 *
 * Returns `target` untouched when there is too little evidence, or when the
 * engine would have made things harder.
 */
export function autoEaseGoalReps(target: number, difficulties: number[]): EasedTarget {
  const unchanged: EasedTarget = { goalReps: target, eased: false, reason: "" };

  const valid = difficulties.filter((d) => Number.isFinite(d) && d >= 1 && d <= 10);
  if (valid.length < MIN_SAMPLES) return unchanged;

  const avg = aggregateDifficulty(valid);
  const suggestion = suggestAdaptation({ difficulty: avg, goalReps: target });

  // Only ever act on "easier". "harder" needs a human — see the rule above.
  if (suggestion.direction !== "easier" || suggestion.newReps == null) return unchanged;

  // Belt and braces: never hand back more than we were given.
  const goalReps = Math.min(target, suggestion.newReps);
  if (goalReps >= target) return unchanged;

  return { goalReps, eased: true, reason: `exercice jugé difficile (${avg}/10)` };
}
