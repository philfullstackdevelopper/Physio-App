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

export interface CurrentMonthInfo {
  /** First-of-month, local time, as an ISO string — inclusive lower bound for a query. */
  startISO: string;
  /** First-of-next-month, local time, as an ISO string — exclusive upper bound for a query. */
  endISO: string;
  /** Number of days in the month (28-31). */
  daysInMonth: number;
  /** Blank grid cells before day 1, so the week row starts on Monday. */
  leadingBlanks: number;
  /** e.g. "Août 2026". */
  label: string;
  /** Today's day-of-month (1-31), or null if today isn't in this month. */
  todayDay: number | null;
  /** "YYYY-MM" for this month, and its neighbors — for a ?month= query param. */
  monthKey: string;
  prevMonthKey: string;
  nextMonthKey: string;
}

const monthKeyOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

// Everything the patient calendar (dashboard/patients/[id]) needs to lay out
// one month's grid, computed once so the page and the client component that
// renders it can't disagree about "today" or month length.
//
// `monthParam` is the page's `?month=YYYY-MM` search param (from the prev/next
// links) — omit it (or pass something unparseable) to get the current month.
export function resolveMonthInfo(monthParam?: string, now: Date = new Date()): CurrentMonthInfo {
  const match = monthParam?.match(/^(\d{4})-(\d{2})$/);
  const year = match ? Number(match[1]) : now.getFullYear();
  const month = match ? Number(match[2]) - 1 : now.getMonth();

  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingBlanks = (start.getDay() + 6) % 7; // Sunday=0 -> 6, Monday=1 -> 0
  const label = start.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  return {
    startISO: start.toISOString(),
    endISO: end.toISOString(),
    daysInMonth,
    leadingBlanks,
    label: label.charAt(0).toUpperCase() + label.slice(1),
    todayDay: now.getFullYear() === year && now.getMonth() === month ? now.getDate() : null,
    monthKey: monthKeyOf(start),
    prevMonthKey: monthKeyOf(new Date(year, month - 1, 1)),
    nextMonthKey: monthKeyOf(new Date(year, month + 1, 1)),
  };
}
