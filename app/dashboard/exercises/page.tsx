import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import ExerciseLibraryGrid, { type LibraryExercise } from "@/components/ExerciseLibraryGrid";
import { createExercise, hideExercise, unhideExercise } from "./actions";

export default async function ExercisesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  const supabase = await createClient();
  const user = await requireUser(supabase);

  const { data: bodyParts } = await supabase
    .from("body_parts")
    .select("id, slug, label, position")
    .order("position");

  const { data: allExercises } = await supabase
    .from("exercises")
    .select(
      "id, name, instructions, media_url, media_start_seconds, created_by, search_keywords, exercise_body_parts(body_part_id)",
    )
    .order("name");

  const { data: hiddenRows } = await supabase
    .from("instructor_hidden_exercises")
    .select("exercise_id")
    .eq("instructor_id", user.id);
  const hiddenIds = new Set((hiddenRows ?? []).map((r) => r.exercise_id as string));

  const libraryExercises: LibraryExercise[] = (allExercises ?? []).map((ex) => ({
    id: ex.id,
    name: ex.name,
    instructions: ex.instructions,
    media_url: ex.media_url,
    media_start_seconds: ex.media_start_seconds,
    created_by: ex.created_by,
    search_keywords: ex.search_keywords ?? [],
    bodyPartIds: (ex.exercise_body_parts ?? []).map((t) => t.body_part_id),
    hidden: hiddenIds.has(ex.id),
  }));

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-5xl p-6 sm:p-8">
        <div className="animate-[fadeInUp_0.6s_ease-out_both]">
          <Link
            href="/dashboard/seances"
            className="text-sm text-stone-500 transition-colors duration-150 hover:text-stone-700 hover:underline"
          >
            ← Mes séances
          </Link>
          <h1 className="font-display mt-1 text-2xl font-semibold text-stone-900">
            Mes exercices
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            Créez vos propres exercices et filmez-en une démonstration ; elles seront
            disponibles à ajouter dans vos séances.
          </p>
        </div>

        {error && (
          <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
        )}

        <div className="animate-[fadeInUp_0.6s_ease-out_both] [animation-delay:120ms]">
          <ExerciseLibraryGrid
            bodyParts={bodyParts ?? []}
            exercises={libraryExercises}
            currentUserId={user.id}
            createExercise={createExercise}
            hideExercise={hideExercise}
            unhideExercise={unhideExercise}
          />
        </div>
      </div>
    </main>
  );
}
