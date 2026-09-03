// Série de douleur des 30 derniers jours pour la fiche patient — pur, testé.

export interface PainPoint { x: number; y: number; score: number; dateLabel: string }
export interface PainSeries {
  points: PainPoint[];
  ticks: { x: number; label: string }[];
  latest: number | null;
  previous: number | null;
}

const DAY_FMT = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });

export function buildPainSeries(
  rows: { pain_score: number | null; created_at: string }[],
  now: Date = new Date(),
  days = 30,
): PainSeries {
  const end = now.getTime();
  const span = Math.max(1, days) * 86_400_000;
  const start = end - span;
  const scored = rows
    .filter((r) => r.pain_score != null)
    .map((r) => ({ score: r.pain_score as number, t: new Date(r.created_at).getTime() }))
    .filter((r) => !Number.isNaN(r.t) && r.t >= start && r.t <= end)
    .sort((a, b) => a.t - b.t);

  const points = scored.map((r) => ({
    x: (r.t - start) / span,
    y: r.score,
    score: r.score,
    dateLabel: DAY_FMT.format(new Date(r.t)),
  }));

  const ticks = Array.from({ length: 6 }, (_, i) => {
    const t = start + (span * i) / 5;
    return { x: i / 5, label: DAY_FMT.format(new Date(t)) };
  });

  const n = scored.length;
  return {
    points,
    ticks,
    latest: n ? scored[n - 1].score : null,
    previous: n > 1 ? scored[n - 2].score : null,
  };
}
