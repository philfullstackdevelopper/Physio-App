import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { recommendPrescription } from "@/lib/exercise/prescription";
import { isProfileComplete, profileToContext } from "@/lib/exercise/patientProfile";
import type { RepOverrideMap } from "@/lib/exercise/overrides";
import { daysAgoISO } from "@/lib/week";
import { maxLevelFor } from "@/lib/exercise/intensity";
import { getCurrentAccess } from "@/lib/billing/context";
import WorkoutSession, { type SessionExercise } from "@/components/WorkoutSession";

type WorkoutExerciseRow = {
  position: number;
  exercises: { name: string; instructions: string | null; media_url: string | null } | null;
};

export default async function SeancePage({
  params,
}: {
  params: Promise<{ workoutId: string }>;
}) {
  const { workoutId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("patient_profiles")
    .select("condition_id, injury_stage, date_of_birth, height_cm, weight_kg, activity_level")
    .eq("id", user.id)
    .maybeSingle();
  if (!isProfileComplete(profile)) redirect("/patient/onboarding");

  const { data: workoutData } = await supabase
    .from("workouts")
    .select("id, name, workout_exercises ( position, exercises ( name, instructions, media_url ) )")
    .eq("id", workoutId)
    .maybeSingle();
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

  // How far this patient may push the in-session dial: the lowest ceiling among
  // their age, their activity level and their rehab phase. Easing is never capped.
  const maxIntensityLevel = maxLevelFor(profileToContext(profile!));

  // The in-session adaptation suggestion is a premium feature — free-floor
  // patients (trial ended, not subscribed) don't see it.
  const access = await getCurrentAccess(supabase, user.id);
  const showAdaptation =
    access.role === "patient" ? access.access.capabilities.adaptationEngine : false;

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
          showAdaptation={showAdaptation}
          maxIntensityLevel={maxIntensityLevel}
        />
      </div>
    </main>
  );
}
