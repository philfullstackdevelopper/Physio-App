"use server";

// Étoile « favori » sur un exercice (migration 0083). Appelée depuis la
// bibliothèque des fenêtres qui composent une séance (ExerciseLibraryPicker),
// sans recharger la page : le composant met l'étoile à jour tout de suite et
// la retire si l'enregistrement échoue.

import { createClient } from "@/lib/supabase/server";
import { requireApprovedInstructor } from "@/lib/dashboard/requireApprovedInstructor";

export async function setFavoriteExercise(exerciseId: string, favorite: boolean): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const { user } = await requireApprovedInstructor(supabase);
  if (!/^[0-9a-f-]{36}$/.test(exerciseId)) return { error: "Exercice introuvable." };

  const { error } = favorite
    ? await supabase
        .from("instructor_favorite_exercises")
        .upsert({ instructor_id: user.id, exercise_id: exerciseId }, { onConflict: "instructor_id,exercise_id", ignoreDuplicates: true })
    : await supabase.from("instructor_favorite_exercises").delete().eq("instructor_id", user.id).eq("exercise_id", exerciseId);
  if (error) return { error: "Favori non enregistré." };
  return { ok: true };
}
