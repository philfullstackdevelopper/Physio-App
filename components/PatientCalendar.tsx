"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { DayGrade } from "@/lib/exercise/dayGrade";

export type CalendarDay = {
  day: number;
  grade: DayGrade;
  /** Human-readable detail (session name, time, pain/difficulty) — null for grey days. */
  detail: string | null;
};

const GRADE_STYLE: Record<DayGrade, string> = {
  green: "cursor-pointer bg-ok-soft text-ok hover:brightness-95",
  yellow: "cursor-pointer bg-warn-soft text-warn hover:brightness-95",
  red: "cursor-pointer bg-danger-soft text-danger hover:brightness-95",
  grey: "bg-app-bg text-muted",
};

const GRADE_DOT: Record<DayGrade, string> = { green: "bg-ok", yellow: "bg-warn", red: "bg-danger", grey: "bg-line" };

const GRADE_LABEL: Record<DayGrade, string> = {
  green: "Bien",
  yellow: "Moyen",
  red: "Difficile",
  grey: "Pas de séance",
};

const WEEKDAY_LABELS = ["L", "M", "M", "J", "V", "S", "D"];

/** Pure calendar grid, one month at a time, with prev/next navigation via a
 *  `?month=YYYY-MM` link (plain <Link>s — no client fetch, works with JS off).
 *  Hover shows a native-tooltip peek; clicking a colored day hands it up via
 *  onSelectDay so the parent panel decides how to show the full detail. */
export default function PatientCalendar({
  monthLabel,
  prevMonthKey,
  nextMonthKey,
  leadingBlanks,
  days,
  todayDay,
  selectedDay,
  onSelectDay,
}: {
  monthLabel: string;
  prevMonthKey: string;
  nextMonthKey: string;
  leadingBlanks: number;
  days: CalendarDay[];
  todayDay: number | null;
  selectedDay?: number | null;
  onSelectDay?: (day: CalendarDay) => void;
}) {
  return (
    <section className="rounded-xl border border-line bg-surface p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink">Calendrier</h2>
        <div className="flex items-center gap-1 text-sm text-muted">
          <Link
            href={`?month=${prevMonthKey}`}
            aria-label="Mois précédent"
            className="rounded p-1 hover:bg-app-bg focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={2} />
          </Link>
          <span className="min-w-[7.5rem] text-center font-medium">{monthLabel}</span>
          <Link
            href={`?month=${nextMonthKey}`}
            aria-label="Mois suivant"
            className="rounded p-1 hover:bg-app-bg focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"
          >
            <ChevronRight className="h-4 w-4" strokeWidth={2} />
          </Link>
        </div>
      </div>
      <p className="mt-1 text-sm text-muted">Survolez un jour pour un aperçu, cliquez pour le détail.</p>

      <div className="mt-4 grid grid-cols-7 gap-1.5">
        {WEEKDAY_LABELS.map((w, i) => (
          <span key={i} className="text-center text-xs font-medium uppercase tracking-wide text-muted">
            {w}
          </span>
        ))}

        {Array.from({ length: leadingBlanks }).map((_, i) => (
          <div key={`blank-${i}`} />
        ))}

        {days.map((d) => {
          const isToday = d.day === todayDay;
          return (
            <button
              key={d.day}
              type="button"
              title={d.detail ? `${GRADE_LABEL[d.grade]} — ${d.detail}` : GRADE_LABEL[d.grade]}
              onClick={() => onSelectDay?.(d)}
              className={`aspect-square cursor-pointer rounded-full text-xs font-semibold transition-[filter,outline] duration-150 hover:brightness-95 ${GRADE_STYLE[d.grade]} ${
                isToday ? "outline outline-2 outline-offset-1 outline-brand" : ""
              } ${selectedDay === d.day ? "ring-2 ring-ink ring-offset-1" : ""}`}
            >
              {d.day}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted">
        {(["green", "yellow", "red", "grey"] as const).map((g) => (
          <span key={g} className="flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${GRADE_DOT[g]}`} />
            {GRADE_LABEL[g]}
          </span>
        ))}
      </div>
    </section>
  );
}
