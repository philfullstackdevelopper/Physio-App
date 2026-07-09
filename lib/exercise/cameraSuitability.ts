// =============================================================================
// Camera-AI suitability — what may we honestly claim the webcam measures, for
// a given exercise?
//
// Pose tracking is well validated on standing, large-range-of-motion, front
// facing movements, and unreliable on lying / seated / small-ROM / isometric
// ones — which are exactly the ones early-stage rehab is full of. Promising
// "the camera checks your form" across the whole library would be a false
// claim, bad for patient trust and for the practitioner's liability.
//
// WHY THIS IS DERIVED AND NOT A DATABASE COLUMN
// The build brief asks for a suitability flag stored per exercise. A stored flag
// can drift: someone tags an exercise "reliable" while its analyzer is a
// metronome that measures nothing at all, and the UI then lies. The analyzer
// already *is* the ground truth — it is the code that does or does not compute a
// joint angle. So we derive the flag from it, and the two can never disagree.
// If a per-exercise override is ever needed, add a column that narrows this
// result, never one that widens it.
// =============================================================================

import { analyzerForExercise } from "@/lib/exercise/analyzers";

export type CameraSuitability =
  /** A joint angle is measured: reps AND form/depth quality can be judged. */
  | "form"
  /** Movement is detected: reps can be counted, form cannot be judged. */
  | "count"
  /** The camera is only a mirror: nothing is measured. */
  | "none";

/**
 * What the camera can honestly report for this exercise.
 *
 * Read straight off the analyzer:
 *  - "reps"   → measures a joint angle against a depth target      → form
 *  - "hold"   → form only when it carries an `alignment` body-line check,
 *               otherwise it merely times a position                → form / count
 *  - "auto"   → counts oscillations, and says so: "does not judge form" → count
 *  - "manual" → the patient counts                                 → none
 *  - "paced"  → a metronome adds the reps                          → none
 */
export function suitabilityFor(exerciseName: string): CameraSuitability {
  const analyzer = analyzerForExercise(exerciseName);
  switch (analyzer.kind) {
    case "reps":
      return "form";
    case "hold":
      return analyzer.alignment ? "form" : "count";
    case "auto":
      return "count";
    case "manual":
    case "paced":
      return "none";
  }
}

/** True only where a form/depth quality claim is defensible. */
export const canJudgeForm = (exerciseName: string) => suitabilityFor(exerciseName) === "form";

/** Short French label, for the practitioner's library view. */
export const SUITABILITY_LABEL: Record<CameraSuitability, string> = {
  form: "Caméra : posture vérifiée",
  count: "Caméra : comptage seul",
  none: "Sans analyse caméra",
};

/**
 * Landmark visibility required before the app is allowed to make a claim.
 *
 * `TRACK` is enough to follow the movement and count a repetition. Asserting
 * that the form is *good* demands more: a false "bonne profondeur 👍" is worse
 * than no feedback at all, because the patient trusts it and grooves the wrong
 * pattern. Between the two thresholds we count the reps and say plainly that we
 * could not check the position.
 */
export const MIN_VIS_TRACK = 0.5;
export const MIN_VIS_FORM = 0.75;

/** Shown when the landmarks are visible enough to count reps, but not to judge. */
export const UNVERIFIED_FORM_CUE =
  "Position mal visible — on compte vos répétitions, fiez-vous à vos sensations.";

/** Same idea for a timed hold, where there is nothing to count. */
export const UNVERIFIED_HOLD_CUE =
  "Position mal visible — le chrono continue, fiez-vous à vos sensations.";
