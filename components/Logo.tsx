import Link from "next/link";

/** Three ascending bars with rounded caps — steady progress between
 *  sessions, the product's actual idea, instead of a generic letter-in-a-box
 *  monogram. Plain SVG with explicit fills (no Tailwind classes, no CSS
 *  variables) so it renders identically inside next/og's ImageResponse
 *  (app/icon.tsx, app/opengraph-image.tsx) as it does in the browser. */
export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" rx="9" fill="#155dfc" />
      <rect x="7" y="18" width="4.5" height="7" rx="2.25" fill="#ffffff" />
      <rect x="13.75" y="12" width="4.5" height="13" rx="2.25" fill="#ffffff" />
      <rect x="20.5" y="6" width="4.5" height="19" rx="2.25" fill="#ffffff" />
    </svg>
  );
}

export default function Logo({
  wordmark = true,
  size = 32,
  className = "",
}: {
  wordmark?: boolean;
  size?: number;
  className?: string;
}) {
  return (
    <Link href="/" className={`flex items-center gap-2.5 ${className}`}>
      <LogoMark size={size} />
      {wordmark && (
        <span className="font-display text-base font-semibold text-slate-900">Physio-App</span>
      )}
    </Link>
  );
}
