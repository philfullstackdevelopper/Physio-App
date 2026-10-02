// Alerte « programme » de la fiche patient côté kiné : aucune séance cette
// semaine, ou la même séance depuis trop longtemps sans rien de prévu ensuite.
// Affichée en pastille à côté du nom du patient (Philippe, 2026-09-29 : plutôt
// qu'en bandeau au-dessus de la frise) — calculée côté serveur dans
// app/dashboard/patients/[id]/page.tsx.

import { resolveAssignmentForWeek } from "@/lib/exercise/activeRecommendation";
import type { WeekInfo } from "@/lib/patient/weeks";

/** Au-delà de ce nombre de semaines avec la même séance, sans rien de prévu
 *  ensuite, on invite à faire évoluer la séance. Règle simple, à affiner avec
 *  le kiné partenaire (durée typique d'une phase). */
export const STALE_AFTER_WEEKS = 4;

/** Différence en semaines entières entre deux clés "YYYY-MM-DD" (lundis). */
function weeksBetween(fromKey: string, toKey: string): number {
  const ms = new Date(`${toKey}T00:00:00`).getTime() - new Date(`${fromKey}T00:00:00`).getTime();
  return Math.round(ms / (7 * 86_400_000));
}

export function programmeWarning({
  weeks,
  currentWeekNumber,
  assignments,
  exerciseCountByWorkoutId,
}: {
  weeks: WeekInfo[];
  currentWeekNumber: number;
  assignments: { workoutId: string; weekStartDate: string; weekCount?: number | null }[];
  exerciseCountByWorkoutId: Record<string, number>;
}): { label: string; detail: string } | null {
  const currentWeek = weeks[currentWeekNumber - 1] ?? weeks[weeks.length - 1];
  if (!currentWeek) return null;
  const currentKey = currentWeek.startDateKey;
  const current = resolveAssignmentForWeek(assignments, currentKey);
  if (!current || (exerciseCountByWorkoutId[current.workoutId] ?? 0) === 0) {
    return {
      label: "Aucune séance cette semaine",
      detail: "Aucune séance n'est assignée cette semaine — ouvrez la semaine en cours pour en choisir une.",
    };
  }
  const hasFuture = assignments.some((a) => a.weekStartDate > currentKey);
  const age = weeksBetween(current.weekStartDate, currentKey) + 1;
  if (!hasFuture && age >= STALE_AFTER_WEEKS) {
    return {
      label: `Même séance depuis ${age} semaines`,
      detail: `La même séance est en place depuis ${age} semaines et rien n'est prévu ensuite — pensez à la faire évoluer dans les semaines à venir.`,
    };
  }
  return null;
}
