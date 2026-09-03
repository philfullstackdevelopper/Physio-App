// =============================================================================
// Which recommended workout is "active" right now — shared by the patient's
// own home page and the kiné dashboard so the two can never disagree.
// =============================================================================

export interface RecommendedWorkout {
  workoutId: string;
  /** Lower = higher priority (1 is recommended first). */
  priority: number;
  timesPerWeek: number | null;
}

/**
 * Returns the workoutId of the highest-priority recommended workout whose
 * weekly target isn't met yet, or null if the list is empty or every target
 * is already met this week.
 *
 * A null `timesPerWeek` is treated as a target of 1 — a workout with no
 * declared weekly frequency shouldn't block the list forever.
 */
export function pickActiveWorkout(
  recommended: RecommendedWorkout[],
  weekCounts: Record<string, number>,
): string | null {
  const ordered = [...recommended].sort((a, b) => a.priority - b.priority);
  for (const r of ordered) {
    const target = r.timesPerWeek ?? 1;
    if ((weekCounts[r.workoutId] ?? 0) < target) return r.workoutId;
  }
  return null;
}
