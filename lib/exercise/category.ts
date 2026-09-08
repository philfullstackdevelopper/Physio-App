// =============================================================================
// Exercise categories — group the exercise pickers (séance editor, "Ajuster
// la séance") by body area, using the real `body_parts`/`exercise_body_parts`
// tags (see migration 0035) instead of guessing from the exercise name.
//
// A name-matching heuristic used to live here, keyed on French substrings
// ("genou", "hanche", "cheville"...). Migration 0042 translated every
// exercise name to English, so that heuristic silently stopped matching
// almost everything and dumped the whole library into one "Équilibre &
// général" bucket — which is what actually made the pickers feel flooded
// with near-identical entries. The real tags were sitting right there and
// already correctly maintained (every exercise has at least one).
// =============================================================================

export type BodyPart = { id: string; slug: string; label: string; position: number };

/**
 * Which of an exercise's tagged body parts to group it under when a picker
 * needs exactly one heading per exercise (an exercise can be tagged with
 * more than one area) — the lowest-`position` tag, i.e. the first one in
 * `body_parts` order, so grouping stays deterministic and each exercise
 * appears exactly once. Falls back to the last body part (general/misc)
 * for the — currently nonexistent — case of an untagged exercise.
 */
export function primaryBodyPart(bodyPartIds: string[], bodyParts: BodyPart[]): BodyPart | null {
  const tagged = bodyParts.filter((bp) => bodyPartIds.includes(bp.id));
  if (tagged.length > 0) return tagged.reduce((best, bp) => (bp.position < best.position ? bp : best));
  return bodyParts.length > 0 ? bodyParts[bodyParts.length - 1] : null;
}
