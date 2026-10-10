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
      href={`/patient/${w.id}/seance`}
      className={`block rounded-2xl border border-line bg-surface p-5 shadow-sm transition hover:shadow-md ${
        done || isRec ? "border-l-[3px] border-l-brand" : ""
      }`}
    >
      {done ? (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-brand">
          <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2} />
          Faite aujourd&apos;hui
        </span>
      ) : isRec ? (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-brand">
          <Star className="h-3.5 w-3.5" strokeWidth={2} />
          Recommandée par votre praticien
        </span>
      ) : null}
      <div className="mt-2 flex items-baseline justify-between gap-3">
        <h3 className="text-lg font-semibold text-ink">{w.name}</h3>
        {/* Durée non renseignée : rien plutôt qu'un « min » seul (audit du 2026-10-08). */}
        {w.duration_minutes != null && (
          <span className="shrink-0 font-bold text-brand">
            <span className="text-3xl tabular-nums">{w.duration_minutes}</span>
            <span className="text-sm font-medium text-muted"> min</span>
          </span>
        )}
      </div>
      {w.description && <p className="mt-1 text-sm text-muted">{w.description}</p>}
      {exNames.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {exNames.map((n, i) => (
            <li key={i} className="rounded-full bg-app-bg px-2.5 py-1 text-xs text-muted">
              {n}
            </li>
          ))}
        </ul>
      )}
      <span className="mt-4 inline-block text-sm font-medium text-brand">
        {done ? "Refaire la séance →" : "Commencer la séance →"}
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
    <main className="p-6 max-sm:min-h-[calc(100dvh-var(--phone-chrome))] sm:min-h-screen sm:p-8">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-semibold text-ink">Séance du jour</h1>
        <p className="mt-1 text-sm text-muted">La séance suggérée par votre praticien en ce moment.</p>

        {/* Toutes les séances de la semaine faites (audit du 2026-10-08 : ce
            message ne pouvait jamais s'afficher, la séance restant active). */}
        {weekComplete && activeWorkout && !doneToday && (
          <div className="mt-6 rounded-2xl border border-line bg-surface p-5 pl-4 border-l-[3px] border-l-ok">
            <p className="flex items-center gap-1.5 text-xl font-semibold text-ink">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-ok" strokeWidth={1.75} />
              Bravo, vous avez fait toutes vos séances de la semaine !
            </p>
            <p className="mt-1 text-sm text-muted">Vous pouvez quand même refaire la séance si vous le souhaitez.</p>
          </div>
        )}

        {doneToday && activeWorkout && (
          <div className="mt-6 rounded-2xl border border-line bg-surface p-5 pl-4 border-l-[3px] border-l-brand">
            <p className="flex items-center gap-1.5 text-xl font-semibold text-ink">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-brand" strokeWidth={1.75} />
              Séance faite aujourd&apos;hui
            </p>
            <p className="mt-1 text-sm text-muted">
              Beau travail — revenez demain pour garder votre série.
            </p>
          </div>
        )}

        {activeWorkout ? (
          <div className="mt-6">
            <WorkoutCard w={activeWorkout} isRec done={doneToday} />
          </div>
        ) : (
          <div className="mt-8 rounded-xl border border-line bg-surface p-6 text-center text-sm text-muted shadow-sm">
            Votre praticien n&apos;a pas encore configuré votre programme. Revenez bientôt !
          </div>
        )}
      </div>
    </main>
  );
}
