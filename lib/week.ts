// Returns the start of the current week (Monday 00:00, local time) as an ISO string.
// Used to count "this week's" workout completions against the weekly target.
export function startOfWeekISO(): string {
  const now = new Date();
  const daysSinceMonday = (now.getDay() + 6) % 7; // Sunday=0 -> 6, Monday=1 -> 0
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysSinceMonday);
  return monday.toISOString();
}
