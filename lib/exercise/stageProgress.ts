// =============================================================================
// Stage progression over time — the suggested phase advances automatically as
// weeks pass since the patient last declared their situation.
// =============================================================================

import type { InjuryStage } from "@/lib/exercise/prescription";

/** Week (since injury) at which each stage begins. */
export const STAGE_START_WEEK: Record<InjuryStage, number> = {
  acute: 0,
  subacute: 1,
  recovery: 2,
  return_to_sport: 4,
};

/** Map a "week since injury" to the corresponding stage. */
export function stageFromWeek(week: number): InjuryStage {
  if (week < 1) return "acute";
  if (week < 2) return "subacute";
  if (week < 4) return "recovery";
  return "return_to_sport";
}

/** Whole weeks elapsed since an ISO timestamp. */
export function weeksSince(referenceISO: string | null | undefined, now: Date = new Date()): number {
  if (!referenceISO) return 0;
  const ref = new Date(referenceISO);
  if (Number.isNaN(ref.getTime())) return 0;
  return Math.max(0, Math.floor((now.getTime() - ref.getTime()) / (7 * 24 * 3600 * 1000)));
}

/**
 * Current stage = the declared stage advanced by the time elapsed since it was
 * declared. `referenceISO` is when the patient last set their situation.
 */
export function currentStage(
  declared: InjuryStage,
  referenceISO: string | null | undefined,
  now: Date = new Date(),
): InjuryStage {
  const startWeek = STAGE_START_WEEK[declared] ?? 0;
  return stageFromWeek(startWeek + weeksSince(referenceISO, now));
}

/** Current week of rehab (for display: "semaine N"). */
export function careWeek(
  declared: InjuryStage,
  referenceISO: string | null | undefined,
  now: Date = new Date(),
): number {
  return (STAGE_START_WEEK[declared] ?? 0) + weeksSince(referenceISO, now);
}

// =============================================================================
// Feedback brake — the calendar alone must not decide that a patient is ready
// for the next phase. When recent pain or difficulty says otherwise, hold them
// back.
//
// SAFETY RULE, and the reason this function exists: the brake is ONE-WAY. It can
// only keep a patient in an earlier, gentler stage than the calendar suggests —
// never push them into a later one. So if the instructor is too busy to react,
// the worst the app can do on its own is slow someone down, never hurt them.
// Advancing beyond the calendar always stays a human decision.
// =============================================================================

/** Stages from gentlest to most demanding. */
const STAGE_ORDER: InjuryStage[] = ["acute", "subacute", "recovery", "return_to_sport"];

/** One self-reported rating on a 1-10 scale, with when it was given. */
export interface Rating {
  value: number;
  /** ISO timestamp (created_at). Used to let a bad episode age out gradually. */
  at: string;
}

/** Recent self-reported signals. Order is irrelevant. Empty arrays are fine. */
export interface ProgressSignals {
  /** pain_score from patient_feedback. */
  painScores: Rating[];
  /** difficulty from exercise_feedback / patient_feedback. */
  difficulties: Rating[];
}

export interface StageDecision {
  /** The stage the patient should actually be treated as being in. */
  stage: InjuryStage;
  /** True when feedback pulled them back from the calendar's suggestion. */
  held: boolean;
  /**
   * True when the signals warrant the instructor's attention — even if no brake
   * could be applied (a patient already at their declared stage cannot be held
   * back further, yet high pain still matters). Drives the dashboard alert.
   */
  concerning: boolean;
  /** Short French explanation, safe to show to the instructor. */
  reason: string;
}

// Below this many ratings we don't trust the signal — one bad day must not
// freeze someone's rehabilitation for a week.
const MIN_SAMPLES = 2;

// "Concerning" → hold one stage back. "Severe" → drop all the way to the stage
// the patient themselves declared, and go no further until things improve.
const PAIN_HOLD = 6;
const PAIN_STOP = 8;
const DIFF_HOLD = 8; // matches TOO_HARD in adaptation.ts
const DIFF_STOP = 9;

/** Only ratings that really sit on the 1-10 scale. */
const onScale = (ratings: Rating[]) =>
  ratings.filter((r) => Number.isFinite(r.value) && r.value >= 1 && r.value <= 10);

/** Mean of the ratings that are actually on the 1-10 scale; null when none are. */
function mean(ratings: Rating[]): number | null {
  const valid = onScale(ratings);
  if (valid.length === 0) return null;
  return valid.reduce((s, r) => s + r.value, 0) / valid.length;
}

/**
 * Whole weeks since the most recent rating at or above `threshold`.
 * `Infinity` when no such rating exists — nothing to recover from.
 */
function weeksSinceLastAtLeast(ratings: Rating[], threshold: number, now: Date): number {
  const bad = onScale(ratings).filter((r) => r.value >= threshold);
  if (bad.length === 0) return Infinity;
  return Math.min(...bad.map((r) => weeksSince(r.at, now)));
}

export interface SignalAssessment {
  /** Enough ratings, and they warrant the instructor's attention. */
  concerning: boolean;
  /** Worse than concerning: hold the patient at their declared stage. */
  severe: boolean;
  /** French phrase naming the cause, e.g. "douleur élevée (7.5/10)". Empty when calm. */
  cause: string;
}

/**
 * Judge a patient's recent signals on their own, independently of any stage.
 * Shared by the patient's own screen (to brake progression) and the instructor
 * dashboard (to raise an alert), so the two can never disagree about who is in
 * trouble.
 */
export function assessSignals(signals: ProgressSignals): SignalAssessment {
  const avgPain = mean(signals.painScores);
  const avgDiff = mean(signals.difficulties);
  const samples = onScale(signals.painScores).length + onScale(signals.difficulties).length;

  // No opinion without evidence: absence of feedback never penalises a patient.
  if (samples < MIN_SAMPLES) return { concerning: false, severe: false, cause: "" };

  const severe = (avgPain !== null && avgPain >= PAIN_STOP) || (avgDiff !== null && avgDiff >= DIFF_STOP);
  const concerning = (avgPain !== null && avgPain >= PAIN_HOLD) || (avgDiff !== null && avgDiff >= DIFF_HOLD);
  if (!concerning) return { concerning: false, severe: false, cause: "" };

  const round = (n: number) => Math.round(n * 10) / 10;
  const cause =
    avgPain !== null && avgPain >= PAIN_HOLD
      ? `douleur élevée (${round(avgPain)}/10)`
      : `exercices trop difficiles (${round(avgDiff ?? 0)}/10)`;
  return { concerning, severe, cause };
}

/**
 * The calendar's stage, braked by how the patient actually feels.
 *
 * Never returns a stage later than `currentStage()` would, and never one earlier
 * than what the patient declared — the brake slows progression, it does not send
 * anyone backwards.
 */
export function stageWithFeedback(
  declared: InjuryStage,
  referenceISO: string | null | undefined,
  signals: ProgressSignals,
  now: Date = new Date(),
): StageDecision {
  const timeStage = currentStage(declared, referenceISO, now);
  const timeIdx = STAGE_ORDER.indexOf(timeStage);
  const declaredIdx = STAGE_ORDER.indexOf(declared);

  const { concerning, severe, cause } = assessSignals(signals);
  const samples = onScale(signals.painScores).length + onScale(signals.difficulties).length;

  let idx = timeIdx;
  if (severe) idx = declaredIdx;
  else if (concerning) idx = timeIdx - 1;

  // Graduated return. Releasing the brake all at once would throw a patient who
  // was in real pain last week straight back into the hardest phase. Instead the
  // ceiling lifts by one stage per week elapsed since their last bad rating, so
  // they climb back gradually. This also kills the flip-flop around the mean
  // threshold: what matters is when a bad rating was given, not whether today's
  // average landed on 5.9 or 6.0.
  if (samples >= MIN_SAMPLES) {
    const weeksSinceSevere = Math.min(
      weeksSinceLastAtLeast(signals.painScores, PAIN_STOP, now),
      weeksSinceLastAtLeast(signals.difficulties, DIFF_STOP, now),
    );
    const weeksSinceConcerning = Math.min(
      weeksSinceLastAtLeast(signals.painScores, PAIN_HOLD, now),
      weeksSinceLastAtLeast(signals.difficulties, DIFF_HOLD, now),
    );
    // A severe episode sends them back to their declared stage, and they climb
    // from there. A merely concerning one only costs a single stage.
    idx = Math.min(idx, declaredIdx + weeksSinceSevere, timeIdx - 1 + weeksSinceConcerning);
  }

  // Clamp between what they declared and what the calendar allows. This is what
  // makes the brake one-way, whatever the thresholds above ever become.
  idx = Math.max(declaredIdx, Math.min(timeIdx, idx));

  const stage = STAGE_ORDER[idx];
  const held = idx < timeIdx;

  if (!concerning) {
    // Not in trouble any more, but not yet back to the calendar: they are on the
    // way up. Say so, rather than pretending nothing happened.
    return held
      ? { stage, held, concerning: false, reason: "remontée progressive après une période difficile" }
      : { stage, held, concerning: false, reason: "progression normale" };
  }

  // A patient already at their declared stage cannot be braked any further, but
  // the instructor must still be told — silence here would read as "all fine".
  if (!held) return { stage, held: false, concerning: true, reason: `à surveiller — ${cause}` };

  return {
    stage,
    held: true,
    concerning: true,
    reason: severe ? `maintien en phase actuelle — ${cause}` : `progression ralentie — ${cause}`,
  };
}
