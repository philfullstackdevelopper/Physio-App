import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowRight, CalendarDays, Lightbulb } from "lucide-react";
import ProgressRing from "@/components/ProgressRing";
import ExerciseIllustration from "@/components/ExerciseIllustration";
import { goalShortFor, type ExerciseDose } from "@/lib/exercise/prescription";

export type ProgrammeExercise = { id: string; name: string; instructions: string | null; categoryLabel: string | null; dose?: ExerciseDose | null };
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
//
// (Philippe, 2026-11-06 : audit, on allège) La carte « Votre progression
// cette semaine » de la colonne de droite (2e montagne, grands écrans) est
// retirée : la progression de la semaine était montrée 3-4 fois (accueil,
// anneau de la séance, cette carte). Restent l'anneau ici et la montagne de
// l'accueil. Sans elle, la colonne de droite n'aurait plus tenu que le
// « Conseil du jour » : la séance prend toute la largeur ; le conseil passe
// dans la ligne de titre sur grand écran, et reste en bandeau sous la séance
// sur tablette (comme avant).
export default function ProgrammeView({
  week,
  workouts,
  tip,
}: {
  week: number;
  workouts: ProgrammeWorkout[];
  tip: string;
}) {
  const t = useTranslations("patient.programme");
  const tc = useTranslations("patient.common");
  const tGoal = useTranslations("exercise.goal");
  return (
    <main className="flex min-h-[calc(100dvh-var(--phone-chrome))] flex-col p-4 max-sm:short:py-2 sm:min-h-dvh sm:p-6 short:sm:py-4">
      <div className="flex flex-1 flex-col">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-ink">{t("title")}</h1>
            <p className="mt-0.5 hidden text-sm text-muted sm:block">{t("subtitle")}</p>
          </div>
          {/* Grand écran : le conseil du jour dans la ligne de titre (ne prend
              aucune hauteur, la séance tient sur un écran). Tablette : en
              bandeau sous la séance (plus bas). */}
          {workouts.length > 0 && (
            <p className="hidden min-w-0 max-w-xl flex-1 items-start gap-2 rounded-2xl border border-line bg-brand-soft px-3.5 py-2 text-xs text-ink/80 shadow-sm lg:flex">
              <Lightbulb className="h-4 w-4 shrink-0 text-brand" strokeWidth={1.75} />
              <span className="line-clamp-2">
                <span className="font-semibold text-ink">{t("tipTitle")} · </span>
                {tip}
              </span>
            </p>
          )}
          <span className="flex items-center gap-2 rounded-full border border-line bg-surface px-3.5 py-1.5 text-sm font-medium text-ink shadow-sm">
            <CalendarDays className="h-4 w-4 text-brand" strokeWidth={1.75} />
            {tc("weekN", { n: week })}
          </span>
        </div>

        {workouts.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-line bg-surface p-5 text-sm text-muted shadow-sm">
            {tc("notConfigured")}
          </p>
        ) : (
          <div className="mt-4 flex flex-1 flex-col gap-4 max-sm:short:mt-2">
            <div className="flex flex-1 flex-col gap-4">
              {workouts.map((workout) => {
                const target = workout.timesPerWeek ?? 0;
                const done = workout.doneThisWeek;
                const complete = target > 0 && done >= target;
                const cta = (
                  <>
                    {complete ? t("redo") : t("start")}
                    <ArrowRight className="h-4 w-4" strokeWidth={2} />
                  </>
                );
                const ctaClass =
                  "items-center justify-center gap-2 rounded-full bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark";

                return (
                  <section key={workout.id} className="flex flex-1 flex-col rounded-2xl border border-line bg-surface p-4 shadow-sm max-sm:short:p-3 sm:p-5">
                    <div className="flex items-center gap-4">
                      <ProgressRing value={done} max={target || 1} size={56} className={`shrink-0 ${complete ? "text-ok" : "text-brand"}`} />
                      <div className="min-w-0 flex-1">
                        {(workout.isActive || complete) && (
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
                              complete ? "bg-ok-soft text-ok" : "bg-brand/15 text-brand"
                            }`}
                          >
                            {complete ? t("completeThisWeek") : t("current")}
                          </span>
                        )}
                        <h2 className="mt-1 text-lg font-semibold leading-tight text-ink">{workout.name}</h2>
                        <p className="mt-0.5 line-clamp-1 text-sm text-muted">
                          {target > 0 ? t("doneOfTarget", { done, target }) : t("doneTimes", { done })}
                          {workout.durationMinutes != null && ` · ${workout.durationMinutes} min`}
                          {workout.description && <span className="hidden md:inline"> · {workout.description}</span>}
                        </p>
                      </div>
                      <Link href={`/patient/${workout.id}/seance`} className={`hidden shrink-0 sm:flex ${ctaClass}`}>
                        {cta}
                      </Link>
                    </div>

                    {/* Petit téléphone (audit 2026-10-10) : marges réduites, nom sur une
                        ligne et zone masquée — la séance tient entière sans défiler. */}
                    <h3 className="mt-4 text-sm font-semibold text-ink max-sm:short:mt-2">
                      {t("yourExercises")} <span className="font-normal text-muted">· {workout.exercises.length}</span>
                    </h3>
                    <div className="mt-2 grid flex-1 auto-rows-fr grid-cols-2 gap-2 max-sm:short:mt-1.5 max-sm:short:gap-1.5 lg:grid-cols-3">
                      {workout.exercises.map((ex) => (
                        <div
                          key={ex.id}
                          title={ex.instructions ?? undefined}
                          className="flex flex-col gap-2 rounded-xl bg-app-bg p-2 max-sm:short:gap-1 max-sm:short:p-1.5 sm:p-3"
                        >
                          <ExerciseIllustration
                            name={ex.name}
                            animate
                            className="min-h-12 w-full flex-1 rounded-lg bg-surface text-brand"
                          />
                          <div className="min-w-0 text-center">
                            <p className="line-clamp-2 text-sm font-medium leading-snug text-ink max-sm:short:line-clamp-1">{ex.name}</p>
                            {/* Séries × répétitions de chaque exercice (Philippe, 2026-11-02). */}
                            <p className="mt-0.5 text-xs font-semibold tabular-nums text-brand">{goalShortFor(ex.instructions, ex.dose, tGoal)}</p>
                            {ex.categoryLabel && <p className="mt-0.5 truncate text-xs text-muted short:hidden">{ex.categoryLabel}</p>}
                          </div>
                        </div>
                      ))}
                      {workout.exercises.length === 0 && (
                        <p className="text-sm text-muted">{t("noExercises")}</p>
                      )}
                    </div>

                    <Link href={`/patient/${workout.id}/seance`} className={`mt-4 flex max-sm:short:mt-2 sm:hidden ${ctaClass}`}>
                      {cta}
                    </Link>
                  </section>
                );
              })}
            </div>

            <section className="hidden items-start gap-3 rounded-2xl border border-line bg-brand-soft p-4 shadow-sm sm:flex lg:hidden short:sm:py-3">
              <Lightbulb className="h-5 w-5 shrink-0 text-brand" strokeWidth={1.75} />
              <div>
                <p className="text-sm font-semibold text-ink">{t("tipTitle")}</p>
                <p className="mt-1 text-sm text-ink/80">{tip}</p>
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
