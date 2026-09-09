// Week-strip navigation for /patient/programme (Philippe, 2026-09-07: replace
// the monthly calendar with a horizontal week-by-week timeline). Week 1 is the
// Monday of the week the patient's account was created (patients.created_at) —
// deliberately NOT the same "week" as lib/exercise/stageProgress.ts's careWeek(),
// which is a clinical stage-offset used for injury-stage progression, not a
// browsable history. There is no fixed last week — the patient decides how far
// back/forward to look, and the strip stops at the current week (there's
// nothing to show beyond today).

function mondayOf(d: Date): Date {
  const dow = (d.getDay() + 6) % 7; // Sunday=0 -> 6, Monday=1 -> 0
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - dow);
}

function fmt(d: Date): string {
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

/** Local (not UTC) calendar-date key, e.g. "2026-09-17" — used to match a
 *  workout_logs.completed_at timestamp to the day card it belongs to, without
 *  the UTC-vs-local shift toISOString() would introduce near midnight. */
export function localDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** This week's Monday as a "YYYY-MM-DD" key — what
 *  patient_recommended_workouts.week_start_date is compared against to
 *  resolve "which séance applies right now" (see lib/exercise/
 *  activeRecommendation.ts's resolveWorkoutForWeek). */
export function thisWeekStartDateKey(now: Date = new Date()): string {
  return localDateKey(mondayOf(now));
}

export interface WeekInfo {
  weekNumber: number;
  /** Monday 00:00, local time, as an ISO string — inclusive lower bound for a query. */
  startISO: string;
  /** Following Monday 00:00, local time, as an ISO string — exclusive upper bound. */
  endISO: string;
  /** This week's Monday as a local "YYYY-MM-DD" key — what gets stored in /
   *  compared against a plain `date` column (patient_recommended_workouts.week_start_date).
   *  NOT derived from startISO.slice(0, 10): that string is UTC-shifted, so
   *  for any timezone ahead of UTC (e.g. France) it names the SUNDAY before
   *  local midnight Monday instead of the Monday itself. */
  startDateKey: string;
  label: string; // "Semaine 3"
  rangeLabel: string; // "15 sept. – 21 sept."
}

/** Every week from the patient's first Monday through at least the end of the
 *  current calendar year (Philippe, 2026-09-08: the timeline should visibly
 *  run on past "today", not dead-end there — future weeks just render empty). */
export function buildWeeks(patientCreatedAtISO: string, now: Date = new Date()): WeekInfo[] {
  const firstMonday = mondayOf(new Date(patientCreatedAtISO));
  const currentMonday = mondayOf(now);
  const yearEndMonday = mondayOf(new Date(now.getFullYear(), 11, 31));
  const lastMonday = yearEndMonday.getTime() > currentMonday.getTime() ? yearEndMonday : currentMonday;

  const weeks: WeekInfo[] = [];
  let cursor = firstMonday;
  let n = 1;
  while (cursor.getTime() <= lastMonday.getTime()) {
    const end = new Date(cursor);
    end.setDate(end.getDate() + 7);
    const lastDay = new Date(end);
    lastDay.setDate(lastDay.getDate() - 1);
    weeks.push({
      weekNumber: n,
      startISO: cursor.toISOString(),
      endISO: end.toISOString(),
      startDateKey: localDateKey(cursor),
      label: `Semaine ${n}`,
      rangeLabel: `${fmt(cursor)} – ${fmt(lastDay)}`,
    });
    cursor = end;
    n++;
  }
  return weeks;
}

/** Which of `weeks` contains `now` — NOT necessarily the last entry any more,
 *  since buildWeeks() now runs the list on through the end of the year. */
export function currentWeekNumber(weeks: WeekInfo[], now: Date = new Date()): number {
  const nowISO = now.toISOString();
  const match = weeks.find((w) => nowISO >= w.startISO && nowISO < w.endISO);
  return match?.weekNumber ?? weeks[weeks.length - 1].weekNumber;
}

export const WEEKDAY_LABELS_LONG = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

export interface WeekDay {
  /** 0 = Monday .. 6 = Sunday */
  index: number;
  date: Date;
  dayLabel: string; // "Lundi"
  dateLabel: string; // "15 sept."
  hasSession: boolean;
}

/** `loggedDateKeys` = the localDateKey()s that have at least one session. */
export function daysOfWeek(week: WeekInfo, loggedDateKeys: Set<string>): WeekDay[] {
  const start = new Date(week.startISO);
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(start);
    date.setDate(date.getDate() + i);
    return {
      index: i,
      date,
      dayLabel: WEEKDAY_LABELS_LONG[i],
      dateLabel: fmt(date),
      hasSession: loggedDateKeys.has(localDateKey(date)),
    };
  });
}
