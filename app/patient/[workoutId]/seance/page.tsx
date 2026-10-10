import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import { recommendPrescription } from "@/lib/exercise/prescription";
import { isProfileComplete, profileToContext } from "@/lib/exercise/patientProfile";
import { hasPatientAppAccess } from "@/lib/billing/context";
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
  if (!(await hasPatientAppAccess(supabase, user.id))) redirect("/patient/abonnement");

  // media_start_seconds needs migration 0022. Until it's run by hand in
  // Supabase (this project's convention — see CLAUDE.md), fall back to the
  // query without it rather than let the whole session silently 404. Only
  // retry when the column itself is the problem (Postgres 42703 /
  // undefined_column) — a workoutId that's just wrong or not this patient's
  // must not pay for a second, doomed round trip that would find nothing
  // either way.
  const firstTry = await supabase
    .from("workouts")
    .select(
      "id, name, workout_exercises ( position, exercises ( name, instructions, media_url, media_start_seconds ) )",
    )
    .eq("id", workoutId)
    .maybeSingle();
  let workoutData = firstTry.data;
  if (firstTry.error?.code === "42703") {
    ({ data: workoutData } = await supabase
      .from("workouts")
      .select("id, name, workout_exercises ( position, exercises ( name, instructions, media_url ) )")
      .eq("id", workoutId)
      .maybeSingle());
  }
  if (!workoutData) redirect("/patient");

  // Seulement une séance de CE patient (audit du 2026-10-08) : avant,
  // n'importe quelle séance de la bibliothèque s'ouvrait et s'enregistrait.
  // Autorisée si elle lui a été attribuée, si c'est sa copie personnelle
  // (« Ajuster la séance »), ou si elle fait partie de la condition que son
  // kiné lui a donnée (les séances alternatives, CLAUDE.md §4).
  const [{ data: meta }, { data: patientRow }, { count: assignedCount }] = await Promise.all([
    supabase.from("workouts").select("patient_id, condition_id").eq("id", workoutId).maybeSingle(),
    supabase.from("patients").select("condition_id").eq("id", user.id).maybeSingle(),
    supabase
      .from("patient_recommended_workouts")
      .select("id", { count: "exact", head: true })
      .eq("patient_id", user.id)
      .eq("workout_id", workoutId),
  ]);
  const isMine =
    meta?.patient_id === user.id ||
    (assignedCount ?? 0) > 0 ||
    (meta?.patient_id == null && !!meta?.condition_id && meta.condition_id === patientRow?.condition_id);
  if (!isMine) redirect("/patient");

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
