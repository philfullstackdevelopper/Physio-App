// Tableau « exercice × séance » de la fiche patient (Philippe, 2026-11-02,
// option C validée) : une ligne par exercice, une colonne par séance faite
// (les 8 dernières), la douleur dans chaque case, « P » quand il a été passé,
// et une tendance en bout de ligne.

export interface GridResultRow {
  workout_log_id: string;
  exercise_name: string;
  position: number;
  status: "done" | "skipped";
  pain: number | null;
}

export interface GridLog {
  id: string;
  completed_at: string;
}

export type GridCell = { status: "done" | "skipped"; pain: number | null } | null;

export interface ExerciseGrid {
  sessions: { logId: string; completedAt: string }[];
  rows: { name: string; cells: GridCell[]; trend: { label: string; tone: "up" | "down" | "skip" | "flat" | "new" } }[];
}

/** Écart de douleur moyenne (fin − début) à partir duquel on parle de tendance. */
export const TREND_DELTA = 1.5;

export function buildExerciseGrid(results: GridResultRow[], logs: GridLog[], maxSessions = 8): ExerciseGrid {
  const withResults = new Set(results.map((r) => r.workout_log_id));
  const sessions = logs
    .filter((l) => withResults.has(l.id))
    .sort((a, b) => a.completed_at.localeCompare(b.completed_at))
    .slice(-maxSessions)
    .map((l) => ({ logId: l.id, completedAt: l.completed_at }));
  const col = new Map(sessions.map((s, i) => [s.logId, i]));

  // Ordre des lignes : celui de la séance la plus récente, puis les anciens exercices.
  const order: string[] = [];
  const byName = new Map<string, GridCell[]>();
  const sorted = [...results].filter((r) => col.has(r.workout_log_id)).sort((a, b) => {
    const ca = col.get(a.workout_log_id)!;
    const cb = col.get(b.workout_log_id)!;
    return cb - ca || a.position - b.position;
  });
  for (const r of sorted) {
    if (!byName.has(r.exercise_name)) {
      byName.set(r.exercise_name, Array(sessions.length).fill(null));
      order.push(r.exercise_name);
    }
    byName.get(r.exercise_name)![col.get(r.workout_log_id)!] = { status: r.status, pain: r.pain };
  }

  const rows = order.map((name) => {
    const cells = byName.get(name)!;
    const skipped = cells.filter((c) => c?.status === "skipped").length;
    const pains = cells.map((c) => (c?.status === "done" ? c.pain : null)).filter((n): n is number => n != null);
    const firstSeen = cells.findIndex((c) => c != null);
    let trend: ExerciseGrid["rows"][number]["trend"] = { label: "Stable", tone: "flat" };
    if (skipped >= 2) trend = { label: `Passé ${skipped} fois`, tone: "skip" };
    else if (pains.length >= 3) {
      const half = Math.floor(pains.length / 2);
      const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
      const delta = avg(pains.slice(-half)) - avg(pains.slice(0, half));
      if (delta >= TREND_DELTA) trend = { label: "En hausse", tone: "up" };
      else if (delta <= -TREND_DELTA) trend = { label: "En baisse", tone: "down" };
    } else if (firstSeen > 0) trend = { label: "Ajouté récemment", tone: "new" };
    return { name, cells, trend };
  });

  return { sessions, rows };
}
