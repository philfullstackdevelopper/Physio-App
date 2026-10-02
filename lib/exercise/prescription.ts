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

/** Libellé court pour les badges (le libellé complet va dans `title`). */
export const STAGE_SHORT: Record<InjuryStage, string> = {
  acute: "Phase 1",
  subacute: "Phase 2",
  recovery: "Phase 3",
  return_to_sport: "Phase 4",
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

/** Every exercise, every patient: three sets. */
export const FIXED_GOAL_SETS = 3;

/** Every exercise, every patient: twelve reps per set — 3 × 12 is the staple
 *  (Philippe, 2026-10-01 : « leave 3x12 as the staple, let's not
 *  overcomplicate things »). The reps used to vary automatically with
 *  activity, age and phase (6 in phase 1, 8 for 65+…); a kiné-chosen gentler
 *  mode (3 × 8) was discussed but deliberately not built for now. */
export const FIXED_GOAL_REPS = 12;

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
 * - Sets × reps are fixed (FIXED_GOAL_SETS × FIXED_GOAL_REPS) for everyone.
 * - Age eases the required depth (older patients → gentler).
 * - Height is intentionally NOT used for the depth threshold: a knee ANGLE is
 *   independent of body size, so height changes absolute range of motion, not
 *   the target angle. (It could later inform absolute-height metrics.)
 */
export function recommendPrescription(
  patient: PatientContext,
  base: Prescription = DEFAULT_SQUAT,
): Prescription {
  let goodDepth = base.goodDepth;

  const age = patient.ageYears;
  if (age !== undefined) {
    if (age >= 65) {
      goodDepth = 100; // gentler depth
    } else if (age >= 50) {
      goodDepth = 90;
    }
  }

  // Recovery stage has the strongest effect on depth: early stages stay
  // gentle, later stages allow deeper work.
  switch (patient.stage) {
    case "acute":
      goodDepth = Math.max(goodDepth, 120); // shallow, protective
      break;
    case "subacute":
      goodDepth = Math.max(goodDepth, 100);
      break;
    case "return_to_sport":
      goodDepth = Math.min(goodDepth, 70); // full depth
      break;
    // "recovery" (or undefined) → keep the age-based depth.
  }

  // Sets and reps are fixed for every exercise and every patient, by product
  // decision: one predictable session shape (3 × 12).
  return { ...base, goalReps: FIXED_GOAL_REPS, goalSets: FIXED_GOAL_SETS, goodDepth };
}

/**
 * Texte « Objectif » d'un exercice dans la séance du patient.
 *
 * 3 × 12 partout, sauf l'endurance (vélo, marche…) : là on fixe simplement un
 * nombre de minutes, écrit dans la consigne de l'exercice (Philippe,
 * 2026-10-01 ; migration 0060). Si la consigne contient « N minutes »,
 * l'objectif devient « N minutes » au lieu de « 3 séries × 12 répétitions ».
 */
export function goalTextFor(instructions: string | null, p: Pick<Prescription, "goalSets" | "goalReps">): string {
  const m = instructions?.match(/(\d+)\s*minutes?\b/i);
  if (m) return `${m[1]} minute${Number(m[1]) > 1 ? "s" : ""}`;
  return `${p.goalSets} séries × ${p.goalReps} répétitions`;
}
