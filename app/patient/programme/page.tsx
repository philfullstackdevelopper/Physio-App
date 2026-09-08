import Link from "next/link";
import { ArrowRight, CalendarDays, CheckCircle2, Footprints, Lightbulb, Target } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import { startOfWeekISO } from "@/lib/week";
import { loadPatientHome } from "@/lib/patient/home-data";
import { tipOfTheDay } from "@/lib/patient/tips";
import { pickActiveWorkout } from "@/lib/exercise/activeRecommendation";
import { primaryBodyPart, type BodyPart } from "@/lib/exercise/category";
import MountainScene from "@/components/MountainScene";
import ProgressRing from "@/components/ProgressRing";
import ExerciseIllustration from "@/components/ExerciseIllustration";

type Exercise = { id: string; name: string; instructions: string | null; bodyPartIds: string[] };
type Workout = {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number | null;
  times_per_week: number | null;
  workout_exercises: { exercises: Exercise | null }[];
};

// Philippe, 2026-09-08: "Mon programme" is now just what's currently assigned —
// every workout the kiné recommended (patient_recommended_workouts), each with
// its own weekly target and this week's progress. This used to be the
// week-by-week history browser; that moved to Accueil (app/patient/page.tsx).
//
// Redesigned the same day from a mockup Philippe generated: a richer "hero"
// card per workout (progress ring, mountain motif reused from Accueil, real
// per-exercise illustrations) instead of a bare bordered card with a plain
// text list, plus a sidebar with a daily tip and the week's aggregate
// progress. The mockup also showed per-exercise "3 séries · 12 répétitions"
// counts and a fixed "Semaine 3/12" — neither exists in the data model (sets/
// reps aren't tracked per exercise, and there's no fixed program length), so
// those were dropped rather than invented; `exercises.instructions` (real
// data) stands in for the former, `home.week` alone (already used on
// Accueil) for the latter.
export default async function ProgrammePage() {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  const home = await loadPatientHome(supabase, user.id);

  const { data: recRows } = await supabase
    .from("patient_recommended_workouts")
    .select(
      `priority, workouts (
        id, name, description, duration_minutes, times_per_week,
        workout_exercises ( exercises ( id, name, instructions, exercise_body_parts ( body_part_id ) ) )
      )`,
    )
    .eq("patient_id", user.id)
    .order("priority", { ascending: true });
  const { data: bodyPartRows } = await supabase.from("body_parts").select("id, slug, label, position").order("position");
  const bodyParts = (bodyPartRows ?? []) as BodyPart[];

  const recommended = (recRows ?? [])
    .map((r) => {
      const w = r.workouts as unknown as
        | (Omit<Workout, "workout_exercises"> & {
            workout_exercises: { exercises: (Omit<Exercise, "bodyPartIds"> & { exercise_body_parts: { body_part_id: string }[] }) | null }[];
          })
        | null;
      if (!w) return null;
      return {
        priority: r.priority as number,
        workout: {
          ...w,
          workout_exercises: w.workout_exercises.map((we) => ({
            exercises: we.exercises
              ? { ...we.exercises, bodyPartIds: we.exercises.exercise_body_parts.map((t) => t.body_part_id) }
              : null,
          })),
        } as Workout,
      };
    })
    .filter((r): r is { priority: number; workout: Workout } => r != null);

  const weekStart = startOfWeekISO();
  const workoutIds = recommended.map((r) => r.workout.id);
  const { data: weekLogs } = workoutIds.length
    ? await supabase
        .from("workout_logs")
        .select("workout_id, completed_at")
        .eq("patient_id", user.id)
        .in("workout_id", workoutIds)
        .gte("completed_at", weekStart)
    : { data: [] };

  const weekCounts: Record<string, number> = {};
  for (const l of weekLogs ?? []) {
    const id = l.workout_id as string;
    weekCounts[id] = (weekCounts[id] ?? 0) + 1;
  }

  const activeWorkoutId = pickActiveWorkout(
    recommended.map((r) => ({ workoutId: r.workout.id, priority: r.priority, timesPerWeek: r.workout.times_per_week })),
    weekCounts,
  );

  // Aggregate across every assigned workout, for the sidebar — each workout's
  // "done" is capped at its own target so finishing one early doesn't inflate
  // the overall week ratio.
  const totalTarget = recommended.reduce((sum, r) => sum + (r.workout.times_per_week ?? 0), 0);
  const totalDone = recommended.reduce((sum, r) => sum + Math.min(weekCounts[r.workout.id] ?? 0, r.workout.times_per_week ?? Infinity), 0);

  const tip = tipOfTheDay();

  return (
    <main className="min-h-screen p-6 sm:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-ink">Mon programme</h1>
            <p className="mt-1 text-sm text-muted">Les séances que votre kiné vous a assignées cette semaine.</p>
          </div>
          <span className="flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium text-ink shadow-sm">
            <CalendarDays className="h-4 w-4 text-brand" strokeWidth={1.75} />
            Semaine {home.week}
          </span>
        </div>

        {recommended.length === 0 ? (
          <p className="mt-6 rounded-2xl border border-line bg-surface p-5 text-sm text-muted shadow-sm">
            Votre praticien n&apos;a pas encore configuré votre programme. Revenez bientôt !
          </p>
        ) : (
          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
            <div className="flex flex-col gap-6">
              {recommended.map(({ workout }) => {
                const target = workout.times_per_week ?? 0;
                const done = weekCounts[workout.id] ?? 0;
                const complete = target > 0 && done >= target;
                const isActive = workout.id === activeWorkoutId;
                const exercises = workout.workout_exercises.map((we) => we.exercises).filter((e): e is Exercise => !!e);

                return (
                  <section key={workout.id} className="relative overflow-hidden rounded-2xl border border-line bg-surface p-6 shadow-sm">
                    {(isActive || complete) && (
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                          complete ? "bg-ok-soft text-ok" : "bg-brand/15 text-brand"
                        }`}
                      >
                        {complete ? "Terminée cette semaine" : "Séance en cours"}
                      </span>
                    )}

                    <div className="mt-3 flex items-start justify-between gap-4">
                      <div>
                        <h2 className="text-xl font-semibold text-ink">{workout.name}</h2>
                        {workout.description && <p className="mt-1 text-sm text-muted">{workout.description}</p>}
                      </div>
                      <MountainScene
                        variant="goal"
                        progress={target > 0 ? Math.min(done / target, 1) : 0}
                        className={`hidden h-20 w-32 shrink-0 sm:block ${complete ? "text-ok" : "text-brand"}`}
                      />
                    </div>

                    <div className="mt-4 flex items-center gap-3 border-b border-line pb-5">
                      <ProgressRing value={done} max={target || 1} className={complete ? "text-ok" : "text-brand"} />
                      <p className="text-sm text-muted">
                        {target > 0 ? `${done} / ${target} cette semaine` : `${done} fois cette semaine`}
                        {workout.duration_minutes != null && ` · ${workout.duration_minutes} min`}
                      </p>
                    </div>

                    <h3 className="mt-5 text-sm font-semibold text-ink">Vos exercices</h3>
                    <div className="mt-3 flex flex-col gap-2">
                      {exercises.map((ex) => {
                        const category = primaryBodyPart(ex.bodyPartIds, bodyParts);
                        return (
                          <div key={ex.id} className="flex items-center gap-4 rounded-xl bg-app-bg p-3">
                            <ExerciseIllustration name={ex.name} animate className="h-16 w-24 shrink-0 rounded-lg bg-surface text-brand" />
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-ink">{ex.name}</p>
                              {ex.instructions && <p className="mt-0.5 line-clamp-1 text-xs text-muted">{ex.instructions}</p>}
                            </div>
                            {category && (
                              <span className="shrink-0 rounded-full bg-surface px-2.5 py-1 text-xs font-medium text-muted">{category.label}</span>
                            )}
                          </div>
                        );
                      })}
                      {exercises.length === 0 && <p className="text-sm text-muted">Cette séance ne contient pas encore d&apos;exercices.</p>}
                    </div>

                    <Link
                      href={`/patient/${workout.id}`}
                      className="mt-5 flex items-center justify-center gap-2 rounded-full bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark"
                    >
                      {complete ? "Revoir cette séance" : "Démarrer cette séance"}
                      <ArrowRight className="h-4 w-4" strokeWidth={2} />
                    </Link>
                  </section>
                );
              })}
            </div>

            <div className="flex flex-col gap-4">
              <section className="flex items-start gap-3 rounded-2xl border border-line bg-brand-soft p-4 shadow-sm">
                <Lightbulb className="h-5 w-5 shrink-0 text-brand" strokeWidth={1.75} />
                <div>
                  <p className="text-sm font-semibold text-ink">Conseil du jour</p>
                  <p className="mt-1 text-sm text-ink/80">{tip}</p>
                </div>
              </section>

              <section className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
                <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                  <Target className="h-4 w-4 text-brand" strokeWidth={1.75} />
                  Votre progression cette semaine
                </p>
                {totalTarget > 0 ? (
                  <>
                    <p className="mt-3 text-sm text-muted">
                      {totalDone} / {totalTarget} séance{totalTarget > 1 ? "s" : ""} réalisée{totalDone > 1 ? "s" : ""}
                    </p>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-app-bg">
                      <div
                        className="h-full rounded-full bg-brand transition-[width]"
                        style={{ width: `${Math.round(Math.min(totalDone / totalTarget, 1) * 100)}%` }}
                      />
                    </div>
                  </>
                ) : (
                  <p className="mt-3 text-sm text-muted">{totalDone} séance{totalDone > 1 ? "s" : ""} réalisée{totalDone > 1 ? "s" : ""} cette semaine.</p>
                )}
                <div className="mt-3 flex items-start gap-2 rounded-xl bg-app-bg p-3">
                  {totalDone > 0 && totalDone === totalTarget && totalTarget > 0 ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-ok" strokeWidth={1.75} />
                  ) : (
                    <Footprints className="h-4 w-4 shrink-0 text-brand" strokeWidth={1.75} />
                  )}
                  <p className="text-xs text-muted">
                    Votre kiné vous a assigné {recommended.length} séance{recommended.length > 1 ? "s" : ""} cette semaine.
                  </p>
                </div>
              </section>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
