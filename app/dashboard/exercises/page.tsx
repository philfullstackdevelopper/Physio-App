import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";
import ExerciseLibraryGrid, { type LibraryExercise } from "@/components/ExerciseLibraryGrid";
import { createExercise, hideExercise, unhideExercise } from "./actions";
import { requireApprovedInstructor } from "@/lib/dashboard/requireApprovedInstructor";

export default async function ExercisesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  const supabase = await createClient();
  // Validation du compte vérifiée ICI aussi (audit du 2026-10-08) : le
  // layout ne se ré-exécute pas à chaque navigation (doc Next.js 16).
  const { user } = await requireApprovedInstructor(supabase);

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
    <main className="min-h-screen max-sm:min-h-0">
      <div className="mx-auto max-w-7xl px-4 pb-4 pt-2 sm:px-8 sm:py-6">
        <div className="animate-[fadeInUp_0.6s_ease-out_both] flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold text-ink">Mes exercices</h1>
          <Link href="/dashboard/seances" className="text-sm font-medium text-brand hover:underline max-sm:hidden">← Mes séances</Link>
        </div>

        {error && (
          <p className="mt-4 rounded-lg bg-danger-soft p-3 text-sm text-danger">{error}</p>
        )}

        <div className="animate-[fadeInUp_0.6s_ease-out_both] [animation-delay:120ms]">
          <ExerciseLibraryGrid
            bodyParts={bodyParts ?? []}
            exercises={libraryExercises}
            currentUserId={user.id}
            isAdmin={isAdminEmail(user.email)}
            createExercise={createExercise}
            hideExercise={hideExercise}
            unhideExercise={unhideExercise}
          />
        </div>
      </div>
    </main>
  );
}
