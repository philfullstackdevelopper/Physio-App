import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { STAGE_LABELS, type InjuryStage } from "@/lib/exercise/prescription";
import EditSeanceModal from "@/components/EditSeanceModal";
import { saveSeance, deleteSeance } from "../actions";
import { requireApprovedInstructor } from "@/lib/dashboard/requireApprovedInstructor";

const STAGES = Object.entries(STAGE_LABELS) as [InjuryStage, string][];

export default async function SeanceEditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const { id } = await params;
  // (Philippe, 2026-10-07 : ?error= était envoyé par saveSeance/createSeance
  // mais jamais affiché.)
  const { saved, error } = await searchParams;

  const supabase = await createClient();
  // Validation du compte vérifiée ICI aussi (audit du 2026-10-08) : le
  // layout ne se ré-exécute pas à chaque navigation (doc Next.js 16).
  const { user } = await requireApprovedInstructor(supabase);

  const { data: workout } = await supabase
    .from("workouts")
    .select("id, name, condition_id, stage, duration_minutes, times_per_week, created_by")
    .eq("id", id)
    .maybeSingle();
  // Only the owner can edit; platform séances aren't editable here.
  if (!workout || workout.created_by !== user.id) redirect("/dashboard/seances");

  const { data: conditions } = await supabase.from("conditions").select("id, name").order("name");
  const { data: bodyParts } = await supabase.from("body_parts").select("id, slug, label, position").order("position");
  const { data: exercises } = await supabase
    .from("exercises")
    .select("id, name, instructions, equipment, search_keywords, exercise_body_parts(body_part_id)")
    .order("name");

  const { data: current } = await supabase
    .from("workout_exercises")
    .select("exercise_id, position")
    .eq("workout_id", id)
    .order("position");
  // Dans l'ordre de la séance : c'est l'ordre affiché, et celui qui sera ré-enregistré.
  const selectedIds = (current ?? []).map((r) => r.exercise_id as string);
  const selected = new Set(selectedIds);

  // Exercises this instructor hid from their own search (migration 0037) drop
  // out of the picker — UNLESS this workout already includes them, so hiding
  // an exercise later never silently removes it from an existing séance.
  const { data: hiddenRows } = await supabase
    .from("instructor_hidden_exercises")
    .select("exercise_id")
    .eq("instructor_id", user.id);
  const hiddenIds = new Set((hiddenRows ?? []).map((r) => r.exercise_id as string));
  const pickerExercises = (exercises ?? [])
    .filter((ex) => !hiddenIds.has(ex.id) || selected.has(ex.id))
    .map((ex) => ({
      id: ex.id,
      name: ex.name,
      searchKeywords: (ex.search_keywords as string[] | null) ?? null,
      equipment: (ex.equipment as string[] | null) ?? [],
      bodyPartIds: (ex.exercise_body_parts ?? []).map((t) => t.body_part_id as string),
    }));

  // Même fenêtre que « Nouvelle séance » et « Ajuster la séance » (Philippe,
  // 2026-10-12) — l'ancienne page en liste de cases à cocher est remplacée.
  return (
    <main className="min-h-screen max-sm:min-h-0">
      <EditSeanceModal
        conditions={conditions ?? []}
        stages={STAGES}
        exercises={pickerExercises}
        bodyParts={bodyParts ?? []}
        saveSeance={saveSeance}
        edit={{
          workoutId: workout.id,
          name: workout.name,
          conditionId: workout.condition_id,
          stage: workout.stage,
          durationMinutes: workout.duration_minutes,
          timesPerWeek: workout.times_per_week,
          exerciseIds: selectedIds,
          deleteAction: deleteSeance,
          saved: !!saved,
          error: error ?? null,
        }}
      />
    </main>
  );
}
