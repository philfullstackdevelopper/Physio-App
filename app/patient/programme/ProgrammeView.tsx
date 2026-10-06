import Link from "next/link";
import { ArrowRight, CalendarDays, Lightbulb, Target } from "lucide-react";
import MountainScene from "@/components/MountainScene";
import ProgressRing from "@/components/ProgressRing";
import ExerciseIllustration from "@/components/ExerciseIllustration";

export type ProgrammeExercise = { id: string; name: string; instructions: string | null; categoryLabel: string | null };
export type ProgrammeWorkout = {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number | null;
  timesPerWeek: number | null;
  doneThisWeek: number;
  isActive: boolean;
  exercises: ProgrammeExercise[];
};

// Affichage seul de « Mon programme » (les données viennent de page.tsx) —
// séparé pour pouvoir le prévisualiser avec des données fictives sans
// connexion Clerk.
//
// Philippe, 2026-10-01 : « tout sur une page » — tient sur un écran sans
// défiler, y compris sur son PC (zoom 150 % → zone utile ~1038×549 à côté de
// la barre latérale). D'où : anneau de progression + bouton « Démarrer » dans
// la ligne de titre de la séance, exercices en tuiles compactes côte à côte
// (consigne complète au survol, `title`), et la carte « progression » de la
// colonne de droite masquée sous lg, où elle répète l'anneau.
//
// Puis (même jour) : « peu importe l'interface, cela prend en compte tout
// l'écran, pas juste la moitié » — la page occupe toute la hauteur (moins la
// barre du bas sur téléphone) et toute la largeur ; la carte de séance s'étire et
// ses tuiles d'exercice se partagent la hauteur restante (auto-rows-fr),
// illustrations agrandies d'autant. min-h et non h : si le contenu dépasse
// (beaucoup d'exercices, petit écran), la page défile au lieu d'être coupée.
// Sur téléphone, le sous-titre et le « Conseil du jour » sont masqués pour
// que la séance tienne entière.
export default function ProgrammeView({
  week,
  workouts,
  tip,
}: {
  week: number;
  workouts: ProgrammeWorkout[];
  tip: string;
}) {
  // Agrégat pour la colonne de droite — chaque séance plafonnée à son propre
  // objectif, pour qu'en finir une en avance ne gonfle pas le ratio global.
  const totalTarget = workouts.reduce((sum, w) => sum + (w.timesPerWeek ?? 0), 0);
  const totalDone = workouts.reduce((sum, w) => sum + Math.min(w.doneThisWeek, w.timesPerWeek ?? Infinity), 0);

  return (
    <main className="flex min-h-[calc(100dvh-var(--phone-chrome))] flex-col p-4 sm:min-h-dvh sm:p-6 short:sm:py-4">
      <div className="flex flex-1 flex-col">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-ink">Mon programme</h1>
            <p className="mt-0.5 hidden text-sm text-muted sm:block">Les séances que votre kiné vous a assignées cette semaine.</p>
          </div>
          <span className="flex items-center gap-2 rounded-full border border-line bg-surface px-3.5 py-1.5 text-sm font-medium text-ink shadow-sm">
            <CalendarDays className="h-4 w-4 text-brand" strokeWidth={1.75} />
            Semaine {week}
          </span>
        </div>

        {workouts.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-line bg-surface p-5 text-sm text-muted shadow-sm">
            Votre praticien n&apos;a pas encore configuré votre programme. Revenez bientôt !
          </p>
        ) : (
          <div className="mt-4 grid flex-1 gap-4 lg:grid-cols-[1fr_300px]">
            <div className="flex flex-col gap-4">
              {workouts.map((workout) => {
                const target = workout.timesPerWeek ?? 0;
                const done = workout.doneThisWeek;
                const complete = target > 0 && done >= target;
                const cta = (
                  <>
                    {complete ? "Refaire cette séance" : "Démarrer cette séance"}
                    <ArrowRight className="h-4 w-4" strokeWidth={2} />
                  </>
                );
                const ctaClass =
                  "items-center justify-center gap-2 rounded-full bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark";

                return (
                  <section key={workout.id} className="flex flex-1 flex-col rounded-2xl border border-line bg-surface p-4 shadow-sm sm:p-5">
                    <div className="flex items-center gap-4">
                      <ProgressRing value={done} max={target || 1} size={56} className={`shrink-0 ${complete ? "text-ok" : "text-brand"}`} />
                      <div className="min-w-0 flex-1">
                        {(workout.isActive || complete) && (
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
                              complete ? "bg-ok-soft text-ok" : "bg-brand/15 text-brand"
                            }`}
                          >
                            {complete ? "Terminée cette semaine" : "Séance en cours"}
                          </span>
                        )}
                        <h2 className="mt-1 text-lg font-semibold leading-tight text-ink">{workout.name}</h2>
                        <p className="mt-0.5 line-clamp-1 text-sm text-muted">
                          {target > 0 ? `${done} / ${target} cette semaine` : `${done} fois cette semaine`}
                          {workout.durationMinutes != null && ` · ${workout.durationMinutes} min`}
                          {workout.description && <span className="hidden md:inline"> · {workout.description}</span>}
                        </p>
                      </div>
                      <Link href={`/patient/${workout.id}/seance`} className={`hidden shrink-0 sm:flex ${ctaClass}`}>
                        {cta}
                      </Link>
                    </div>

                    <h3 className="mt-4 text-sm font-semibold text-ink">
                      Vos exercices <span className="font-normal text-muted">· {workout.exercises.length}</span>
                    </h3>
                    <div className="mt-2 grid flex-1 auto-rows-fr grid-cols-2 gap-2 lg:grid-cols-3">
                      {workout.exercises.map((ex) => (
                        <div
                          key={ex.id}
                          title={ex.instructions ?? undefined}
                          className="flex flex-col gap-2 rounded-xl bg-app-bg p-2 sm:p-3"
                        >
                          <ExerciseIllustration
                            name={ex.name}
                            animate
                            className="min-h-12 w-full flex-1 rounded-lg bg-surface text-brand"
                          />
                          <div className="min-w-0 text-center">
                            <p className="line-clamp-2 text-sm font-medium leading-snug text-ink">{ex.name}</p>
                            {ex.categoryLabel && <p className="mt-0.5 truncate text-xs text-muted">{ex.categoryLabel}</p>}
                          </div>
                        </div>
                      ))}
                      {workout.exercises.length === 0 && (
                        <p className="text-sm text-muted">Cette séance ne contient pas encore d&apos;exercices.</p>
                      )}
                    </div>

                    <Link href={`/patient/${workout.id}/seance`} className={`mt-4 flex sm:hidden ${ctaClass}`}>
                      {cta}
                    </Link>
                  </section>
                );
              })}
            </div>

            <div className="flex flex-col gap-4">
              <section className="hidden items-start gap-3 rounded-2xl border border-line bg-brand-soft p-4 shadow-sm sm:flex">
                <Lightbulb className="h-5 w-5 shrink-0 text-brand" strokeWidth={1.75} />
                <div>
                  <p className="text-sm font-semibold text-ink">Conseil du jour</p>
                  <p className="mt-1 text-sm text-ink/80">{tip}</p>
                </div>
              </section>

              <section className="hidden flex-1 flex-col rounded-2xl border border-line bg-surface p-4 shadow-sm lg:flex">
                <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                  <Target className="h-4 w-4 text-brand" strokeWidth={1.75} />
                  Votre progression cette semaine
                </p>
                <p className="mt-2 text-sm text-muted">
                  {totalTarget > 0
                    ? `${totalDone} / ${totalTarget} séance${totalTarget > 1 ? "s" : ""} réalisée${totalDone > 1 ? "s" : ""}`
                    : `${totalDone} séance${totalDone > 1 ? "s" : ""} réalisée${totalDone > 1 ? "s" : ""} cette semaine.`}
                </p>
                {totalTarget > 0 && (
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-app-bg">
                    <div
                      className="h-full rounded-full bg-brand transition-[width]"
                      style={{ width: `${Math.round(Math.min(totalDone / totalTarget, 1) * 100)}%` }}
                    />
                  </div>
                )}
                {/* La montagne remplit la place restante de la colonne. */}
                <MountainScene
                  variant="goal"
                  progress={totalTarget > 0 ? Math.min(totalDone / totalTarget, 1) : 0}
                  className={`mt-4 min-h-20 w-full flex-1 ${totalTarget > 0 && totalDone >= totalTarget ? "text-ok" : "text-brand"}`}
                />
              </section>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
