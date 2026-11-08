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

/** Traducteur « exercise.adjustMessage » (next-intl) fourni par l'appelant ;
 *  absent = français. Pas d'import JSON ici : fichier testé par node:test. */
type Tr = (key: string, values?: Record<string, string | number>) => string;

/** « J'ai ajusté votre séance « X » : 1 exercice retiré, 2 exercices ajoutés. »
 *  `t` = traducteur dans la langue du PATIENT qui recevra le message. */
export function adjustmentMessage(workoutName: string, removed: number, added: number, dosesChanged = 0, t?: Tr): string {
  const parts: string[] = [];
  if (t) {
    if (removed > 0) parts.push(t("removed", { count: removed }));
    if (added > 0) parts.push(t("added", { count: added }));
    if (dosesChanged > 0) parts.push(t("doses", { count: dosesChanged }));
    return t("message", { name: workoutName, parts: parts.join(", ") });
  }
  if (removed > 0) parts.push(plural(removed, "exercice", "retiré"));
  if (added > 0) parts.push(plural(added, "exercice", "ajouté"));
  if (dosesChanged > 0) parts.push(`séries ou répétitions modifiées sur ${dosesChanged} exercice${dosesChanged > 1 ? "s" : ""}`);
  return `J'ai ajusté votre séance « ${workoutName} » : ${parts.join(", ")}.`;
}
