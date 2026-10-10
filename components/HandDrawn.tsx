import { Caveat } from "next/font/google";

// Touches « faites à la main » de la landing (Philippe, 2026-10-10 : le site
// faisait trop « IA », trop lisse) : un soulignement au feutre et une note
// manuscrite avec sa flèche. À utiliser deux ou trois fois sur la page, pas
// plus — c'est le contraste avec le reste, net, qui les rend vivantes.
const caveat = Caveat({ subsets: ["latin"], weight: ["600"] });

/** Soulignement au feutre sous un mot ou un bout de phrase (en ligne). */
export function Underlined({ children, className = "text-blue-500" }: { children: React.ReactNode; className?: string }) {
  return (
    <span className="relative inline-block whitespace-nowrap">
      {children}
      <svg
        aria-hidden
        viewBox="0 0 200 12"
        preserveAspectRatio="none"
        className={`pointer-events-none absolute -bottom-[0.14em] left-0 h-[0.26em] w-full ${className}`}
      >
        <path
          d="M2 7.5 C 30 2.5, 62 9.5, 96 5.5 S 158 3, 198 6.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="3.2"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}

/** Note manuscrite + flèche courbe. `direction` : vers où pointe la flèche. */
export function HandNote({
  children,
  direction = "right",
  className = "",
}: {
  children: React.ReactNode;
  direction?: "right" | "down";
  className?: string;
}) {
  return (
    <span aria-hidden className={`pointer-events-none inline-flex items-center gap-1 text-slate-500 ${className}`}>
      <span className={`${caveat.className} text-[1.35rem] leading-none`}>{children}</span>
      {direction === "right" ? (
        <svg viewBox="0 0 64 34" className="h-8 w-14 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 26 C 18 6, 38 4, 58 14" />
          <path d="M48 7 L 59 14 L 47 20" />
        </svg>
      ) : (
        <svg viewBox="0 0 34 56" className="h-12 w-7 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 3 C 26 14, 24 34, 15 51" />
          <path d="M6 41 L 15 52 L 24 43" />
        </svg>
      )}
    </span>
  );
}
