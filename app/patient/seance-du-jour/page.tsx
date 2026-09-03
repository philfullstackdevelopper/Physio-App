import Link from "next/link";
import { CheckCircle2, Star } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import { loadPatientHome, type Workout } from "@/lib/patient/home-data";

/** One workout card. `done` = already completed today, `isRec` = the
 *  practitioner's recommended one. Status is carried by a left accent border
 *  and small icon+text, not a filled color block. */
function WorkoutCard({ w, isRec, done = false }: { w: Workout; isRec: boolean; done?: boolean }) {
  const exNames = (w.workout_exercises ?? [])
    .map((we) => we.exercises?.name)
    .filter(Boolean) as string[];
  return (
    <Link
      href={`/patient/${w.id}`}
      className={`block rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md ${
        done ? "border-l-2 border-l-blue-600" : isRec ? "border-l-2 border-l-blue-600" : ""
      }`}
    >
      {done ? (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-blue-700">
          <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2} />
          Faite aujourd&apos;hui
        </span>
      ) : isRec ? (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-blue-700">
          <Star className="h-3.5 w-3.5" strokeWidth={2} />
          Recommandée par votre praticien
        </span>
      ) : null}
      <div className="mt-2 flex items-baseline justify-between gap-3">
        <h3 className="text-lg font-semibold text-slate-900">{w.name}</h3>
        <span className="shrink-0 font-bold text-blue-700">
          <span className="text-3xl tabular-nums">{w.duration_minutes}</span>
          <span className="text-sm font-medium text-slate-400"> min</span>
        </span>
      </div>
      {w.description && <p className="mt-1 text-sm text-slate-500">{w.description}</p>}
      {exNames.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {exNames.map((n, i) => (
            <li key={i} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
              {n}
            </li>
          ))}
        </ul>
      )}
      <span className="mt-4 inline-block text-sm font-medium text-blue-700">
        {done ? "Refaire la séance →" : "Voir la séance →"}
      </span>
    </Link>
  );
}

export default async function SeanceDuJourPage() {
  const supabase = await createClient();
  const user = await requireUser(supabase);

  const home = await loadPatientHome(supabase, user.id);
  const { activeWorkout, doneToday, weekComplete } = home;

  return (
    <main className="min-h-screen p-6 sm:p-8">
      <div className="mx-auto max-w-2xl">
        <h1 className="font-display text-3xl font-semibold text-slate-900">Séance du jour</h1>
        <p className="mt-1 text-sm text-slate-500">La séance suggérée par votre praticien en ce moment.</p>

        {doneToday && activeWorkout && (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 pl-4 border-l-2 border-l-blue-600">
            <p className="flex items-center gap-1.5 font-display text-xl font-semibold text-slate-900">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-blue-600" strokeWidth={1.75} />
              Séance faite aujourd&apos;hui
            </p>
            <p className="mt-1 text-sm text-slate-600">
              Beau travail — revenez demain pour garder votre série.
            </p>
          </div>
        )}

        {activeWorkout ? (
          <div className="mt-6">
            <WorkoutCard w={activeWorkout} isRec done={doneToday} />
          </div>
        ) : (
          <div className="mt-8 rounded-xl border border-slate-100 bg-white p-6 text-center text-sm text-slate-500 shadow-sm">
            {weekComplete
              ? "Bravo, vous avez fait toutes vos séances de la semaine !"
              : "Votre praticien n'a pas encore configuré votre programme. Revenez bientôt !"}
          </div>
        )}
      </div>
    </main>
  );
}
