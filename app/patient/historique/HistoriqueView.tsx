import Link from "next/link";
import { ChevronRight } from "lucide-react";
import ExerciseIllustration from "@/components/ExerciseIllustration";
import type { HistorySlot, HistoryWeek } from "@/lib/patient/historyWeeks";

// Affichage seul de l'Historique (les données viennent de page.tsx) — séparé
// pour pouvoir le prévisualiser avec des données fictives sans connexion
// (/prototypes/patient-ecrans?ecran=historique).
//
// Semaine par semaine (Philippe, 2026-11-02) : sous le titre de chaque
// semaine, une bande de la même hauteur qu'une carte avec les dessins des
// exercices — en bleu ceux des séances faites, en rouge ceux des séances
// manquées, grisés ceux qui restent à faire cette semaine. Puis les séances
// terminées, avec leur date.
//
// Une page = un écran (audit des formats, 2026-10-10) : le titre reste en
// place et seule la liste défile.

const SLOT_STYLE: Record<HistorySlot["status"], { box: string; img: string; label: string }> = {
  done: { box: "bg-blue-50 ring-blue-100", img: "", label: "Séance faite" },
  // Dessins bleus passés au rouge par un filtre de couleur.
  missed: { box: "bg-red-50 ring-red-100", img: "[filter:hue-rotate(140deg)_saturate(1.8)]", label: "Séance manquée" },
  todo: { box: "bg-slate-50 ring-slate-100", img: "grayscale opacity-40", label: "Séance à faire" },
};

function WeekStrip({ slots }: { slots: HistorySlot[] }) {
  return (
    <div className="flex h-16 items-center gap-2 overflow-x-auto rounded-xl [scrollbar-width:none] max-sm:gap-1.5 max-sm:px-2 border border-slate-100 bg-white px-2.5 shadow-sm">
      {slots.map((slot, i) => {
        const s = SLOT_STYLE[slot.status];
        return (
          <div
            key={i}
            title={`${s.label} : ${slot.workoutName}`}
            aria-label={`${s.label} : ${slot.workoutName}`}
            className={`flex h-12 shrink-0 items-center gap-0.5 rounded-lg px-1 ring-1 max-sm:h-10 max-sm:gap-0 ${s.box}`}
          >
            {slot.exercises.length > 0 ? (
              slot.exercises.map((name, j) => (
                <ExerciseIllustration key={j} name={name} animate={false} className={`h-10 w-10 text-blue-600 max-sm:h-7 max-sm:w-7 ${s.img}`} />
              ))
            ) : (
              <span className="px-2 text-xs text-slate-400">Séance</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Legend() {
  const dot = "inline-block h-2.5 w-2.5 rounded-full";
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
      <span className="flex items-center gap-1.5">
        <span className={`${dot} bg-blue-500`} /> Fait
      </span>
      <span className="flex items-center gap-1.5">
        <span className={`${dot} bg-red-500`} /> Manqué
      </span>
      <span className="flex items-center gap-1.5">
        <span className={`${dot} bg-slate-300`} /> À faire
      </span>
    </div>
  );
}

export default function HistoriqueView({
  weeks,
}: {
  /** Semaines du plus récent au plus ancien (lib/patient/historyWeeks.ts). */
  weeks: HistoryWeek[];
}) {
  const empty = weeks.length === 0;
  return (
    <main className="flex flex-col p-6 max-sm:h-[calc(100dvh-var(--phone-chrome))] max-sm:p-4 sm:h-dvh sm:p-8 short:sm:py-4">
      <div className="mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h1 className="font-display text-3xl font-semibold text-slate-900 short:text-2xl">Historique</h1>
            <p className="mt-1 text-sm text-slate-500">Vos séances, semaine par semaine.</p>
          </div>
          {!empty && <Legend />}
        </div>

        {empty ? (
          <div className="mt-8 rounded-xl border border-slate-100 bg-white p-6 text-center text-sm text-slate-500 shadow-sm">
            Aucune séance terminée pour le moment.
          </div>
        ) : (
          <div className="-mx-1 mt-5 min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain px-1 pb-1 short:mt-3 short:space-y-4">
            {weeks.map((w) => {
              const complete = w.target != null && w.done >= w.target;
              return (
                <section key={w.key}>
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                      {w.label}
                      {w.current && (
                        <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[11px] font-semibold text-white">Cette semaine</span>
                      )}
                    </h2>
                    {w.target != null && (
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums ${
                          complete ? "bg-emerald-50 text-emerald-700" : w.current ? "bg-slate-100 text-slate-600" : "bg-red-50 text-red-700"
                        }`}
                      >
                        {w.done}/{w.target} séance{w.target > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>

                  <div className="mt-2 space-y-2">
                    {w.slots.length > 0 && <WeekStrip slots={w.slots} />}
                    {w.sessions.map((s) => (
                      <Link
                        key={s.id}
                        href={`/patient/historique/${s.id}`}
                        className="flex h-16 items-center gap-3 rounded-xl border border-slate-100 bg-white px-3 shadow-sm transition hover:shadow-md"
                      >
                        <span className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-lg bg-blue-50 leading-none text-blue-700">
                          <span className="text-[10px] font-semibold uppercase">{s.weekday}</span>
                          <span className="mt-0.5 text-base font-bold">{s.day}</span>
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-slate-900">{s.name}</p>
                          <p className="text-xs text-slate-400">
                            {s.day} {s.month} · {s.time}
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" strokeWidth={2} />
                      </Link>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
