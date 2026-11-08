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

import type { Locale } from "../../i18n/locales.ts";

export type BodyPart = { id: string; slug: string; label: string; position: number };

/** Libellé d'une zone du corps dans la langue de l'interface. En français :
 *  le libellé de la base (`body_parts.label`), inchangé ; ailleurs : la
 *  traduction rangée par slug (`t` = traducteur next-intl « exercise.bodyParts »),
 *  ou le libellé de la base si la zone est inconnue. Pas d'import des fichiers
 *  de messages ici : les fichiers de lib/exercise restent lisibles par node:test. */
export function bodyPartLabel(
  bp: Pick<BodyPart, "slug" | "label">,
  locale: Locale,
  t: ((key: string) => string) & { has?: (key: string) => boolean },
): string {
  if (locale === "fr") return bp.label;
  if (t.has && !t.has(bp.slug)) return bp.label;
  return t(bp.slug);
}

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

/**
 * La zone du corps travaillée par une condition (Philippe, 2026-11-08 : au
 * questionnaire d'arrivée, la zone choisie par le kiné est déjà cochée). Une
 * condition n'a pas de zone en base : on prend celle qui revient le plus
 * souvent parmi les exercices de ses séances (même étiquettes que les
 * listes d'exercices). À égalité, la première dans l'ordre de `body_parts`.
 * `exerciseTags` : une liste d'identifiants de zones par exercice.
 */
export function mainBodyPartId(
  exerciseTags: string[][],
  bodyParts: Pick<BodyPart, "id" | "position">[],
): string | null {
  const count = new Map<string, number>();
  for (const tags of exerciseTags) for (const id of new Set(tags)) count.set(id, (count.get(id) ?? 0) + 1);
  let best: Pick<BodyPart, "id" | "position"> | null = null;
  let bestCount = 0;
  for (const bp of [...bodyParts].sort((a, b) => a.position - b.position)) {
    const n = count.get(bp.id) ?? 0;
    if (n > bestCount) {
      best = bp;
      bestCount = n;
    }
  }
  return best?.id ?? null;
}
