// =============================================================================
// Daily streak — consecutive days on which the patient completed ≥1 workout.
// Pure function, usable on server or client. Counts in the local timezone.
// =============================================================================

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

/**
 * Number of consecutive days ending today (or yesterday, if today isn't done
 * yet) with at least one completed workout. `now` is injectable for testing.
 */
export function computeStreak(timestamps: (string | null | undefined)[], now: Date = new Date()): number {
  const days = new Set<string>();
  for (const t of timestamps) {
    if (!t) continue;
    const d = new Date(t);
    if (!Number.isNaN(d.getTime())) days.add(dayKey(d));
  }
  if (days.size === 0) return 0;

  const cursor = new Date(now);
  // Allow the streak to be "alive" if today isn't done yet but yesterday was.
  if (!days.has(dayKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!days.has(dayKey(cursor))) return 0;
  }

  let streak = 0;
  while (days.has(dayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
