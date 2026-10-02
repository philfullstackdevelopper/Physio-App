// =============================================================================
// Which recommended workout applies to a given week — shared by the patient's
// own home page and the kiné dashboard so the two can never disagree.
//
// A séance assigned for a week stays in effect until a later assignment
// replaces it (Philippe, 2026-09-08): assign A at week 1 and B at week 4,
// weeks 1-3 still resolve to A, week 4 onward resolves to B. So resolving
// "which séance for week N" means the most recent assignment whose
// week_start_date is on or before week N's Monday — not a per-week lookup,
// and no more "skip to the next one once this week's quota is met" (that
// belonged to the old priority-ordered queue, replaced by this single
// timeline — see components/AdjustWorkoutModal.tsx).
//
// Since migration 0059 an assignment can also carry a length in weeks
// (week_count, chosen by the kiné when assigning — Philippe, 2026-10-01):
// assigned at week 1 for 3 weeks, it covers weeks 1-3 and week 4 resolves to
// nothing (unless another assignment starts there). null = open-ended, as
// before. A later assignment still wins over an earlier one that hasn't
// ended yet.
// =============================================================================

export interface WeeklyAssignment {
  workoutId: string;
  /** Monday of the week this assignment starts applying, "YYYY-MM-DD". */
  weekStartDate: string;
  /** How many weeks it applies for (week_count); null/absent = until the next one. */
  weekCount?: number | null;
}

/** Monday `weeks` weeks after a "YYYY-MM-DD" Monday (UTC arithmetic: no DST drift). */
export function addWeeksToKey(key: string, weeks: number): string {
  const d = new Date(`${key}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + weeks * 7);
  return d.toISOString().slice(0, 10);
}

/** Generic version returning the whole matched record (e.g. to recover its
 *  row id, not just the workoutId) — resolveWorkoutForWeek is the common case
 *  built on top of it. */
export function resolveAssignmentForWeek<T extends WeeklyAssignment>(assignments: T[], weekStartDate: string): T | null {
  let best: T | null = null;
  for (const a of assignments) {
    if (a.weekStartDate > weekStartDate) continue;
    if (!best || a.weekStartDate > best.weekStartDate) best = a;
  }
  // The most recent assignment has run its course: nothing for this week.
  if (best?.weekCount && weekStartDate >= addWeeksToKey(best.weekStartDate, best.weekCount)) return null;
  return best;
}

/**
 * Returns the workoutId in effect for `weekStartDate` (that week's own
 * Monday, "YYYY-MM-DD"), or null if no assignment exists on or before it yet.
 */
export function resolveWorkoutForWeek(assignments: WeeklyAssignment[], weekStartDate: string): string | null {
  return resolveAssignmentForWeek(assignments, weekStartDate)?.workoutId ?? null;
}
