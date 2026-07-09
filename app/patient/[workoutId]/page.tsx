import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { startOfWeekISO } from "@/lib/week";
import { completeWorkout } from "../actions";

type Workout = {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number | null;
  times_per_week: number | null;
  workout_exercises: {
    position: number;
    exercises: { name: string; instructions: string | null; media_url: string | null } | null;
  }[];
};

export default async function WorkoutDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ workoutId: string }>;
  searchParams: Promise<{ done?: string; error?: string }>;
}) {
  const { workoutId } = await params;
  const { done, error } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: workoutData } = await supabase
    .from("workouts")
    .select(
      "id, name, description, duration_minutes, times_per_week, workout_exercises ( position, exercises ( name, instructions, media_url ) )",
    )
    .eq("id", workoutId)
    .maybeSingle();
  if (!workoutData) redirect("/patient");
  const workout = workoutData as unknown as Workout;

  const { count } = await supabase
    .from("workout_logs")
    .select("id", { count: "exact", head: true })
    .eq("patient_id", user.id)
    .eq("workout_id", workoutId)
    .gte("completed_at", startOfWeekISO());

  const exercises = [...(workout.workout_exercises ?? [])].sort((a, b) => a.position - b.position);

  return (
    <main className="min-h-screen p-6 sm:p-8">
      <div className="mx-auto max-w-2xl">
        <Link href="/patient" className="text-sm text-slate-500 hover:underline">
          ← Mes séances
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">{workout.name}</h1>
        <p className="mt-1 text-sm text-slate-500">
          {workout.duration_minutes} min · {workout.times_per_week}×/semaine · {count ?? 0} fait(s)
          cette semaine
        </p>
        {workout.description && <p className="mt-2 text-slate-600">{workout.description}</p>}

        {done && (
          <p className="mt-4 rounded-md bg-teal-50 p-3 text-sm font-medium text-teal-800">
            Bravo ! Séance enregistrée. 💪
          </p>
        )}
        {error && <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        <ol className="mt-6 space-y-4">
          {exercises.map((we, i) => (
            <li key={i} className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-50 text-sm font-semibold text-teal-700">
                  {i + 1}
                </span>
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900">{we.exercises?.name}</h3>
                  {we.exercises?.instructions && (
                    <p className="mt-1 text-sm text-slate-600">{we.exercises.instructions}</p>
                  )}
                  {we.exercises?.media_url && (
                    <a
                      href={we.exercises.media_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-teal-700 hover:underline"
                    >
                      ▶ Voir une démonstration
                    </a>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ol>

        <Link
          href={`/patient/${workout.id}/seance`}
          className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 py-4 text-lg font-semibold text-white shadow-sm transition hover:bg-teal-700"
        >
          ▶ Commencer la séance
        </Link>

        <form action={completeWorkout} className="mt-3">
          <input type="hidden" name="workout_id" value={workout.id} />
          <button
            type="submit"
            className="w-full rounded-lg border border-slate-300 bg-white py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Marquer comme faite sans la séance guidée
          </button>
        </form>
      </div>
    </main>
  );
}
