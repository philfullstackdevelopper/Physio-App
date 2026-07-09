// Returns the start of the current week (Monday 00:00, local time) as an ISO string.
// Used to count "this week's" workout completions against the weekly target.
export function startOfWeekISO(): string {
  const now = new Date();
  const daysSinceMonday = (now.getDay() + 6) % 7; // Sunday=0 -> 6, Monday=1 -> 0
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysSinceMonday);
  return monday.toISOString();
}

// Returns the start of today (00:00, local time) as an ISO string.
// Used to tell whether a session was already completed today.
export function startOfTodayISO(): string {
  const now = new Date();
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return midnight.toISOString();
}

// Returns the instant `days` days ago as an ISO string.
// Used to bound "recent feedback" so an old rough patch stops counting.
export function daysAgoISO(days: number): string {
  return new Date(Date.now() - days * 24 * 3600 * 1000).toISOString();
}
