"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode, type Ref, type RefObject as RefObjectType } from "react";
import { flushSync } from "react-dom";
import Link from "next/link";
import { ChevronLeft, ChevronRight, CheckCircle2, Circle, ArrowRight, ArrowLeft, X } from "lucide-react";
import { daysOfWeek, localDateKey, type WeekInfo } from "@/lib/patient/weeks";

// `viewTransitionName` isn't in React's CSSProperties typings yet (a fairly
// new CSS property) — this small extension avoids sprinkling `as` casts.
type VTStyle = CSSProperties & { viewTransitionName?: string };

export interface SessionDetail {
  logId: string;
  workoutName: string | null;
  time: string; // "17:42"
  durationMinutes: number | null;
  painScore: number | null;
  difficulty: number | null;
  notes: string | null;
}

interface SegmentItem {
  key: string;
  content: ReactNode;
  ariaLabel: string;
  tone: "active" | "current" | "default";
  badge?: string;
  disabled?: boolean;
  ringSelected?: boolean;
  onClick?: () => void;
  viewTransitionName?: string;
  buttonRef?: Ref<HTMLButtonElement>;
}

const TONE_CLASS: Record<SegmentItem["tone"], string> = {
  active: "bg-ok-soft text-ok",
  current: "bg-brand/15 text-brand",
  default: "bg-surface text-muted",
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
function SegmentRow({
  items,
  height,
  scrollable,
  scrollerRef,
}: {
  items: SegmentItem[];
  height: number;
  scrollable: boolean;
  scrollerRef?: RefObjectType<HTMLDivElement | null>;
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
 * Replaces the old monthly calendar (Philippe, 2026-09-07): a full-width,
 * horizontally scrollable week strip (weeks since the patient's account was
 * created, no fixed end) — click a week to see its 7 days, click a day with a
 * session to see the detail. Everything the strip needs (every week's
 * completion + every logged day's session detail) is loaded once by the page
 * and handed down, so switching weeks/days here is instant, no refetch.
 */
export default function WeekProgramme({
  weeks,
  dayDetails,
  currentWeekNumber,
}: {
  weeks: WeekInfo[];
  dayDetails: Record<string, SessionDetail[]>;
  currentWeekNumber: number;
}) {
  const loggedDateKeys = new Set(Object.keys(dayDetails).filter((k) => dayDetails[k].length > 0));
  const weekHasActivity = (week: WeekInfo) => daysOfWeek(week, loggedDateKeys).some((d) => d.hasSession);
  const todayKey = localDateKey(new Date());

  // 3 stages, one visible at a time (Philippe, 2026-09-08: the mockup's 3 panels
  // were 3 SCREENS, not 3 sections stacked on one page): land on the strip alone
  // -> click a week -> that week's day-by-day + detail panel replaces the strip.
  const [view, setView] = useState<"strip" | "week">("strip");
  const [selectedWeekNumber, setSelectedWeekNumber] = useState(currentWeekNumber);
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);

  const scrollerRef = useRef<HTMLDivElement>(null);
  const currentCardRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (view === "strip") currentCardRef.current?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [view]);

  const selectedWeek = weeks.find((w) => w.weekNumber === selectedWeekNumber) ?? weeks[weeks.length - 1];
  const days = daysOfWeek(selectedWeek, loggedDateKeys);
  const selectedDaySessions = selectedDayKey ? (dayDetails[selectedDayKey] ?? []) : [];

  useEffect(() => {
    if (!selectedDayKey) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedDayKey(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedDayKey]);

  // The clicked week segment morphs into the day-view panel (and back) via the
  // native View Transitions API — both carry the same view-transition-name
  // (below), so the browser animates position/size between them itself; no
  // Framer/manual animation needed. Falls back to an instant swap on browsers
  // without support (Safari < 18), and prefers-reduced-motion is already
  // handled globally in globals.css.
  const runViewTransition = (update: () => void) => {
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
  };

  const openWeek = (n: number) => {
    if (n < 1 || n > weeks.length) return;
    runViewTransition(() => {
      setSelectedWeekNumber(n);
      setSelectedDayKey(null);
      setView("week");
    });
  };
  const closeWeek = () => runViewTransition(() => setView("strip"));
  const goToWeek = (n: number) => {
    if (n < 1 || n > weeks.length) return;
    setSelectedWeekNumber(n);
    setSelectedDayKey(null);
  };
  const scrollStrip = (dir: 1 | -1) => scrollerRef.current?.scrollBy({ left: dir * 260, behavior: "smooth" });

  if (view === "strip") {
    const weekItems: SegmentItem[] = weeks.map((week) => {
      const active = weekHasActivity(week);
      const isCurrent = week.weekNumber === currentWeekNumber;
      return {
        key: String(week.weekNumber),
        tone: active ? "active" : isCurrent ? "current" : "default",
        badge: isCurrent ? "Vous êtes ici" : undefined,
        viewTransitionName: `week-strip-${week.weekNumber}`,
        buttonRef: isCurrent ? currentCardRef : undefined,
        onClick: () => openWeek(week.weekNumber),
        ariaLabel: `Semaine ${week.weekNumber}, ${week.rangeLabel}${active ? ", séances réalisées" : ""}${
          isCurrent ? " — semaine actuelle" : ""
        }`,
        content: (
          <>
            <span className="flex items-center gap-1.5 text-3xl font-semibold">
              {week.weekNumber}
              {active && <CheckCircle2 className="h-5 w-5" strokeWidth={2} />}
            </span>
            <span className="text-xs font-medium opacity-90">{week.rangeLabel}</span>
          </>
        ),
      };
    });

    return (
      <div className="flex w-full min-w-0 flex-col">
        {/* 1. Landing view — full width, sized to its own content (Philippe,
            2026-09-08: dropped the old min-h-screen stretch now that the
            "Mon programme" card sits right below it — everything needs to
            fit in view together, without scrolling). Weeks connect edge to
            edge as arrow segments ("frise chronologique" reference) instead
            of floating as separate cards. */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-ink">Mon programme, semaine par semaine</h2>
            <p className="mt-1 text-sm text-muted">Cliquez sur une semaine pour voir le détail jour par jour.</p>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Semaines précédentes"
              onClick={() => scrollStrip(-1)}
              className="rounded-full border border-line p-2 text-muted hover:bg-app-bg focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"
            >
              <ChevronLeft className="h-5 w-5" strokeWidth={2} />
            </button>
            <button
              type="button"
              aria-label="Semaines suivantes"
              onClick={() => scrollStrip(1)}
              className="rounded-full border border-line p-2 text-muted hover:bg-app-bg focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"
            >
              <ChevronRight className="h-5 w-5" strokeWidth={2} />
            </button>
          </div>
        </div>

        <SegmentRow items={weekItems} height={208} scrollable scrollerRef={scrollerRef} />
      </div>
    );
  }

  const dayItems: SegmentItem[] = days.map((d) => {
    const key = localDateKey(d.date);
    const sessions = dayDetails[key] ?? [];
    const isToday = key === todayKey;
    return {
      key,
      tone: d.hasSession ? "active" : isToday ? "current" : "default",
      badge: isToday ? "Aujourd'hui" : undefined,
      disabled: sessions.length === 0,
      ringSelected: selectedDayKey === key,
      onClick: () => setSelectedDayKey(selectedDayKey === key ? null : key),
      ariaLabel: `${d.dayLabel} ${d.dateLabel}${d.hasSession ? ", séance réalisée" : ", non fait"}${isToday ? " — aujourd'hui" : ""}`,
      content: (
        <>
          <span className="text-sm font-semibold">{d.dayLabel}</span>
          <span className="text-[11px] opacity-80">{d.dateLabel}</span>
          {d.hasSession ? <CheckCircle2 className="h-4 w-4" strokeWidth={2} /> : <Circle className="h-4 w-4" strokeWidth={1.5} />}
          <span className="text-[11px]">{d.hasSession ? "Réalisée" : "Non fait"}</span>
        </>
      ),
    };
  });

  const closeDayDetail = () => setSelectedDayKey(null);

  return (
    <div className="w-full">
      {/* 2. Zoom on the selected week — day by day. Shares its view-transition-name
          with the strip segment that opened it, so the browser morphs one into the
          other (see runViewTransition above). The 7 days use the exact same
          interlocking-segment strip as the week landing view, just narrower and
          non-scrolling (Philippe, 2026-09-08: "the same kind of timeline" one level
          down). Clicking a day with a séance opens its detail as a popup (below)
          instead of a side panel — there's nothing to show until a day is picked. */}
      <section
        style={{ viewTransitionName: `week-strip-${selectedWeek.weekNumber}` } as VTStyle}
        className="rounded-2xl border border-line bg-surface p-5 shadow-sm"
      >
        <button
          type="button"
          onClick={closeWeek}
          className="flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={2} />
          Toutes les semaines
        </button>

        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            aria-label="Semaine précédente"
            onClick={() => goToWeek(selectedWeek.weekNumber - 1)}
            disabled={selectedWeek.weekNumber <= 1}
            className="rounded-full p-1 text-muted hover:bg-app-bg disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={2} />
          </button>
          <h2 className="text-lg font-semibold text-ink">{selectedWeek.label}</h2>
          <button
            type="button"
            aria-label="Semaine suivante"
            onClick={() => goToWeek(selectedWeek.weekNumber + 1)}
            disabled={selectedWeek.weekNumber >= weeks.length}
            className="rounded-full p-1 text-muted hover:bg-app-bg disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
        <p className="text-sm text-muted">{selectedWeek.rangeLabel}</p>

        <SegmentRow items={dayItems} height={172} scrollable={false} />
      </section>

      {selectedDayKey && selectedDaySessions.length > 0 && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 p-4"
          onClick={closeDayDetail}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Détail de la séance"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl bg-surface p-5 shadow-xl [animation:popIn_0.35s_ease-out_both]"
          >
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-base font-semibold text-ink">Détail de la séance</h2>
              <button
                type="button"
                aria-label="Fermer"
                onClick={closeDayDetail}
                className="rounded-full p-1 text-muted hover:bg-app-bg hover:text-ink"
              >
                <X className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>
            <div className="mt-3 flex flex-col gap-4">
              {selectedDaySessions.map((s) => (
                <div key={s.logId}>
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-ok" strokeWidth={1.75} />
                    {s.workoutName ?? "Séance"}
                  </p>
                  <p className="mt-1 text-xs text-muted">Terminée à {s.time}</p>
                  <ul className="mt-2 space-y-1 text-xs text-muted">
                    {s.durationMinutes != null && <li>{s.durationMinutes} min</li>}
                    {s.painScore != null && <li>Douleur {s.painScore}/10</li>}
                    {s.difficulty != null && <li>Difficulté {s.difficulty}/10</li>}
                    {s.notes && <li>« {s.notes} »</li>}
                  </ul>
                  <Link
                    href={`/patient/historique/${s.logId}`}
                    className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-brand hover:underline"
                  >
                    Voir le détail
                    <ArrowRight className="h-3 w-3" strokeWidth={2} />
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
