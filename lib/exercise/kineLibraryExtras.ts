// « Récents » du kiné pour les fenêtres qui composent une séance (« Mes
// séances », « Modifier la séance ») — Philippe, 2026-11-05, proposition 6.
// Les favoris (étoile) ont été retirés le 2026-11-06 (audit, on allège) :
// « Récents » suffit et n'a besoin d'aucune table. La fiche patient calcule
// les récents elle-même à partir des séances qu'elle charge déjà.

import type { SupabaseClient } from "@supabase/supabase-js";
import { goalPartsFor } from "./prescription.ts";

/** Répétitions, maintien ou durée, lu dans la consigne de l'exercice. */
export function doseKindOf(instructions: string | null | undefined) {
  return goalPartsFor(instructions ?? null).kind;
}

/** Exercices de ses 12 dernières séances (copies de patients comprises), les plus récents d'abord. */
export async function loadRecentExercises(supabase: SupabaseClient, instructorId: string): Promise<string[]> {
  const { data: recentRows } = await supabase
    .from("workouts")
    .select("created_at, workout_exercises(position, exercise_id)")
    .eq("created_by", instructorId)
    .order("created_at", { ascending: false })
    .limit(12);
  return [
    ...new Set(
      (recentRows ?? []).flatMap((w) =>
        [...((w.workout_exercises as { position: number; exercise_id: string }[] | null) ?? [])]
          .sort((a, b) => a.position - b.position)
          .map((we) => we.exercise_id),
      ),
    ),
  ].slice(0, 24);
}
