import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { startOfWeekISO } from "@/lib/week";
import { assignCondition, recommendWorkout } from "./actions";

type WorkoutExercise = {
  position: number;
  exercises: { name: string; media_url: string | null } | null;
};
type Workout = {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number | null;
  times_per_week: number | null;
  workout_exercises: WorkoutExercise[];
};

export default async function PatientDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: patient } = await supabase
    .from("patients")
    .select("id, full_name, email, condition_id, recommended_workout_id")
    .eq("id", id)
    .maybeSingle();
  if (!patient) redirect("/dashboard/patients");

  const { data: conditions } = await supabase.from("conditions").select("id, name").order("name");

  let workouts: Workout[] = [];
  const weekCount: Record<string, number> = {};
  if (patient.condition_id) {
    const { data: workoutsData } = await supabase
      .from("workouts")
      .select(
        "id, name, description, duration_minutes, times_per_week, workout_exercises ( position, exercises ( name, media_url ) )",
      )
      .eq("condition_id", patient.condition_id)
      .order("duration_minutes");
    workouts = (workoutsData ?? []) as unknown as Workout[];

    const { data: logs } = await supabase
      .from("workout_logs")
      .select("workout_id")
      .eq("patient_id", id)
      .gte("completed_at", startOfWeekISO());
    for (const l of logs ?? []) weekCount[l.workout_id] = (weekCount[l.workout_id] ?? 0) + 1;
  }

  const currentConditionName = conditions?.find((c) => c.id === patient.condition_id)?.name;

  return (
    <main className="min-h-screen p-8">
      <div className="mx-auto max-w-2xl">
        <Link href="/dashboard/patients" className="text-sm text-slate-500 hover:underline">
          ← Mes patients
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">{patient.full_name}</h1>
        <p className="text-sm text-slate-500">{patient.email}</p>

        {error && <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        {/* Assign a condition */}
        <section className="mt-8 rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-medium text-slate-900">Condition</h2>
          <p className="mt-1 text-sm text-slate-500">
            {currentConditionName
              ? `Condition actuelle : ${currentConditionName}`
              : "Aucune condition assignée pour l'instant."}
          </p>
          <form action={assignCondition} className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input type="hidden" name="patient_id" value={patient.id} />
            <select
              name="condition_id"
              defaultValue={patient.condition_id ?? ""}
              required
              className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none"
            >
              <option value="" disabled>
                Choisir une condition…
              </option>
              {conditions?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded-md bg-teal-600 px-4 py-2 font-medium text-white hover:bg-teal-700"
            >
              Assigner
            </button>
          </form>
        </section>

        {/* Workout alternatives */}
        {patient.condition_id && (
          <section className="mt-6">
            <h2 className="text-lg font-medium text-slate-900">Séances proposées</h2>
            <p className="mt-1 text-sm text-slate-500">
              Recommandez une séance ; le patient pourra aussi en choisir une autre.
            </p>
            <div className="mt-4 space-y-4">
              {workouts.map((w) => {
                const isRecommended = w.id === patient.recommended_workout_id;
                const done = weekCount[w.id] ?? 0;
                return (
                  <div
                    key={w.id}
                    className={`rounded-xl border bg-white p-5 shadow-sm ${
                      isRecommended ? "border-teal-500 ring-1 ring-teal-500" : "border-slate-100"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-slate-900">{w.name}</h3>
                          {isRecommended && (
                            <span className="rounded-full bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-700">
                              Recommandée
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-slate-500">
                          {w.duration_minutes} min · {w.times_per_week}×/semaine
                        </p>
                        {w.description && (
                          <p className="mt-1 text-sm text-slate-500">{w.description}</p>
                        )}
                      </div>
                      <form action={recommendWorkout}>
                        <input type="hidden" name="patient_id" value={patient.id} />
                        <input type="hidden" name="workout_id" value={isRecommended ? "" : w.id} />
                        <button
                          type="submit"
                          className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ${
                            isRecommended
                              ? "border border-slate-300 text-slate-600 hover:bg-slate-50"
                              : "bg-teal-600 text-white hover:bg-teal-700"
                          }`}
                        >
                          {isRecommended ? "Retirer" : "Recommander"}
                        </button>
                      </form>
                    </div>

                    <ul className="mt-3 flex flex-wrap gap-2">
                      {w.workout_exercises
                        ?.slice()
                        .sort((a, b) => a.position - b.position)
                        .map((we, i) => (
                          <li
                            key={i}
                            className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600"
                          >
                            {we.exercises?.name}
                          </li>
                        ))}
                    </ul>

                    <p className="mt-3 text-xs text-slate-400">
                      Cette semaine : {done} / {w.times_per_week} séances réalisées
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
