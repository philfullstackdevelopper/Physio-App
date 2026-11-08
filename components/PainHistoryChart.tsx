import { useTranslations } from "next-intl";
import type { PainSeries } from "@/lib/dashboard/painHistory";

// Courbe SVG maison (pas de librairie) : 0–10 en Y, 30 jours en X.
// `height` (unités du viewBox) : plus haut que 120 quand il faut remplir
// l'écran du téléphone (FillPainChart) — texte et points gardent leur taille.
const W = 320, PAD_L = 22, PAD_R = 8, PAD_T = 8, PAD_B = 20;
const px = (x: number) => PAD_L + x * (W - PAD_L - PAD_R);

export default function PainHistoryChart({
  series,
  height = 120,
  className = "h-32 w-full",
}: {
  series: PainSeries;
  height?: number;
  className?: string;
}) {
  const tr = useTranslations("patient.painChart");
  const H = height;
  const py = (y: number) => PAD_T + (1 - y / 10) * (H - PAD_T - PAD_B);
  if (series.points.length === 0) {
    return <p className="flex h-32 items-center justify-center text-sm text-muted">{tr("empty")}</p>;
  }
  const path = series.points.map((p, i) => `${i === 0 ? "M" : "L"}${px(p.x).toFixed(1)},${py(p.y).toFixed(1)}`).join(" ");
  // Dernière douleur notée, écrite à côté du dernier point (Philippe,
  // 2026-11-08 : courbe lisible sans savoir lire un graphique).
  const last = series.points[series.points.length - 1];
  const lastX = px(last.x);
  const lastY = py(last.y);
  const lastAnchor = last.x > 0.85 ? "end" : last.x < 0.15 ? "start" : "middle";
  const lastLabelY = lastY - PAD_T - 11 < 0 ? lastY + 14 : lastY - 6;
  // Contour blanc autour des mots : restent lisibles si la courbe passe dessous.
  const halo = { stroke: "currentColor", strokeWidth: 3, paintOrder: "stroke" as const, strokeLinejoin: "round" as const };
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={className} role="img" aria-label={tr("aria")}>
      {(H > 200 ? [0, 2, 4, 6, 8, 10] : [0, 5, 10]).map((v) => (
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
          {/* Un seul nœud texte : plusieurs morceaux dans un <title> SVG faisaient échouer l'hydratation React. */}
          <title>{tr("point", { date: p.dateLabel, score: p.score })}</title>
        </circle>
      ))}
      {/* Les deux bouts de l'échelle en mots, en plus des chiffres. */}
      <g className="text-surface" fontSize={8}>
        <text x={PAD_L + 3} y={py(10) + 8} className="fill-muted" {...halo}>{tr("maxPain")}</text>
        <text x={PAD_L + 3} y={py(0) - 3} className="fill-muted" {...halo}>{tr("noPain")}</text>
      </g>
      <circle cx={lastX} cy={lastY} r={4} fill="currentColor" stroke="white" strokeWidth={1.5} className="text-danger" />
      <g className="text-surface">
        <text x={lastX} y={lastLabelY} textAnchor={lastAnchor} fontSize={10} fontWeight={600} className="fill-danger" {...halo}>
          {tr("last", { score: last.score })}
        </text>
      </g>
    </svg>
  );
}
