// Historique du patient, semaine par semaine (Philippe, 2026-11-02) : sous
// chaque semaine, une bande avec les dessins des exercices — en bleu ceux des
// séances faites, en rouge ceux des séances manquées. La semaine en cours
// n'est pas finie : ses séances restantes sont « à faire » (grisées), pas
// manquées.
//
// Séances attendues : la séance en vigueur cette semaine-là et son nombre de
// fois par semaine — même règle que « Mes progrès » et le tableau de bord du
// kiné (lib/exercise/activeRecommendation.ts).
import { resolveAssignmentForWeek, type WeeklyAssignment } from "../exercise/activeRecommendation.ts";
import { thisWeekStartDateKey } from "./weeks.ts";
import { INTL_TAGS, type Locale } from "../../i18n/locales.ts";

/** Textes fournis par l'appelant (messages/<langue>/patient.json, « history ») :
 *  ce fichier est chargé par node:test, qui n'importe pas les .json.
 *  Français par défaut. */
export type HistoryLabels = { weekOf: (date: string) => string; session: string };
const FR_LABELS: HistoryLabels = { weekOf: (date) => `Semaine du ${date}`, session: "Séance" };

export type HistoryWorkout = { name: string; timesPerWeek: number | null; exercises: string[] };
export type HistoryLog = { id: string; completedAt: string; workout: HistoryWorkout | null };
export type HistoryAssignment = WeeklyAssignment & { workout: HistoryWorkout | null };

export type HistorySlot = {
  status: "done" | "missed" | "todo";
  workoutName: string;
  exercises: string[];
};
export type HistorySession = { id: string; name: string; weekday: string; day: string; month: string; time: string };
export type HistoryWeek = {
  key: string;
  label: string;
  current: boolean;
  done: number;
  target: number | null;
  slots: HistorySlot[];
  sessions: HistorySession[];
};

/** Nombre maximum de semaines affichées (les plus récentes). */
export const HISTORY_MAX_WEEKS = 12;

function weekLabel(key: string, labels: HistoryLabels, tag: string): string {
  const d = new Date(`${key}T12:00:00`);
  return labels.weekOf(d.toLocaleDateString(tag, { day: "numeric", month: "short" }));
}

function session(log: HistoryLog, labels: HistoryLabels, tag: string): HistorySession {
  const d = new Date(log.completedAt);
  return {
    id: log.id,
    name: log.workout?.name ?? labels.session,
    weekday: d.toLocaleDateString(tag, { weekday: "short" }).replace(".", ""),
    day: String(d.getDate()),
    month: d.toLocaleDateString(tag, { month: "short" }),
    time: d.toLocaleTimeString(tag, { hour: "2-digit", minute: "2-digit" }),
  };
}

export function buildHistoryWeeks({
  logs,
  assignments,
  now = new Date(),
  maxWeeks = HISTORY_MAX_WEEKS,
  locale = "fr",
  labels = FR_LABELS,
}: {
  logs: HistoryLog[];
  assignments: HistoryAssignment[];
  now?: Date;
  maxWeeks?: number;
  locale?: Locale;
  labels?: HistoryLabels;
}): HistoryWeek[] {
  const tag = INTL_TAGS[locale];
  const currentKey = thisWeekStartDateKey(now);
  const byWeek = new Map<string, HistoryLog[]>();
  for (const log of logs) {
    const key = thisWeekStartDateKey(new Date(log.completedAt));
    if (key > currentKey) continue;
    byWeek.set(key, [...(byWeek.get(key) ?? []), log]);
  }

  // Première semaine : la plus ancienne entre la première séance et le premier programme.
  const starts = [...byWeek.keys(), ...assignments.map((a) => a.weekStartDate)].filter((k) => k <= currentKey).sort();
  if (starts.length === 0) return [];
  const first = starts[0];

  const weeks: HistoryWeek[] = [];
  for (let key = currentKey; key >= first && weeks.length < maxWeeks; key = previousMonday(key)) {
    const weekLogs = (byWeek.get(key) ?? []).sort((a, b) => b.completedAt.localeCompare(a.completedAt));
    const planned = resolveAssignmentForWeek(assignments, key)?.workout ?? null;
    const target = planned?.timesPerWeek ?? null;
    if (weekLogs.length === 0 && !target) continue;

    const current = key === currentKey;
    const slots: HistorySlot[] = [...weekLogs]
      .reverse()
      .map((l) => ({
        status: "done" as const,
        workoutName: l.workout?.name ?? planned?.name ?? labels.session,
        exercises: l.workout?.exercises.length ? l.workout.exercises : (planned?.exercises ?? []),
      }));
    const missing = Math.max(0, (target ?? 0) - weekLogs.length);
    for (let i = 0; i < missing; i++) {
      slots.push({ status: current ? "todo" : "missed", workoutName: planned?.name ?? labels.session, exercises: planned?.exercises ?? [] });
    }

    weeks.push({ key, label: weekLabel(key, labels, tag), current, done: weekLogs.length, target, slots, sessions: weekLogs.map((l) => session(l, labels, tag)) });
  }
  return weeks;
}

function previousMonday(key: string): string {
  const d = new Date(`${key}T12:00:00`);
  d.setDate(d.getDate() - 7);
  return thisWeekStartDateKey(d);
}
