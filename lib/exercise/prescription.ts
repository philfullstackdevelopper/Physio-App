// =============================================================================
// Exercise prescription — the targets the pose analyser enforces.
// -----------------------------------------------------------------------------
// A `Prescription` is set by the physiotherapist. `recommendPrescription()`
// derives sensible starting defaults from the patient's profile (age, activity)
// which the physio can then override. This would eventually be persisted per
// program (e.g. on `program_exercises`) — for now it lives in the UI.
// =============================================================================

export type ActivityLevel = "sedentary" | "moderate" | "active";

/** Recovery stage of the injury, aligned with the DB `injury_stage` values. */
export type InjuryStage = "acute" | "subacute" | "recovery" | "return_to_sport";

export const STAGE_LABELS: Record<InjuryStage, string> = {
  acute: "Phase aiguë (blessure récente, douleur)",
  subacute: "Phase subaiguë (récupération précoce)",
  recovery: "Rééducation (renforcement)",
  return_to_sport: "Retour à l'activité / au sport",
};

export interface Prescription {
  exerciseId: string;
  name: string;
  instruction: string;
  /** Target number of reps per set. */
  goalReps: number;
  /** Target number of sets. */
  goalSets: number;
  /** Knee angle (deg) that must be reached for a rep to count (lower = deeper). */
  goodDepth: number;
  /** Enter the "descending" phase below this knee angle. */
  kneeDown: number;
  /** Return to "standing" (rep evaluated) above this knee angle. */
  kneeUp: number;
  /** Torso lean from vertical (deg) beyond this = poor back posture. */
  maxLean: number;
}

/** Every exercise, every patient: three sets. Reps and depth carry the load. */
export const FIXED_GOAL_SETS = 3;

export interface PatientContext {
  ageYears?: number;
  heightCm?: number;
  weightKg?: number;
  activityLevel?: ActivityLevel;
  stage?: InjuryStage;
}

/** Baseline squat prescription for an average, moderately-active adult. */
export const DEFAULT_SQUAT: Prescription = {
  exerciseId: "squat",
  name: "Squat",
  instruction: "Descendez jusqu'à ce que vos cuisses soient parallèles au sol, dos droit.",
  goalReps: 12,
  goalSets: 3,
  goodDepth: 70,
  kneeDown: 120,
  kneeUp: 155,
  maxLean: 35,
};

/**
 * Derive a starting prescription from patient attributes. Physio can override.
 *
 * - Activity drives rep volume (sedentary → fewer, active → more).
 * - Age eases both volume and required depth (older patients → gentler).
 * - Height is intentionally NOT used for the depth threshold: a knee ANGLE is
 *   independent of body size, so height changes absolute range of motion, not
 *   the target angle. (It could later inform absolute-height metrics.)
 */
export function recommendPrescription(
  patient: PatientContext,
  base: Prescription = DEFAULT_SQUAT,
): Prescription {
  const activity = patient.activityLevel ?? "moderate";
  let goalReps = activity === "sedentary" ? 8 : activity === "active" ? 15 : base.goalReps;
  let goodDepth = base.goodDepth;

  const age = patient.ageYears;
  if (age !== undefined) {
    if (age >= 65) {
      goalReps = Math.min(goalReps, 8);
      goodDepth = 100; // gentler depth
    } else if (age >= 50) {
      goalReps = Math.min(goalReps, 10);
      goodDepth = 90;
    }
  }

  // Recovery stage has the strongest effect: early stages stay gentle,
  // later stages allow deeper, harder work.
  switch (patient.stage) {
    case "acute":
      goalReps = Math.min(goalReps, 6);
      goodDepth = Math.max(goodDepth, 120); // shallow, protective
      break;
    case "subacute":
      goalReps = Math.min(goalReps, 10);
      goodDepth = Math.max(goodDepth, 100);
      break;
    case "return_to_sport":
      goodDepth = Math.min(goodDepth, 70); // full depth
      break;
    // "recovery" (or undefined) → keep the age/activity-based values.
  }

  // Sets are fixed at 3 for every exercise and every patient, by product decision:
  // one predictable session shape. Load is modulated through reps and depth
  // instead, which the patient feels more finely than a whole extra set.
  const goalSets = FIXED_GOAL_SETS;

  return { ...base, goalReps, goalSets, goodDepth };
}
