// Suivi par exercice (migration 0080) : ce que le kiné doit voir d'un coup
// d'œil — l'exercice qui fait mal ou que le patient passe (Philippe,
// 2026-11-02, inspiré de Fullphysio).

export interface ExerciseResultRow {
  exercise_name: string;
  status: "done" | "skipped";
  pain: number | null;
  difficulty: number | null;
  created_at: string;
}

export interface ExerciseSummary {
  name: string;
  done: number;
  skipped: number;
  /** Moyenne des douleurs données (null si aucune). */
  avgPain: number | null;
  avgDifficulty: number | null;
  /** Pourquoi le kiné devrait regarder cet exercice, ou null. */
  watch: string | null;
}

/** Douleur moyenne à partir de laquelle un exercice est signalé. */
export const EXERCISE_PAIN_WATCH = 5;
/** Nombre de fois « passé » à partir duquel un exercice est signalé. */
export const EXERCISE_SKIP_WATCH = 2;

const avg = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : null);

/** Résumé par exercice, du plus préoccupant au moins préoccupant. */
export function summarizeExercises(rows: ExerciseResultRow[]): ExerciseSummary[] {
  const byName = new Map<string, ExerciseResultRow[]>();
  for (const r of rows) (byName.get(r.exercise_name) ?? byName.set(r.exercise_name, []).get(r.exercise_name)!).push(r);
  const out: ExerciseSummary[] = [];
  for (const [name, rs] of byName) {
    const done = rs.filter((r) => r.status === "done").length;
    const skipped = rs.length - done;
    const avgPain = avg(rs.map((r) => r.pain).filter((n): n is number => n != null));
    const avgDifficulty = avg(rs.map((r) => r.difficulty).filter((n): n is number => n != null));
    const reasons: string[] = [];
    if (avgPain != null && avgPain >= EXERCISE_PAIN_WATCH) reasons.push(`douleur ${String(avgPain).replace(".", ",")}/10`);
    if (skipped >= EXERCISE_SKIP_WATCH) reasons.push(`passé ${skipped} fois`);
    out.push({ name, done, skipped, avgPain, avgDifficulty, watch: reasons.length ? reasons.join(", ") : null });
  }
  const score = (s: ExerciseSummary) => (s.watch ? 100 : 0) + (s.avgPain ?? 0) + s.skipped;
  return out.sort((a, b) => score(b) - score(a) || a.name.localeCompare(b.name, "fr"));
}
