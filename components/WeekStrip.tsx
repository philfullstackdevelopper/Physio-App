"use client";

import type { CSSProperties, ReactNode, Ref, RefObject } from "react";

// =============================================================================
// WeekStrip — la « frise chronologique » : bande de segments-flèches imbriqués.
// Extraite de WeekProgramme.tsx (côté patient) pour que la fiche patient du
// kiné (KineWeekProgramme.tsx) utilise EXACTEMENT le même langage visuel
// (Philippe, 2026-09-09 : « il faut la frise, comme sur l'interface client »).
// Le rendu est identique à celui qu'avait WeekProgramme avant l'extraction ;
// seuls les tons `warn` et `danger` ont été ajoutés pour le côté kiné.
// =============================================================================

// `viewTransitionName` isn't in React's CSSProperties typings yet (a fairly
// new CSS property) — this small extension avoids sprinkling `as` casts.
export type VTStyle = CSSProperties & { viewTransitionName?: string };

export type SegmentTone = "active" | "current" | "default" | "warn" | "danger";

export interface SegmentItem {
  key: string;
  content: ReactNode;
  ariaLabel: string;
  tone: SegmentTone;
  badge?: string;
  disabled?: boolean;
  ringSelected?: boolean;
  onClick?: () => void;
  viewTransitionName?: string;
  buttonRef?: Ref<HTMLButtonElement>;
}

export const TONE_CLASS: Record<SegmentTone, string> = {
  active: "bg-ok-soft text-ok",
  current: "bg-brand/15 text-brand",
  default: "bg-surface text-muted",
  // Côté kiné uniquement : une semaine/un jour où le patient a signalé une
  // douleur ou difficulté élevée ressort en orange/rouge directement sur la
  // frise, à la place de l'ancien graphique « Historique douleur ».
  warn: "bg-warn-soft text-warn",
  danger: "bg-danger-soft text-danger",
};

/**
 * The interlocking arrow-segment strip ("frise chronologique") shared by the
 * week landing view and the day-by-day view inside it (Philippe, 2026-09-08:
 * the two should read as "the same kind of timeline", just one level apart —
 * weeks strip together edge to edge as arrow segments, and so do the 7 days
 * once a week is opened). `scrollable` picks between the two layouts: weeks
 * are fixed-width and horizontally scrollable (there can be many), days are
 * exactly 7 and simply share the row's width.
 */
export function SegmentRow({
  items,
  height,
  scrollable,
  scrollerRef,
}: {
  items: SegmentItem[];
  height: number;
  scrollable: boolean;
  scrollerRef?: RefObject<HTMLDivElement | null>;
}) {
  const notch = scrollable ? 30 : 16; // px — depth of the arrow tip / matching notch
  const rightTip = `polygon(0 0, calc(100% - ${notch}px) 0, 100% 50%, calc(100% - ${notch}px) 100%, 0 100%, ${notch}px 50%)`;
  const firstSegment = `polygon(0 0, calc(100% - ${notch}px) 0, 100% 50%, calc(100% - ${notch}px) 100%, 0 100%)`;

  return (
    <div
      ref={scrollerRef}
      className={`flex w-full min-w-0 items-center ${
        scrollable
          ? "snap-x overflow-x-auto scroll-smooth py-14 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          : "pb-2 pt-10"
      }`}
    >
      {items.map((item, i) => (
        <div
          key={item.key}
          className={`relative ${scrollable ? "w-64 shrink-0 snap-start" : "min-w-0 flex-1"}`}
          style={{ zIndex: i, marginLeft: i === 0 ? 0 : -notch }}
        >
          {/* Divider between segments traces the same notch/tip angle as the
              segments themselves, rather than a plain vertical bar. */}
          {i > 0 && (
            <svg
              aria-hidden
              className="pointer-events-none absolute top-0 z-10 text-line"
              style={{ left: 0, width: notch, height }}
              viewBox={`0 0 ${notch} ${height}`}
              preserveAspectRatio="none"
            >
              <polyline points={`0,0 ${notch},${height / 2} 0,${height}`} fill="none" stroke="currentColor" strokeWidth={2} />
            </svg>
          )}
          {item.badge && (
            <div className="pointer-events-none absolute left-1/2 top-0 flex -translate-x-1/2 -translate-y-[calc(100%+10px)] flex-col items-center">
              <span className="whitespace-nowrap rounded-full bg-brand px-3 py-1 text-xs font-semibold text-white shadow-sm">
                {item.badge}
              </span>
              <span className="-mt-[3px] h-2.5 w-2.5 rotate-45 bg-brand" />
            </div>
          )}
          {/* clip-path lives on this wrapper, not on the button inside it.
              View Transitions captures an element's OWN clip-path but
              ignores an ancestor's when it hoists a named element out for
              the morph — so keeping the notch shape here means the button
              (which carries viewTransitionName below) is captured as a
              plain rect, matching the day-view card's own rounded-2xl,
              instead of warping the jagged arrow shape into a rectangle
              over the whole transition (Philippe, 2026-09-08 — this was
              the main source of the "clunky" zoom, alongside the duration
              fix in globals.css). Visually identical at rest: an ancestor's
              clip-path crops a child's paint the same way the child's own
              would. */}
          <div style={{ clipPath: i === 0 ? firstSegment : rightTip, height }}>
            <button
              ref={item.buttonRef}
              type="button"
              disabled={item.disabled}
              aria-label={item.ariaLabel}
              aria-pressed={item.ringSelected}
              onClick={item.onClick}
              style={{ viewTransitionName: item.viewTransitionName } as VTStyle}
              className={`flex h-full w-full flex-col items-center justify-center gap-1.5 rounded-2xl py-2 text-center shadow-md transition ${
                item.disabled ? "cursor-default" : "hover:-translate-y-1 hover:shadow-xl hover:brightness-95"
              } ${i === 0 ? "pl-6 pr-11" : "pl-11 pr-11"} ${TONE_CLASS[item.tone]} ${
                item.ringSelected ? "ring-2 ring-ink ring-offset-1" : ""
              }`}
            >
              {item.content}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Le morphing segment de semaine → panneau jour par jour (et retour) passe
 * par l'API native View Transitions — les deux éléments portent le même
 * view-transition-name, le navigateur anime position/taille lui-même.
 * Repli instantané sans support (Safari < 18) ; prefers-reduced-motion est
 * déjà géré globalement dans globals.css. Partagé patient/kiné.
 */
export function runViewTransition(update: () => void, flushSync: (fn: () => void) => void) {
  if (typeof document !== "undefined" && "startViewTransition" in document) {
    // The browser aborts a transition (rejecting `.ready`) if the document
    // is hidden/backgrounded at the time — the state update itself still
    // goes through via flushSync either way, so that rejection is only
    // ever about the animation not playing, never about the click "not
    // working." Catch it so that edge case doesn't surface as an
    // unhandled-rejection error.
    const transition = (
      document as unknown as { startViewTransition: (cb: () => void) => { ready: Promise<void> } }
    ).startViewTransition(() => flushSync(update));
    transition.ready.catch(() => {});
  } else {
    update();
  }
}
