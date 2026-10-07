import Link from "next/link";
import { AlertTriangle, CheckCircle2, ChevronRight, Circle } from "lucide-react";
import { daysOfWeek, localDateKey, type WeekInfo } from "@/lib/patient/weeks";
import type { SegmentTone } from "@/components/WeekStrip";

// Mêmes couleurs que TONE_CLASS de WeekStrip.tsx. Recopiées ici : WeekStrip est
// un module « use client », et une constante importée depuis un module client
// arrive vide (undefined) dans ce composant serveur.
const TONE_CLASS: Record<SegmentTone, string> = {
  active: "bg-ok-soft text-ok",
  current: "bg-brand/15 text-brand",
  default: "bg-surface text-muted",
  warn: "bg-warn-soft text-warn",
  danger: "bg-danger-soft text-danger",
};
import type { SessionDetail } from "@/components/WeekProgramme";

// « Mes progrès » sur téléphone = mon parcours, en frise (Philippe, 2026-10-07 :
// « garde ma DA de frise »). Même direction artistique que la frise d'origine
// (components/WeekStrip.tsx : segments en flèche emboîtés, mêmes couleurs,
// pastille « Vous êtes ici », trait de séparation qui suit la pointe), mais
// tournée pour DESCENDRE : la semaine en cours en haut, dépliée jour par jour,
// puis les semaines précédentes en défilant. Téléphone uniquement (sm:hidden).

/** Douleur jugée élevée sur la frise (même seuil que la frise kiné). */
const PAIN_HIGH = 6;
/** Profondeur de la pointe / de l'encoche, en px (comme `notch` de WeekStrip). */
const NOTCH = 18;

const FIRST = `polygon(0 0, 100% 0, 100% calc(100% - ${NOTCH}px), 50% 100%, 0 calc(100% - ${NOTCH}px))`;
const NEXT = `polygon(0 0, 50% ${NOTCH}px, 100% 0, 100% calc(100% - ${NOTCH}px), 50% 100%, 0 calc(100% - ${NOTCH}px))`;

function dayState(sessions: SessionDetail[]) {
  if (sessions.length === 0) return "none" as const;
  return sessions.some((s) => (s.painScore ?? 0) >= PAIN_HIGH) ? ("pain" as const) : ("done" as const);
}

export function WeekFrise({
  weeks,
  currentWeekNumber,
  dayDetails,
}: {
  weeks: WeekInfo[];
  currentWeekNumber: number;
  dayDetails: Record<string, SessionDetail[]>;
}) {
  const logged = new Set(Object.keys(dayDetails).filter((k) => dayDetails[k].length > 0));
  const todayKey = localDateKey(new Date());
  // Semaine en cours puis semaines passées, de la plus récente à la plus ancienne.
  const shown = weeks.filter((w) => w.weekNumber <= currentWeekNumber).reverse();

  return (
    <section className="mt-6 sm:hidden">
      <h2 className="text-base font-semibold text-ink">Mon parcours, semaine par semaine</h2>
      <ol className="relative mt-9">
        {shown.map((w, i) => {
          const days = daysOfWeek(w, logged);
          const isCurrent = w.weekNumber === currentWeekNumber;
          const done = days.filter((d) => d.hasSession).length;
          const anyPain = days.some((d) => dayState(dayDetails[localDateKey(d.date)] ?? []) === "pain");
          const tone: SegmentTone = anyPain ? "danger" : done > 0 ? "active" : isCurrent ? "current" : "default";

          return (
            <li key={w.weekNumber} className="relative" style={{ zIndex: i, marginTop: i === 0 ? 0 : -NOTCH }}>
              {/* Pastille « Vous êtes ici », comme sur la frise d'origine. */}
              {isCurrent && (
                <div className="pointer-events-none absolute left-1/2 top-0 z-20 flex -translate-x-1/2 -translate-y-[calc(100%+6px)] flex-col items-center">
                  <span className="whitespace-nowrap rounded-full bg-brand px-3 py-1 text-xs font-semibold text-white shadow-sm">Vous êtes ici</span>
                  <span className="-mt-[3px] h-2.5 w-2.5 rotate-45 bg-brand" />
                </div>
              )}
              {/* Trait de séparation qui suit la pointe du segment au-dessus. */}
              {i > 0 && (
                <svg aria-hidden className="pointer-events-none absolute inset-x-0 top-0 z-10 w-full text-line" style={{ height: NOTCH }} viewBox={`0 0 100 ${NOTCH}`} preserveAspectRatio="none">
                  <polyline points={`0,0 50,${NOTCH} 100,0`} fill="none" stroke="currentColor" strokeWidth={2} vectorEffect="non-scaling-stroke" />
                </svg>
              )}
              <div
                style={{ clipPath: i === 0 ? FIRST : NEXT, paddingTop: i === 0 ? 16 : NOTCH + 12, paddingBottom: NOTCH + 14 }}
                className={`px-4 shadow-md ${TONE_CLASS[tone]}`}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <p className="flex items-center gap-1.5 text-lg font-semibold">
                    {w.label}
                    {anyPain ? (
                      <AlertTriangle className="h-4 w-4" strokeWidth={2.25} aria-label="Douleur élevée signalée" />
                    ) : done > 0 ? (
                      <CheckCircle2 className="h-4 w-4" strokeWidth={2.25} />
                    ) : null}
                  </p>
                  <p className="text-xs font-medium opacity-90">{w.rangeLabel}</p>
                </div>
                <p className="text-xs opacity-80">
                  {done === 0 ? "Aucune séance" : `${done} jour${done > 1 ? "s" : ""} avec une séance`}
                </p>

                {isCurrent ? (
                  // Semaine en cours : dépliée, un jour par ligne.
                  <ol className="mt-3 space-y-1.5">
                    {days.map((d) => {
                      const key = localDateKey(d.date);
                      const sessions = dayDetails[key] ?? [];
                      const state = dayState(sessions);
                      const isToday = key === todayKey;
                      const isFuture = key > todayKey;
                      const label = state === "pain" ? "Douleur élevée" : state === "done" ? "Réalisée" : isToday ? "Aujourd'hui" : isFuture ? "À venir" : "Non fait";
                      const row = (
                        <span
                          className={`flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 ${
                            state === "pain"
                              ? "bg-danger text-white"
                              : state === "done"
                                ? "bg-ok text-white"
                                : isToday
                                  ? "bg-surface text-brand ring-2 ring-brand"
                                  : "bg-surface/80 text-muted"
                          }`}
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            {state === "pain" ? (
                              <AlertTriangle className="h-4 w-4 shrink-0" strokeWidth={2.25} />
                            ) : state === "done" ? (
                              <CheckCircle2 className="h-4 w-4 shrink-0" strokeWidth={2.25} />
                            ) : (
                              <Circle className="h-2.5 w-2.5 shrink-0 fill-current" strokeWidth={0} />
                            )}
                            <span className="text-sm font-semibold capitalize">{d.dayLabel}</span>
                            <span className="truncate text-xs opacity-80">{d.dateLabel}</span>
                          </span>
                          <span className="flex shrink-0 items-center gap-1 text-xs font-medium">
                            {label}
                            {sessions.length > 0 && <ChevronRight className="h-3.5 w-3.5" strokeWidth={2} />}
                          </span>
                        </span>
                      );
                      return (
                        <li key={key}>
                          {sessions.length > 0 ? <Link href={`/patient/historique/${sessions[0].logId}`}>{row}</Link> : row}
                        </li>
                      );
                    })}
                  </ol>
                ) : (
                  // Semaines passées : les 7 jours en pastilles.
                  <div className="mt-3 grid grid-cols-7 gap-1.5">
                    {days.map((d) => {
                      const key = localDateKey(d.date);
                      const sessions = dayDetails[key] ?? [];
                      const state = dayState(sessions);
                      const pill = (
                        <span
                          className={`flex h-10 flex-col items-center justify-center rounded-xl text-[11px] font-semibold ${
                            state === "pain" ? "bg-danger text-white" : state === "done" ? "bg-ok text-white" : "bg-surface/80 text-muted"
                          }`}
                        >
                          <span>{d.dayLabel.slice(0, 3)}</span>
                          <span className="text-[10px] font-medium opacity-80">{d.date.getDate()}</span>
                        </span>
                      );
                      return sessions.length > 0 ? (
                        <Link key={key} href={`/patient/historique/${sessions[0].logId}`} aria-label={`${d.dayLabel} ${d.dateLabel}`}>
                          {pill}
                        </Link>
                      ) : (
                        <span key={key}>{pill}</span>
                      );
                    })}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
