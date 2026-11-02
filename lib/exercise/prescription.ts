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

/** Bas de la fourchette affichée au patient : « 3 séries de 8 à 12
 *  répétitions », selon l'aisance de chacun (Philippe, 2026-11-02 : « 3 sets
 *  of 8-12 depending on how easy the movement is »). */
export const FIXED_GOAL_REPS_MIN = 8;

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

/** Objectif lu dans la consigne : durée d'endurance (« 10 minutes », migration
 *  0060) ou temps de maintien (« tenez 30 secondes », « 20 à 30 secondes »). */
function goalFromInstructions(instructions: string | null): { minutes: string } | { seconds: string } | null {
  const min = instructions?.match(/(\d+)\s*minutes?\b/i);
  if (min) return { minutes: min[1] };
  const sec = instructions?.match(/(\d+(?:\s*à\s*\d+)?)\s*secondes?\b/i);
  if (sec) return { seconds: sec[1].replace(/\s+/g, " ") };
  return null;
}

/**
 * Texte « Objectif » d'un exercice dans la séance du patient.
 *
 * Exercice en répétitions : « 3 séries de 8 à 12 répétitions », le patient
 * choisit dans la fourchette selon son aisance (Philippe, 2026-11-02).
 * Endurance (vélo, marche…) : « N minutes », lu dans la consigne (2026-10-01,
 * migration 0060). Maintien (gainage, étirement) : « 3 × N secondes ».
 */
export function goalTextFor(
  instructions: string | null,
  p: Pick<Prescription, "goalSets" | "goalReps">,
  dose?: ExerciseDose | null,
): string {
  const g = goalPartsFor(instructions, dose, p.goalSets);
  if (g.kind === "duration") return `${g.minutes} minute${Number(g.minutes) > 1 ? "s" : ""}`;
  if (g.kind === "hold") return `${g.sets} × ${g.seconds.replace("-", " à ")} secondes`;
  const reps = g.reps === `${FIXED_GOAL_REPS_MIN}-${FIXED_GOAL_REPS}` ? `${FIXED_GOAL_REPS_MIN} à ${p.goalReps}` : g.reps;
  return `${g.sets} séries de ${reps} répétitions`;
}

/** Dose choisie par le kiné pour un exercice d'une séance (migration 0080) :
 *  séries, répétitions, maintien. Vide = la règle habituelle. */
export interface ExerciseDose {
  sets?: number | null;
  reps?: number | null;
  holdSeconds?: number | null;
}

/** Objectif découpé pour l'affichage en badges dans la séance guidée. */
export type GoalParts =
  | { kind: "reps"; sets: number; reps: string }
  | { kind: "hold"; sets: number; seconds: string }
  | { kind: "duration"; minutes: string };

/** La dose du kiné l'emporte ; sinon la consigne (durée, maintien), sinon
 *  3 séries de 8 à 12. Une durée d'endurance (« 10 minutes ») reste une durée. */
export function goalPartsFor(instructions: string | null, dose?: ExerciseDose | null, defaultSets = FIXED_GOAL_SETS): GoalParts {
  const g = goalFromInstructions(instructions);
  const sets = dose?.sets ?? defaultSets;
  if (dose?.holdSeconds) return { kind: "hold", sets, seconds: String(dose.holdSeconds) };
  if (g && "minutes" in g) return { kind: "duration", minutes: g.minutes };
  if (g && "seconds" in g && !dose?.reps) return { kind: "hold", sets, seconds: g.seconds.replace(" à ", "-") };
  return { kind: "reps", sets, reps: dose?.reps ? String(dose.reps) : `${FIXED_GOAL_REPS_MIN}-${FIXED_GOAL_REPS}` };
}

/** Version courte pour les tuiles d'exercice : « 3 × 8-12 rép. », « 10 min », « 3 × 30 s ». */
export function goalShortFor(instructions: string | null, dose?: ExerciseDose | null): string {
  const g = goalPartsFor(instructions, dose);
  if (g.kind === "duration") return `${g.minutes} min`;
  if (g.kind === "hold") return `${g.sets} × ${g.seconds} s`;
  return `${g.sets} × ${g.reps} rép.`;
}

/** Lit une dose depuis une ligne workout_exercises (colonnes de 0080). */
export function doseFromRow(row: { sets?: number | null; reps?: number | null; hold_seconds?: number | null } | null | undefined): ExerciseDose | null {
  if (!row || (row.sets == null && row.reps == null && row.hold_seconds == null)) return null;
  return { sets: row.sets ?? null, reps: row.reps ?? null, holdSeconds: row.hold_seconds ?? null };
}
