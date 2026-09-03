import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
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
  const user = await requireUser(supabase);

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

  // Exercises this instructor hid from their own search (migration 0037) drop
  // out of the picker — UNLESS this workout already includes them, so hiding
  // an exercise later never silently removes it from an existing séance.
  const { data: hiddenRows } = await supabase
    .from("instructor_hidden_exercises")
    .select("exercise_id")
    .eq("instructor_id", user.id);
  const hiddenIds = new Set((hiddenRows ?? []).map((r) => r.exercise_id as string));
  const pickerExercises = (exercises ?? []).filter((ex) => !hiddenIds.has(ex.id) || selected.has(ex.id));

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-2xl p-6 sm:p-8">
        <div className="animate-[fadeInUp_0.6s_ease-out_both]">
          <Link href="/dashboard/seances" className="text-sm text-stone-500 hover:underline">
            ← Mes séances
          </Link>
          <h1 className="font-display mt-3 text-2xl font-semibold text-stone-900">Composer la séance</h1>
        </div>

        {saved && (
          <div className="animate-[fadeInUp_0.6s_ease-out_both] mt-4 flex items-center gap-1.5 rounded-xl border-y border-r border-stone-200 border-l-[3px] border-l-emerald-600 bg-white px-4 py-3 text-sm font-medium text-emerald-800">
            <CheckCircle2 className="h-4 w-4 shrink-0" strokeWidth={1.5} />
            Séance enregistrée
          </div>
        )}

        <form action={saveSeance} className="mt-6 flex flex-col gap-6">
          <input type="hidden" name="workout_id" value={workout.id} />

          {/* Details */}
          <section className="animate-[fadeInUp_0.6s_ease-out_both] [animation-delay:120ms] rounded-xl border border-stone-200 bg-white p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-8px_rgba(120,53,15,0.16)]">
            <h2 className="text-sm font-medium text-stone-900">Détails</h2>
            <div className="mt-3 flex flex-col gap-3">
              <label className="text-sm text-stone-600">
                Nom
                <input
                  name="name"
                  required
                  defaultValue={workout.name}
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-sm text-stone-600">
                  Condition
                  <select
                    name="condition_id"
                    required
                    defaultValue={workout.condition_id ?? ""}
                    className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  >
                    {conditions?.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm text-stone-600">
                  Phase
                  <select
                    name="stage"
                    defaultValue={workout.stage ?? ""}
                    className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="">Toutes phases</option>
                    {STAGES.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm text-stone-600">
                  Durée (min)
                  <input
                    type="number" name="duration_minutes" min={1} max={90}
                    defaultValue={workout.duration_minutes ?? 10}
                    className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </label>
                <label className="text-sm text-stone-600">
                  Fois / semaine
                  <input
                    type="number" name="times_per_week" min={1} max={14}
                    defaultValue={workout.times_per_week ?? 3}
                    className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </label>
              </div>
            </div>
          </section>

          {/* Exercises — check to add, uncheck to remove */}
          <section className="animate-[fadeInUp_0.6s_ease-out_both] [animation-delay:200ms] rounded-xl border border-stone-200 bg-white p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-8px_rgba(120,53,15,0.16)]">
            <h2 className="text-sm font-medium text-stone-900">
              Exercices <span className="font-normal text-stone-400">(par zone du corps — cochez pour ajouter)</span>
            </h2>
            <div className="mt-3">
              <ExercisePicker
                exercises={pickerExercises as { id: string; name: string }[]}
                selectedIds={[...selected]}
              />
            </div>
          </section>

          <div className="animate-[fadeInUp_0.6s_ease-out_both] [animation-delay:280ms] flex items-center gap-3">
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white hover:bg-blue-700"
            >
              Enregistrer la séance
            </button>
          </div>
        </form>

        {/* Delete (separate form) */}
        <form action={deleteSeance} className="animate-[fadeInUp_0.6s_ease-out_both] [animation-delay:280ms] mt-4">
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
