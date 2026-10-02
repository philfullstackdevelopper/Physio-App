import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import { startOfWeekISO } from "@/lib/week";
import { loadPatientHome } from "@/lib/patient/home-data";
import { thisWeekStartDateKey } from "@/lib/patient/weeks";
import { tipOfTheDay } from "@/lib/patient/tips";
import { resolveWorkoutForWeek } from "@/lib/exercise/activeRecommendation";
import { primaryBodyPart, type BodyPart } from "@/lib/exercise/category";
import ProgrammeView, { type ProgrammeWorkout } from "./ProgrammeView";

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
      `week_start_date, week_count, workouts (
        id, name, description, duration_minutes, times_per_week,
        workout_exercises ( exercises ( id, name, instructions, exercise_body_parts ( body_part_id ) ) )
      )`,
    )
    .eq("patient_id", user.id);
  const { data: bodyPartRows } = await supabase.from("body_parts").select("id, slug, label, position").order("position");
  const bodyParts = (bodyPartRows ?? []) as BodyPart[];

  const allAssignments = (recRows ?? [])
    .map((r) => {
      const w = r.workouts as unknown as
        | (Omit<Workout, "workout_exercises"> & {
            workout_exercises: { exercises: (Omit<Exercise, "bodyPartIds"> & { exercise_body_parts: { body_part_id: string }[] }) | null }[];
          })
        | null;
      if (!w) return null;
      return {
        weekStartDate: r.week_start_date as string,
        weekCount: (r.week_count as number | null) ?? null,
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
    .filter((r): r is { weekStartDate: string; weekCount: number | null; workout: Workout } => r != null);

  // Only one séance is ever "assigned" at a time now — the one whose
  // week_start_date is on or before this week's Monday (see lib/exercise/
  // activeRecommendation.ts). `recommended` used to list every recommended
  // workout; now it's that single active one (or empty), so the rendering
  // below — written for a list — still works unchanged.
  const activeWorkoutId = resolveWorkoutForWeek(
    allAssignments.map((r) => ({ workoutId: r.workout.id, weekStartDate: r.weekStartDate, weekCount: r.weekCount })),
    thisWeekStartDateKey(),
  );
  const recommended = allAssignments.filter((r) => r.workout.id === activeWorkoutId).map((r) => ({ workout: r.workout }));

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

  const workouts: ProgrammeWorkout[] = recommended.map(({ workout }) => ({
    id: workout.id,
    name: workout.name,
    description: workout.description,
    durationMinutes: workout.duration_minutes,
    timesPerWeek: workout.times_per_week,
    doneThisWeek: weekCounts[workout.id] ?? 0,
    isActive: workout.id === activeWorkoutId,
    exercises: workout.workout_exercises
      .map((we) => we.exercises)
      .filter((e): e is Exercise => !!e)
      .map((ex) => ({
        id: ex.id,
        name: ex.name,
        instructions: ex.instructions,
        categoryLabel: primaryBodyPart(ex.bodyPartIds, bodyParts)?.label ?? null,
      })),
  }));

  return <ProgrammeView week={home.week} workouts={workouts} tip={tipOfTheDay()} />;
}
