"use client";

import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import Link from "next/link";
import { ChevronLeft, ChevronRight, CheckCircle2, Circle, ArrowRight, ArrowLeft, X } from "lucide-react";
import { daysOfWeek, localDateKey, type WeekInfo } from "@/lib/patient/weeks";
// La frise elle-même (segments-flèches, tons, view transition) vit dans
// WeekStrip.tsx depuis le 2026-09-09 : le kiné (KineWeekProgramme.tsx)
// réutilise exactement le même rendu sur la fiche patient.
import { SegmentRow, runViewTransition as runSharedViewTransition, type SegmentItem, type VTStyle } from "@/components/WeekStrip";

export interface SessionDetail {
  logId: string;
  workoutName: string | null;
  time: string; // "17:42"
  durationMinutes: number | null;
  painScore: number | null;
  difficulty: number | null;
  notes: string | null;
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
    if (view !== "strip") return;
    const el = currentCardRef.current;
    const scroller = scrollerRef.current;
    if (!el || !scroller) return;
    // El.scrollIntoView() ne fonctionne pas ici : les cartes de la frise se
    // chevauchent volontairement (marge négative + clip-path pour l'effet
    // flèche dans WeekStrip.tsx), ce qui fausse le calcul de position du
    // navigateur — il ne scrolle jamais (même bug que côté kiné,
    // KineWeekProgramme.tsx, 2026-09-09). getBoundingClientRect() n'est pas
    // affecté par ce chevauchement, donc on calcule le scroll nous-mêmes.
    const elRect = el.getBoundingClientRect();
    const scrollerRect = scroller.getBoundingClientRect();
    const elOffsetInScroller = elRect.left - scrollerRect.left + scroller.scrollLeft;
    const target = elOffsetInScroller - scroller.clientWidth / 2 + elRect.width / 2;
    scroller.scrollTo({ left: Math.max(0, target) });
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
  // Framer/manual animation needed (implementation in WeekStrip.tsx).
  const runViewTransition = (update: () => void) => runSharedViewTransition(update, flushSync);

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
