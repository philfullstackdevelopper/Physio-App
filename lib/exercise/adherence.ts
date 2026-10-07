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
//
// Semaine en cours proratisée (Philippe, 2026-10-07) : avant, la semaine en
// cours comptait déjà son rythme hebdo COMPLET dans « attendues », alors
// qu'elle n'est pas finie — une séance attribuée aujourd'hui affichait donc
// 0 % « Faible » avant même que le patient ait pu la faire. Désormais la
// semaine en cours n'attend que la part de son rythme correspondant aux
// jours déjà ÉCOULÉS (lundi = 0 jour, mardi = 1, … dimanche = 6), arrondie à
// l'entier inférieur : séance 3×/semaine, jeudi → 3 × 3/7 = 1 attendue. Les
// séances faites aujourd'hui comptent quand même (plafond 100 %). Et
// « faites » ne compte plus que les séances DANS les 4 semaines mesurées (du
// lundi d'il y a 3 semaines jusqu'à maintenant), au lieu de 28 jours
// glissants qui ne correspondaient pas aux semaines comptées en « attendues ».
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

const WEEKS = ADHERENCE_WINDOW_DAYS / 7;

/** Jour de la semaine, lundi = 0 … dimanche = 6. */
function weekdayIndex(d: Date): number {
  return (d.getDay() + 6) % 7;
}

function mondayKey(d: Date): string {
  const m = new Date(d.getFullYear(), d.getMonth(), d.getDate() - weekdayIndex(d));
  return `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, "0")}-${String(m.getDate()).padStart(2, "0")}`;
}

export function computeAdherence({ completedAt, assignments, now = new Date() }: AdherenceInput): Adherence {
  const elapsedDays = weekdayIndex(now); // jours entiers déjà écoulés cette semaine
  // Lundi 00:00 (heure locale) de la plus ancienne des 4 semaines mesurées.
  const windowStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - elapsedDays - (WEEKS - 1) * 7,
  ).getTime();
  const done = completedAt.filter((iso) => {
    const t = new Date(iso).getTime();
    return !Number.isNaN(t) && t >= windowStart && t <= now.getTime();
  }).length;

  let expected = 0;
  for (let k = 0; k < WEEKS; k++) {
    const bucketKey = mondayKey(new Date(now.getTime() - k * 7 * 86_400_000));
    const effective = resolveAssignmentForWeek(assignments, bucketKey);
    if (!effective) continue;
    const perWeek = effective.timesPerWeek ?? 1;
    // k = 0 : semaine en cours, pas finie → part proratisée (voir en-tête).
    expected += k === 0 ? Math.floor((perWeek * elapsedDays) / 7) : perWeek;
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
