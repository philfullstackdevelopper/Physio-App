import { PAIN_HOLD, PAIN_STOP, DIFF_HOLD, DIFF_STOP } from "@/lib/exercise/stageProgress";

// =============================================================================
// Calendar day color — for the instructor's patient calendar. A day is grey
// (no session), or green/yellow/red depending on how the worst session that
// day felt to the patient. Reuses the exact pain/difficulty cutoffs the
// "needs attention" alert already uses (lib/exercise/stageProgress.ts), so
// this calendar's colors can never disagree with that alert.
// =============================================================================

export type DayGrade = "green" | "yellow" | "red" | "grey";

export interface SessionFeedback {
  painScore: number | null;
  difficulty: number | null;
}

/**
 * `hasSession` is false when there's no workout_logs row that day (grey,
 * regardless of feedback — there shouldn't be any). `feedback` holds every
 * patient_feedback row linked to that day's session(s); a session with no
 * feedback submitted (the recap step is skippable) counts as green, matching
 * the app's existing rule that absence of feedback never counts against a
 * patient (see assessSignals in stageProgress.ts).
 */
export function gradeDay(hasSession: boolean, feedback: SessionFeedback[]): DayGrade {
  if (!hasSession) return "grey";

  // Worst signal of the day, not the average — a kiné should see the day a
  // patient struggled even if they also logged an easy session that day.
  const pains = feedback.map((f) => f.painScore).filter((v): v is number => v != null);
  const diffs = feedback.map((f) => f.difficulty).filter((v): v is number => v != null);
  const maxPain = pains.length ? Math.max(...pains) : null;
  const maxDiff = diffs.length ? Math.max(...diffs) : null;

  if ((maxPain != null && maxPain >= PAIN_STOP) || (maxDiff != null && maxDiff >= DIFF_STOP)) return "red";
  if ((maxPain != null && maxPain >= PAIN_HOLD) || (maxDiff != null && maxDiff >= DIFF_HOLD)) return "yellow";
  return "green";
}
