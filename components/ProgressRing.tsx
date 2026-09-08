// Small donut progress indicator — hand-rolled SVG like the rest of the app's
// charts (see PainHistoryChart) rather than a charting library for one shape.
// Color comes from `currentColor` (set via a text-* class on the wrapper), so
// it themes the same way as MountainScene/BodyPartIllustration.
export default function ProgressRing({
  value,
  max,
  size = 64,
  strokeWidth = 6,
  className = "",
}: {
  value: number;
  max: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = max > 0 ? Math.min(value / max, 1) : 0;
  const offset = circumference * (1 - pct);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={className} role="img" aria-label={`${value} sur ${max}`}>
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeOpacity={0.15} strokeWidth={strokeWidth} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset 0.4s ease-out" }}
      />
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" fill="currentColor" fontSize={size * 0.26} fontWeight={600}>
        {value}/{max}
      </text>
    </svg>
  );
}
