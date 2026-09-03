"use client";

import { useState, type ReactNode } from "react";
import PatientCalendar, { type CalendarDay } from "@/components/PatientCalendar";

const TONE_VAR: Record<string, string> = {
  green: "var(--grade-green-bg)",
  yellow: "var(--grade-yellow-bg)",
  red: "var(--grade-red-bg)",
};
const TONE_FG: Record<string, string> = {
  green: "var(--grade-green-fg)",
  yellow: "var(--grade-yellow-fg)",
  red: "var(--grade-red-fg)",
};

/** The left panel toggles between "recommended séances" (default) and a
 *  clicked day's detail — reusing the same space instead of adding scroll
 *  height, so the whole overview fits on one screen. */
export default function PatientOverviewPanel({
  recommendedPanel,
  monthLabel,
  prevMonthKey,
  nextMonthKey,
  leadingBlanks,
  days,
  todayDay,
}: {
  recommendedPanel: ReactNode;
  monthLabel: string;
  prevMonthKey: string;
  nextMonthKey: string;
  leadingBlanks: number;
  days: CalendarDay[];
  todayDay: number | null;
}) {
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);
  const monthWord = monthLabel.split(" ")[0].toLowerCase();

  return (
    <section className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-[300px_1fr] md:items-start">
      <div className="rounded-2xl border border-[color:var(--hairline)] bg-white p-6">
        {selectedDay ? (
          <div>
            <button
              type="button"
              onClick={() => setSelectedDay(null)}
              className="text-sm text-[color:var(--ink-muted)] transition-colors duration-150 hover:text-[color:var(--ink)]"
            >
              ← Séances recommandées
            </button>
            <h2 className="mt-2 font-display text-xl font-semibold text-[color:var(--ink)]">
              {selectedDay.day} {monthWord}
            </h2>
            {selectedDay.detail ? (
              <p
                className="mt-3 rounded-xl p-3 text-sm"
                style={{
                  background: TONE_VAR[selectedDay.grade],
                  color: TONE_FG[selectedDay.grade],
                }}
              >
                {selectedDay.detail}
              </p>
            ) : (
              <p className="mt-3 text-sm text-[color:var(--ink-muted)]">Pas de séance ce jour-là.</p>
            )}
          </div>
        ) : (
          recommendedPanel
        )}
      </div>

      <PatientCalendar
        monthLabel={monthLabel}
        prevMonthKey={prevMonthKey}
        nextMonthKey={nextMonthKey}
        leadingBlanks={leadingBlanks}
        days={days}
        todayDay={todayDay}
        selectedDay={selectedDay?.day ?? null}
        onSelectDay={setSelectedDay}
      />
    </section>
  );
}
