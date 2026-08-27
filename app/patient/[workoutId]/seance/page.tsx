import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import { recommendPrescription } from "@/lib/exercise/prescription";
import { isProfileComplete, profileToContext } from "@/lib/exercise/patientProfile";
import type { RepOverrideMap } from "@/lib/exercise/overrides";
import { daysAgoISO } from "@/lib/week";
import WorkoutSession, { type SessionExercise } from "@/components/WorkoutSession";

type WorkoutExerciseRow = {
  position: number;
  exercises: {
    name: string;
    instructions: string | null;
    media_url: string | null;
    media_start_seconds: number | null;
  } | null;
};

export default async function SeancePage({
  params,
}: {
  params: Promise<{ workoutId: string }>;
}) {
  const { workoutId } = await params;

  const supabase = await createClient();
  const user = await requireUser(supabase);

  const { data: profile } = await supabase
    .from("patient_profiles")
    .select("condition_id, injury_stage, date_of_birth, height_cm, weight_kg, activity_level")
    .eq("id", user.id)
    .maybeSingle();
  if (!isProfileComplete(profile)) redirect("/patient/onboarding");

  // media_start_seconds needs migration 0022. Until it's run by hand in
  // Supabase (this project's convention — see CLAUDE.md), fall back to the
  // query without it rather than let the whole session silently 404. Only
  // retry when the column itself is the problem (Postgres 42703 /
  // undefined_column) — a workoutId that's just wrong or not this patient's
  // must not pay for a second, doomed round trip that would find nothing
  // either way.
  let { data: workoutData, error: workoutError } = await supabase
    .from("workouts")
    .select(
      "id, name, workout_exercises ( position, exercises ( name, instructions, media_url, media_start_seconds ) )",
    )
    .eq("id", workoutId)
    .maybeSingle();
  if (workoutError?.code === "42703") {
    ({ data: workoutData } = await supabase
      .from("workouts")
      .select("id, name, workout_exercises ( position, exercises ( name, instructions, media_url ) )")
      .eq("id", workoutId)
      .maybeSingle());
  }
  if (!workoutData) redirect("/patient");
  const workout = workoutData as unknown as {
    id: string;
    name: string;
    workout_exercises: WorkoutExerciseRow[];
  };

  const exercises: SessionExercise[] = [...(workout.workout_exercises ?? [])]
    .sort((a, b) => a.position - b.position)
    .map((we) => ({
      name: we.exercises?.name ?? "Exercice",
      instructions: we.exercises?.instructions ?? null,
      mediaUrl: we.exercises?.media_url ?? null,
      mediaStartSeconds: we.exercises?.media_start_seconds ?? 0,
    }));

  const prescription = recommendPrescription(profileToContext(profile!));

  // Per-exercise decisions the instructor has applied. RLS lets the patient read
  // only their own. Absent table (migration 0010 not run) → empty map → the
  // standard prescription applies, exactly as before.
  const { data: overrideRows } = await supabase
    .from("exercise_overrides")
    .select("exercise_name, goal_reps, base_reps")
    .eq("patient_id", user.id);
  const repOverrides: RepOverrideMap = Object.fromEntries(
    (overrideRows ?? []).map((r) => [
      r.exercise_name as string,
      { goalReps: r.goal_reps as number, baseReps: r.base_reps as number },
    ]),
  );

  // How hard the patient found each exercise lately. Feeds the automatic easing,
  // so a program softens even when the instructor never looks. Bounded to two
  // weeks: an old rough patch must not keep the load down forever.
  const { data: recentFeedback } = await supabase
    .from("exercise_feedback")
    .select("exercise_name, difficulty")
    .eq("patient_id", user.id)
    .gte("created_at", daysAgoISO(14));
  const recentDifficulty: Record<string, number[]> = {};
  for (const r of recentFeedback ?? []) {
    if (r.difficulty == null) continue;
    const name = r.exercise_name as string;
    (recentDifficulty[name] ??= []).push(r.difficulty as number);
  }

  return (
    <main className="min-h-screen p-6 sm:p-8">
      <div className="mx-auto max-w-xl">
        <WorkoutSession
          workoutId={workout.id}
          patientId={user.id}
          workoutName={workout.name}
          exercises={exercises}
          prescription={prescription}
          repOverrides={repOverrides}
          recentDifficulty={recentDifficulty}
        />
      </div>
    </main>
  );
}
