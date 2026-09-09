// =============================================================================
// Adhérence sur 28 jours — partagée par le tableau des patients (colonne),
// la fiche patient (stat) et, indirectement, le tableau de bord. Une seule
// définition : séances faites ÷ séances attendues.
//
// « Attendues » se calcule sur 4 semaines glissantes (celle en cours + les 3
// précédentes) : pour chacune, on résout quelle séance était effective
// cette semaine-là (Philippe, 2026-09-08 : une séance assignée reste valable
// jusqu'à une assignation plus récente, voir activeRecommendation.ts) et on
// additionne son rythme hebdo. Ça remplace l'ancien calcul (une ligne par
// recommandation, semaines écoulées depuis sa création plafonnées à 4) qui
// supposait une seule ligne existante à la fois — plus vrai maintenant que
// les anciennes assignations restent en base pour reconstituer l'historique,
// sans quoi une semaine couverte par deux assignations qui se succèdent
// aurait été comptée deux fois.
// =============================================================================

import { resolveAssignmentForWeek, type WeeklyAssignment } from "./activeRecommendation.ts";

export const ADHERENCE_WINDOW_DAYS = 28;

export interface AdherenceAssignment extends WeeklyAssignment {
  timesPerWeek: number | null;
}

export interface AdherenceInput {
  /** `workout_logs.completed_at` du patient (toutes dates ; le filtre est fait ici). */
  completedAt: string[];
  /** Historique complet des assignations du patient (`patient_recommended_workouts`). */
  assignments: AdherenceAssignment[];
  now?: Date;
}

export interface Adherence {
  /** 0–100, ou null quand rien n'est attendu (aucune assignation). */
  pct: number | null;
  done: number;
  expected: number;
}

function mondayKey(d: Date): string {
  const dow = (d.getDay() + 6) % 7; // dimanche=0 -> 6, lundi=1 -> 0
  const m = new Date(d.getFullYear(), d.getMonth(), d.getDate() - dow);
  return `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, "0")}-${String(m.getDate()).padStart(2, "0")}`;
}

export function computeAdherence({ completedAt, assignments, now = new Date() }: AdherenceInput): Adherence {
  const windowStart = now.getTime() - ADHERENCE_WINDOW_DAYS * 86_400_000;
  const done = completedAt.filter((iso) => {
    const t = new Date(iso).getTime();
    return !Number.isNaN(t) && t >= windowStart && t <= now.getTime();
  }).length;

  let expected = 0;
  for (let k = 0; k < 4; k++) {
    const bucketKey = mondayKey(new Date(now.getTime() - k * 7 * 86_400_000));
    const effective = resolveAssignmentForWeek(assignments, bucketKey);
    if (effective) expected += effective.timesPerWeek ?? 1;
  }

  const pct = expected === 0 ? null : Math.min(100, Math.round((done / expected) * 100));
  return { pct, done, expected };
}

export function adherenceLabel(pct: number | null): "Bonne" | "Moyenne" | "Faible" | null {
  if (pct === null) return null;
  if (pct >= 80) return "Bonne";
  if (pct >= 50) return "Moyenne";
  return "Faible";
}

export function adherenceTone(pct: number | null): "ok" | "warn" | "danger" | "muted" {
  if (pct === null) return "muted";
  if (pct >= 80) return "ok";
  if (pct >= 50) return "warn";
  return "danger";
}
