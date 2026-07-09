// =============================================================================
// In-session intensity control — the patient's own "this is too hard / too easy"
// dial, applied live to reps, sets and rest.
//
// This is the ONE place in the app where load can go UP without an instructor.
// It is deliberately a HUMAN acting on themselves, in the moment, on their own
// body — not the software deciding. It is nonetheless bounded: at most +40% reps
// and one extra set, and the choice is a session-local preference, never written
// back into the patient's prescription. Tomorrow's session starts from what the
// practitioner prescribed, not from what the patient felt like on Tuesday.
//
// Compare with autoEase.ts, which the SOFTWARE runs, and which can only lower.
// =============================================================================

import type { Prescription, PatientContext, InjuryStage, ActivityLevel } from "@/lib/exercise/prescription";

export const MIN_LEVEL = -2;
export const MAX_LEVEL = 2;

/**
 * Ceiling to assume when nothing is known about the patient. Matches
 * maxLevelFor({}) — an unknown profile is treated as the middle case, never as
 * the permissive one. Callers that have a profile should pass maxLevelFor(ctx).
 */
export const DEFAULT_MAX_LEVEL = 1;

// ---------------------------------------------------------------------------
// How far UP a given patient may push. Easing is never capped — anyone may go
// all the way down to MIN_LEVEL, always.
//
// Each factor sets its own ceiling and we keep the LOWEST. A 30-year-old athlete
// in the acute phase of an injury is still in the acute phase: youth does not buy
// permission to load an inflamed joint. Missing information is treated as the
// middle case, never the permissive one.
// ---------------------------------------------------------------------------

/** An inflamed or barely-healed injury does not get intensified, at any age. */
const STAGE_CEILING: Record<InjuryStage, number> = {
  acute: 0,
  subacute: 0,
  recovery: 1,
  return_to_sport: 2,
};

/** Tissue tolerance and recovery capacity fall with age. */
const ageCeiling = (age: number | undefined) => {
  if (age === undefined) return 1;
  if (age >= 65) return 0;
  if (age >= 50) return 1;
  return 2;
};

/** A deconditioned patient overestimates what they can absorb. */
const ACTIVITY_CEILING: Record<ActivityLevel, number> = {
  sedentary: 0,
  moderate: 1,
  active: 2,
};

/**
 * The highest intensity level this patient is allowed to select, 0..MAX_LEVEL.
 * 0 means "may only ease, never intensify".
 */
export function maxLevelFor(ctx: PatientContext): number {
  const byStage = ctx.stage ? STAGE_CEILING[ctx.stage] : 1;
  const byActivity = ctx.activityLevel ? ACTIVITY_CEILING[ctx.activityLevel] : 1;
  const ceiling = Math.min(byStage, ageCeiling(ctx.ageYears), byActivity);
  return Math.max(0, Math.min(MAX_LEVEL, ceiling));
}

// The dial moves repetitions and rest only. The number of sets is fixed at three
// for every exercise (FIXED_GOAL_SETS), so the shape of a session never changes —
// only how much work each set holds.
interface Step {
  repFactor: number;
  restFactor: number;
  label: string;
}

const STEPS: Record<number, Step> = {
  [-2]: { repFactor: 0.6, restFactor: 1.5, label: "Beaucoup plus doux" },
  [-1]: { repFactor: 0.8, restFactor: 1.25, label: "Plus doux" },
  [0]: { repFactor: 1, restFactor: 1, label: "Prescription du praticien" },
  [1]: { repFactor: 1.2, restFactor: 0.85, label: "Plus intense" },
  [2]: { repFactor: 1.4, restFactor: 0.75, label: "Beaucoup plus intense" },
};

/**
 * Clamp a level into what this patient may actually select. `maxLevel` comes from
 * maxLevelFor(); the floor is always MIN_LEVEL, because easing is never denied.
 */
export const clampLevel = (level: number, maxLevel: number = MAX_LEVEL) =>
  Math.max(MIN_LEVEL, Math.min(MAX_LEVEL, maxLevel, Math.round(level)));

/** Human-readable name of the current setting. */
export const levelLabel = (level: number) => STEPS[clampLevel(level)].label;

/** The prescription this session runs under, at the chosen level. Sets untouched. */
export function adjustForLevel(base: Prescription, level: number): Prescription {
  const step = STEPS[clampLevel(level)];
  return {
    ...base,
    goalReps: Math.max(1, Math.round(base.goalReps * step.repFactor)),
  };
}

/** Rest between sets, stretched when easing and shortened when pushing. */
export function adjustRest(baseSeconds: number, level: number): number {
  const step = STEPS[clampLevel(level)];
  return Math.max(10, Math.min(90, Math.round(baseSeconds * step.restFactor)));
}
