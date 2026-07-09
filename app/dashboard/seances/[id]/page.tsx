import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { STAGE_LABELS, type InjuryStage } from "@/lib/exercise/prescription";
import ExercisePicker from "@/components/ExercisePicker";
import { saveSeance, deleteSeance } from "../actions";

const STAGES = Object.entries(STAGE_LABELS) as [InjuryStage, string][];

export default async function SeanceEditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const { id } = await params;
  const { saved } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: workout } = await supabase
    .from("workouts")
    .select("id, name, condition_id, stage, duration_minutes, times_per_week, created_by")
    .eq("id", id)
    .maybeSingle();
  // Only the owner can edit; platform séances aren't editable here.
  if (!workout || workout.created_by !== user.id) redirect("/dashboard/seances");

  const { data: conditions } = await supabase.from("conditions").select("id, name").order("name");
  const { data: exercises } = await supabase.from("exercises").select("id, name").order("name");

  const { data: current } = await supabase
    .from("workout_exercises")
    .select("exercise_id")
    .eq("workout_id", id);
  const selected = new Set((current ?? []).map((r) => r.exercise_id as string));

  return (
    <main className="min-h-screen bg-slate-50 p-6 sm:p-8">
      <div className="mx-auto max-w-2xl">
        <Link href="/dashboard/seances" className="text-sm text-slate-500 hover:underline">
          ← Mes séances
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">Composer la séance</h1>

        {saved && (
          <p className="mt-4 rounded-md bg-teal-50 p-3 text-sm font-medium text-teal-800">
            Séance enregistrée ✅
          </p>
        )}

        <form action={saveSeance} className="mt-6 flex flex-col gap-6">
          <input type="hidden" name="workout_id" value={workout.id} />

          {/* Details */}
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Détails</h2>
            <div className="mt-3 flex flex-col gap-3">
              <label className="text-sm text-slate-600">
                Nom
                <input
                  name="name"
                  required
                  defaultValue={workout.name}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none"
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-sm text-slate-600">
                  Condition
                  <select
                    name="condition_id"
                    required
                    defaultValue={workout.condition_id ?? ""}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none"
                  >
                    {conditions?.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm text-slate-600">
                  Phase
                  <select
                    name="stage"
                    defaultValue={workout.stage ?? ""}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none"
                  >
                    <option value="">Toutes phases</option>
                    {STAGES.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm text-slate-600">
                  Durée (min)
                  <input
                    type="number" name="duration_minutes" min={1} max={90}
                    defaultValue={workout.duration_minutes ?? 10}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none"
                  />
                </label>
                <label className="text-sm text-slate-600">
                  Fois / semaine
                  <input
                    type="number" name="times_per_week" min={1} max={14}
                    defaultValue={workout.times_per_week ?? 3}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none"
                  />
                </label>
              </div>
            </div>
          </section>

          {/* Exercises — check to add, uncheck to remove */}
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">
              Exercices <span className="font-normal text-slate-400">(par zone du corps — cochez pour ajouter)</span>
            </h2>
            <div className="mt-3">
              <ExercisePicker
                exercises={(exercises ?? []) as { id: string; name: string }[]}
                selectedIds={[...selected]}
              />
            </div>
          </section>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              className="rounded-md bg-teal-600 px-5 py-2.5 font-medium text-white hover:bg-teal-700"
            >
              Enregistrer la séance
            </button>
          </div>
        </form>

        {/* Delete (separate form) */}
        <form action={deleteSeance} className="mt-4">
          <input type="hidden" name="workout_id" value={workout.id} />
          <button
            type="submit"
            className="text-sm font-medium text-red-600 hover:underline"
          >
            Supprimer cette séance
          </button>
        </form>
      </div>
    </main>
  );
}
