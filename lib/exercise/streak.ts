// =============================================================================
// Daily streak — consecutive days on which the patient completed ≥1 workout.
// Pure function, usable on server or client. Counts in the local timezone.
// =============================================================================

import type { SupabaseClient } from "@supabase/supabase-js";

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

/** Fetches the log rows the streak needs and computes it — the same query
 *  shape the patient home loader and the end-of-session celebration both
 *  need, so a future change to it (e.g. the 400-row window) only happens
 *  once. Works with either a server or browser Supabase client. */
export async function fetchStreak(supabase: SupabaseClient, patientId: string): Promise<number> {
  const { data } = await supabase
    .from("workout_logs")
    .select("completed_at")
    .eq("patient_id", patientId)
    .order("completed_at", { ascending: false })
    .limit(400);
  return computeStreak((data ?? []).map((l) => l.completed_at as string));
}
