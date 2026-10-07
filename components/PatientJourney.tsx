import Link from "next/link";
import { AlertTriangle, CheckCircle2, ChevronRight, Circle } from "lucide-react";
import { daysOfWeek, localDateKey, type WeekInfo } from "@/lib/patient/weeks";
import type { SessionDetail } from "@/components/WeekProgramme";

// « Mes progrès » sur téléphone = mon parcours (Philippe, 2026-10-07) : la
// semaine en cours dépliée jour par jour en haut, les chiffres et la courbe de
// douleur au milieu (dans la page), puis les semaines précédentes en
// descendant. Seule page patient qui défile, à sa demande. Téléphone
// uniquement (sm:hidden) — l'ordinateur garde son « Mes progrès » actuel.

/** Douleur jugée élevée sur la frise (même seuil que la frise kiné). */
const PAIN_HIGH = 6;

function dayState(sessions: SessionDetail[]) {
  if (sessions.length === 0) return "none" as const;
  return sessions.some((s) => (s.painScore ?? 0) >= PAIN_HIGH) ? ("pain" as const) : ("done" as const);
}

/** La semaine en cours, ses 7 jours reliés par un trait (frise verticale). */
export function CurrentWeekTimeline({
  week,
  dayDetails,
}: {
  week: WeekInfo;
  dayDetails: Record<string, SessionDetail[]>;
}) {
  const logged = new Set(Object.keys(dayDetails).filter((k) => dayDetails[k].length > 0));
  const todayKey = localDateKey(new Date());
  const days = daysOfWeek(week, logged);
  const doneCount = days.filter((d) => d.hasSession).length;

  return (
    <section className="mt-4 rounded-3xl bg-surface p-4 shadow-soft sm:hidden">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold text-ink">Cette semaine</h2>
        <p className="text-xs text-muted">
          {week.label} · {week.rangeLabel}
        </p>
      </div>
      <p className="mt-0.5 text-sm text-muted">
        {doneCount === 0 ? "Aucune séance pour l'instant." : `${doneCount} jour${doneCount > 1 ? "s" : ""} avec une séance réalisée.`}
      </p>

      <ol className="relative mt-3">
        <span aria-hidden className="absolute bottom-5 left-[15px] top-5 w-0.5 bg-line" />
        {days.map((d) => {
          const key = localDateKey(d.date);
          const sessions = dayDetails[key] ?? [];
          const state = dayState(sessions);
          const isToday = key === todayKey;
          const isFuture = key > todayKey;
          const box =
            state === "pain"
              ? "bg-danger-soft text-danger"
              : state === "done"
                ? "bg-ok-soft text-ok"
                : isToday
                  ? "bg-brand/10 text-brand ring-1 ring-brand"
                  : "bg-app-bg text-muted";
          const label = state === "pain" ? "Douleur élevée" : state === "done" ? "Réalisée" : isToday ? "Aujourd'hui" : isFuture ? "À venir" : "Non fait";
          const content = (
            <>
              <span
                className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 ${
                  state === "pain"
                    ? "border-danger bg-danger text-white"
                    : state === "done"
                      ? "border-ok bg-ok text-white"
                      : isToday
                        ? "border-brand bg-surface text-brand"
                        : "border-line bg-surface text-muted"
                }`}
              >
                {state === "pain" ? (
                  <AlertTriangle className="h-4 w-4" strokeWidth={2.25} />
                ) : state === "done" ? (
                  <CheckCircle2 className="h-4 w-4" strokeWidth={2.25} />
                ) : (
                  <Circle className="h-2.5 w-2.5 fill-current" strokeWidth={0} />
                )}
              </span>
              <span className={`flex min-w-0 flex-1 items-center justify-between gap-2 rounded-2xl px-3 py-3 ${box}`}>
                <span className="flex min-w-0 items-baseline gap-2">
                  <span className="text-base font-semibold capitalize">{d.dayLabel}</span>
                  <span className="truncate text-sm opacity-80">{d.dateLabel}</span>
                </span>
                <span className="flex shrink-0 items-center gap-1 text-xs font-medium">
                  {label}
                  {sessions.length > 0 && <ChevronRight className="h-3.5 w-3.5" strokeWidth={2} />}
                </span>
              </span>
            </>
          );
          return (
            <li key={key} className="relative py-1">
              {sessions.length > 0 ? (
                <Link href={`/patient/historique/${sessions[0].logId}`} className="flex items-center gap-3">
                  {content}
                </Link>
              ) : (
                <div className="flex items-center gap-3">{content}</div>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/** Les semaines passées, de la plus récente à la plus ancienne. */
export function PastWeeks({
  weeks,
  currentWeekNumber,
  dayDetails,
}: {
  weeks: WeekInfo[];
  currentWeekNumber: number;
  dayDetails: Record<string, SessionDetail[]>;
}) {
  const logged = new Set(Object.keys(dayDetails).filter((k) => dayDetails[k].length > 0));
  const past = weeks.filter((w) => w.weekNumber < currentWeekNumber).reverse();
  if (past.length === 0) return null;

  return (
    <section className="mt-6 sm:hidden">
      <h2 className="text-base font-semibold text-ink">Semaines précédentes</h2>
      <ol className="mt-3 space-y-3">
        {past.map((w) => {
          const days = daysOfWeek(w, logged);
          const done = days.filter((d) => d.hasSession).length;
          const anyPain = days.some((d) => dayState(dayDetails[localDateKey(d.date)] ?? []) === "pain");
          return (
            <li key={w.weekNumber} className="rounded-3xl bg-surface p-4 shadow-soft">
              <div className="flex items-baseline justify-between gap-2">
                <p className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                  {w.label}
                  {anyPain && <AlertTriangle className="h-3.5 w-3.5 text-danger" strokeWidth={2.25} aria-label="Douleur élevée signalée" />}
                </p>
                <p className="text-xs text-muted">{w.rangeLabel}</p>
              </div>
              <p className="mt-0.5 text-xs text-muted">
                {done === 0 ? "Aucune séance" : `${done} jour${done > 1 ? "s" : ""} avec une séance`}
              </p>
              <div className="mt-3 grid grid-cols-7 gap-1.5">
                {days.map((d) => {
                  const key = localDateKey(d.date);
                  const sessions = dayDetails[key] ?? [];
                  const state = dayState(sessions);
                  const pill = (
                    <span
                      className={`flex h-10 flex-col items-center justify-center rounded-xl text-[11px] font-semibold ${
                        state === "pain" ? "bg-danger text-white" : state === "done" ? "bg-ok text-white" : "bg-app-bg text-muted"
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
            </li>
          );
        })}
      </ol>
    </section>
  );
}
