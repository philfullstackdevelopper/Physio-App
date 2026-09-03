"use client";

import { useState } from "react";
import PatientCalendar, { type CalendarDay } from "@/components/PatientCalendar";
import type { DayGrade } from "@/lib/exercise/dayGrade";

const DETAIL_TONE: Record<DayGrade, string> = {
  green: "bg-ok-soft text-ok",
  yellow: "bg-warn-soft text-warn",
  red: "bg-danger-soft text-danger",
  grey: "bg-app-bg text-muted",
};

export default function CalendarPanel(props: {
  monthLabel: string;
  prevMonthKey: string;
  nextMonthKey: string;
  leadingBlanks: number;
  days: CalendarDay[];
  todayDay: number | null;
}) {
  const [selected, setSelected] = useState<CalendarDay | null>(null);
  const monthWord = props.monthLabel.split(" ")[0].toLowerCase();
  return (
    <div>
      <PatientCalendar {...props} selectedDay={selected?.day ?? null} onSelectDay={setSelected} />
      {selected && (
        <div className={`mt-3 rounded-xl px-4 py-3 text-sm ${DETAIL_TONE[selected.grade]}`}>
          <p className="font-semibold">{selected.day} {monthWord}</p>
          <p className="mt-0.5">{selected.detail ?? "Pas de séance ce jour-là."}</p>
        </div>
      )}
    </div>
  );
}
