import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import ExerciseVideoUpload from "@/components/ExerciseVideoUpload";
import { createExercise } from "./actions";

export default async function ExercisesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  const supabase = await createClient();
  const user = await requireUser(supabase);

  const { data: mine } = await supabase
    .from("exercises")
    .select("id, name, instructions, media_url")
    .eq("created_by", user.id)
    .order("created_at", { ascending: false });

  return (
    <main className="min-h-screen bg-slate-50 p-6 sm:p-8">
      <div className="mx-auto max-w-2xl">
        <Link href="/dashboard/seances" className="text-sm text-slate-500 hover:underline">
          ← Mes séances
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">Mes exercices</h1>
        <p className="mt-1 text-sm text-slate-500">
          Créez vos propres exercices et filmez-en une démonstration ; elles seront
          disponibles à ajouter dans vos séances.
        </p>

        {error && <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        {/* Create a new exercise */}
        <form
          action={createExercise}
          className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <h2 className="text-sm font-semibold text-slate-900">Nouvel exercice</h2>
          <div className="mt-3 flex flex-col gap-3">
            <input
              name="name"
              required
              placeholder="Nom de l'exercice"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none"
            />
            <textarea
              name="instructions"
              placeholder="Instructions (optionnel)"
              rows={2}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="mt-3 rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
          >
            Créer
          </button>
        </form>

        {/* My exercises */}
        <div className="mt-8 space-y-3">
          {!mine || mine.length === 0 ? (
            <p className="rounded-xl bg-white p-6 text-center text-sm text-slate-500 shadow-sm">
              Aucun exercice personnalisé pour le moment. Créez-en un ci-dessus.
            </p>
          ) : (
            mine.map((ex) => (
              <div key={ex.id} className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                <p className="font-medium text-slate-900">{ex.name}</p>
                {ex.instructions && <p className="mt-1 text-sm text-slate-500">{ex.instructions}</p>}
                <ExerciseVideoUpload exerciseId={ex.id} initialUrl={ex.media_url} />
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
