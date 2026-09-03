// =============================================================================
// Adhérence sur 28 jours — partagée par le tableau des patients (colonne),
// la fiche patient (stat) et, indirectement, le tableau de bord. Une seule
// définition : séances faites ÷ séances attendues, attendues = Σ (fois/semaine
// × semaines écoulées depuis la recommandation, plafonnées à 4).
// =============================================================================

export const ADHERENCE_WINDOW_DAYS = 28;

export interface AdherenceInput {
  /** `workout_logs.completed_at` du patient (toutes dates ; le filtre est fait ici). */
  completedAt: string[];
  /** `patient_recommended_workouts` joints à `workouts.times_per_week`. */
  recommendations: { timesPerWeek: number | null; createdAt: string }[];
  now?: Date;
}

export interface Adherence {
  /** 0–100, ou null quand rien n'est attendu (aucune recommandation). */
  pct: number | null;
  done: number;
  expected: number;
}

export function computeAdherence({ completedAt, recommendations, now = new Date() }: AdherenceInput): Adherence {
  const windowStart = now.getTime() - ADHERENCE_WINDOW_DAYS * 86_400_000;
  const done = completedAt.filter((iso) => {
    const t = new Date(iso).getTime();
    return !Number.isNaN(t) && t >= windowStart && t <= now.getTime();
  }).length;

  let expected = 0;
  for (const r of recommendations) {
    const since = new Date(r.createdAt).getTime();
    const days = Number.isNaN(since) ? ADHERENCE_WINDOW_DAYS : Math.max(0, (now.getTime() - since) / 86_400_000);
    const weeks = Math.min(4, Math.ceil(days / 7));
    expected += (r.timesPerWeek ?? 1) * weeks;
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
