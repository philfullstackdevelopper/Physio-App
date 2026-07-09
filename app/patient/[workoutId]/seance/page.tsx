import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { recommendPrescription } from "@/lib/exercise/prescription";
import { isProfileComplete, profileToContext } from "@/lib/exercise/patientProfile";
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

  return (
    <main className="min-h-screen p-6 sm:p-8">
      <div className="mx-auto max-w-xl">
        <WorkoutSession
          workoutId={workout.id}
          patientId={user.id}
          workoutName={workout.name}
          exercises={exercises}
          prescription={prescription}
        />
      </div>
    </main>
  );
}
