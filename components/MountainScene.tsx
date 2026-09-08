// Original mountain-and-clouds motif (Philippe, 2026-09-08: matches the
// dashboard mockup — a summit/progress metaphor for "further along the
// programme"). Two layered peaks + clouds in `currentColor` so it themes
// with whatever text color class is applied (brand while in progress, ok
// once the week's goal is reached), same convention as BodyPartIllustration.
// `variant="goal"` adds the winding path + flag + a little hiker used on the
// "Mon programme" card; `variant="quote"` is the plain silhouette behind the
// daily quote.

// Waypoints of the path up the front peak, base to summit — used both to draw
// the path itself and to place the hiker at `progress` along it, so the two
// can never drift apart (Philippe, 2026-09-08: "un bonhomme qui avance sur le
// chemin à mesure que des séances sont complétées").
const PATH_POINTS: [number, number][] = [
  [30, 92],
  [44, 82],
  [40, 76],
  [52, 70],
  [58, 60],
  [56, 56],
  [64, 46],
  [60, 40],
  [64, 34],
];

function pointAtProgress(points: [number, number][], t: number): { x: number; y: number; angle: number } {
  const clamped = Math.max(0, Math.min(1, t));
  const segLengths = points.slice(1).map((p, i) => Math.hypot(p[0] - points[i][0], p[1] - points[i][1]));
  const total = segLengths.reduce((a, b) => a + b, 0);
  let target = clamped * total;

  for (let i = 0; i < segLengths.length; i++) {
    if (target <= segLengths[i] || i === segLengths.length - 1) {
      const segT = segLengths[i] === 0 ? 0 : Math.min(target / segLengths[i], 1);
      const [x0, y0] = points[i];
      const [x1, y1] = points[i + 1];
      return { x: x0 + (x1 - x0) * segT, y: y0 + (y1 - y0) * segT, angle: Math.atan2(y1 - y0, x1 - x0) * (180 / Math.PI) };
    }
    target -= segLengths[i];
  }
  const [x, y] = points[points.length - 1];
  return { x, y, angle: 0 };
}

export default function MountainScene({
  variant = "quote",
  progress = 0,
  className = "h-16 w-24",
}: {
  variant?: "quote" | "goal";
  /** 0–1, only used for variant="goal" — how far up the path the hiker stands. */
  progress?: number;
  className?: string;
}) {
  const hiker = variant === "goal" ? pointAtProgress(PATH_POINTS, progress) : null;

  return (
    <svg viewBox="0 0 160 100" className={className} aria-hidden fill="none">
      {/* Clouds */}
      <g fill="currentColor" opacity={0.35}>
        <ellipse cx="24" cy="24" rx="14" ry="7" />
        <ellipse cx="34" cy="20" rx="10" ry="6" />
        <ellipse cx="128" cy="16" rx="12" ry="6" />
        <ellipse cx="118" cy="20" rx="8" ry="5" />
      </g>

      {/* Back peak */}
      <path d="M0 96 L46 28 L78 68 L100 40 L160 96 Z" fill="currentColor" opacity={0.25} />
      {/* Front peak */}
      <path d="M18 96 L64 34 L92 70 L118 42 L150 96 Z" fill="currentColor" opacity={0.55} />

      {variant === "goal" && (
        <>
          {/* Winding path up the front peak */}
          <polyline
            points={PATH_POINTS.map(([x, y]) => `${x},${y}`).join(" ")}
            stroke="white"
            strokeOpacity={0.85}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="1 7"
          />
          {/* Flag at the summit */}
          <line x1="64" y1="34" x2="64" y2="16" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" />
          <path d="M64 16 L80 22 L64 28 Z" fill="currentColor" />

          {/* Hiker — "vous êtes ici" on the path itself, a tiny stick figure
              (same drawing language as BodyPartIllustration's balance icon)
              whose position is driven by this week's progress: trailhead at
              progress 0, summit — right by the flag — once the week's target
              is reached. */}
          {hiker && (
            <g transform={`translate(${hiker.x} ${hiker.y - 3})`} stroke="white" strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round">
              <circle cy="-3.6" r="1.5" fill="white" stroke="none" />
              <line x1="0" y1="-2.2" x2="0" y2="1.5" />
              <line x1="0" y1="-1.2" x2="-2" y2="0.2" />
              <line x1="0" y1="-1.2" x2="2" y2="-0.6" />
              <line x1="0" y1="1.5" x2="-1.6" y2="3.6" />
              <line x1="0" y1="1.5" x2="1.8" y2="3.2" />
            </g>
          )}
        </>
      )}
    </svg>
  );
}
