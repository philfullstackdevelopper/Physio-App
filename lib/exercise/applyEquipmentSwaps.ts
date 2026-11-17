// Côté serveur : applique les remplacements « faute de matériel »
// (lib/exercise/equipmentSwaps.ts) aux lignes d'une séance lues en base.
import type { SupabaseClient } from "@supabase/supabase-js";
import { planEquipmentSwaps, swapRows } from "@/lib/exercise/equipmentSwaps";
import { platformExerciseName } from "@/lib/exercise/exerciseNames";

type ExerciseLike = { name: string; equipment?: string[] | null };

/** Matériel déclaré par le patient : null tant qu'il n'a pas répondu
 *  (questionnaire pas fait) — et alors on ne remplace rien. */
export async function loadPatientEquipment(supabase: SupabaseClient, patientId: string): Promise<string[] | null> {
  const { data } = await supabase.from("patient_profiles").select("equipment").eq("id", patientId).maybeSingle();
  return (data?.equipment as string[] | null | undefined) ?? null;
}

/**
 * Remplace, dans `rows` (lignes workout_exercises d'une séance de la
 * plateforme), les exercices que le patient ne peut pas faire faute de
 * matériel (voir swapRows). Lit les remplaçants en base, avec
 * `exerciseColumns` — les mêmes colonnes que `exercises` dans la requête
 * d'origine (dont `name` et `equipment`).
 */
export async function applyEquipmentSwaps<E extends ExerciseLike, R extends { exercises: E | null }>(
  supabase: SupabaseClient,
  rows: R[],
  patientEquipment: string[] | null,
  exerciseColumns: string,
): Promise<(R & { swappedFrom: string | null })[]> {
  const plan = planEquipmentSwaps(
    rows.map((r) => ({ name: r.exercises?.name ?? "", equipment: r.exercises?.equipment })),
    patientEquipment,
  );
  const needed = [...new Set(plan.filter((p): p is string => !!p))];
  if (needed.length === 0) return rows.map((r) => ({ ...r, swappedFrom: null }));

  const { data } = await supabase.from("exercises").select(exerciseColumns).is("created_by", null).in("name", needed);
  const byName = new Map(((data ?? []) as unknown as E[]).map((e) => [platformExerciseName(e.name), e]));
  return swapRows(rows, patientEquipment, (n) => byName.get(n));
}
