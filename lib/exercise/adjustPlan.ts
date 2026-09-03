// =============================================================================
// Calcul pur de la nouvelle liste d'exercices d'une séance ajustée, et du
// message envoyé au patient. Testé sans base de données.
// =============================================================================

export interface ExerciseSlot {
  exerciseId: string;
  position: number;
}

/** Retire `removeIds`, ajoute `addIds` (uniques, non déjà présents) en fin, renumérote 0..n-1. */
export function applyAdjustment(current: ExerciseSlot[], removeIds: string[], addIds: string[]): ExerciseSlot[] {
  const remove = new Set(removeIds);
  const kept = [...current].sort((a, b) => a.position - b.position).filter((s) => !remove.has(s.exerciseId)).map((s) => s.exerciseId);
  const present = new Set(kept);
  for (const id of addIds) {
    if (!present.has(id)) {
      kept.push(id);
      present.add(id);
    }
  }
  return kept.map((exerciseId, position) => ({ exerciseId, position }));
}

const plural = (n: number, word: string, pastParticiple: string) =>
  `${n} ${word}${n > 1 ? "s" : ""} ${pastParticiple}${n > 1 ? "s" : ""}`;

/** « J'ai ajusté votre séance « X » : 1 exercice retiré, 2 exercices ajoutés. » */
export function adjustmentMessage(workoutName: string, removed: number, added: number): string {
  const parts: string[] = [];
  if (removed > 0) parts.push(plural(removed, "exercice", "retiré"));
  if (added > 0) parts.push(plural(added, "exercice", "ajouté"));
  return `J'ai ajusté votre séance « ${workoutName} » : ${parts.join(", ")}.`;
}
