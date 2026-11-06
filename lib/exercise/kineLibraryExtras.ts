// Favoris et récents du kiné pour les fenêtres qui composent une séance
// (« Mes séances », « Modifier la séance ») — Philippe, 2026-11-05,
// proposition 6. La fiche patient calcule les récents elle-même à partir des
// séances qu'elle charge déjà.

import type { SupabaseClient } from "@supabase/supabase-js";
import { goalPartsFor } from "./prescription.ts";

/** Répétitions, maintien ou durée, lu dans la consigne de l'exercice. */
export function doseKindOf(instructions: string | null | undefined) {
  return goalPartsFor(instructions ?? null).kind;
}

export async function loadFavoritesAndRecents(
  supabase: SupabaseClient,
  instructorId: string,
): Promise<{ favoriteIds?: string[]; recentIds: string[] }> {
  const [{ data: favRows, error: favError }, { data: recentRows }] = await Promise.all([
    supabase.from("instructor_favorite_exercises").select("exercise_id").eq("instructor_id", instructorId),
    // Ses 12 dernières séances (copies de patients comprises), les plus récentes d'abord.
    supabase
      .from("workouts")
      .select("created_at, workout_exercises(position, exercise_id)")
      .eq("created_by", instructorId)
      .order("created_at", { ascending: false })
      .limit(12),
  ]);
  const recentIds = [
    ...new Set(
      (recentRows ?? []).flatMap((w) =>
        [...((w.workout_exercises as { position: number; exercise_id: string }[] | null) ?? [])]
          .sort((a, b) => a.position - b.position)
          .map((we) => we.exercise_id),
      ),
    ),
  ].slice(0, 24);
  // Table absente (migration 0083 pas encore passée) : pas d'étoiles.
  return { favoriteIds: favError ? undefined : (favRows ?? []).map((r) => r.exercise_id as string), recentIds };
}
