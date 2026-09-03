import type { PainSeries } from "@/lib/dashboard/painHistory";

// Courbe SVG maison (pas de librairie) : 0–10 en Y, 30 jours en X.
const W = 320, H = 120, PAD_L = 22, PAD_R = 8, PAD_T = 8, PAD_B = 20;
const px = (x: number) => PAD_L + x * (W - PAD_L - PAD_R);
const py = (y: number) => PAD_T + (1 - y / 10) * (H - PAD_T - PAD_B);

export default function PainHistoryChart({ series }: { series: PainSeries }) {
  if (series.points.length === 0) {
    return <p className="flex h-32 items-center justify-center text-sm text-muted">Pas encore de ressenti transmis.</p>;
  }
  const path = series.points.map((p, i) => `${i === 0 ? "M" : "L"}${px(p.x).toFixed(1)},${py(p.y).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-32 w-full" role="img" aria-label="Historique de douleur sur 30 jours">
      {[0, 5, 10].map((v) => (
        <g key={v} className="text-line">
          <line x1={PAD_L} x2={W - PAD_R} y1={py(v)} y2={py(v)} stroke="currentColor" strokeWidth={1} />
          <text x={PAD_L - 6} y={py(v) + 3} textAnchor="end" fontSize={8} className="fill-muted">{v}</text>
        </g>
      ))}
      {series.ticks.map((t) => (
        <text key={t.x} x={px(t.x)} y={H - 6} textAnchor="middle" fontSize={8} className="fill-muted">{t.label}</text>
      ))}
      <path d={path} fill="none" stroke="currentColor" strokeWidth={1.5} className="text-danger" />
      {series.points.map((p, i) => (
        <circle key={i} cx={px(p.x)} cy={py(p.y)} r={2.5} fill="currentColor" className="text-danger">
          <title>{p.dateLabel} — douleur {p.score}/10</title>
        </circle>
      ))}
    </svg>
  );
}
