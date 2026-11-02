// « Changements recommandés » de la fenêtre « Ajuster la séance » (Philippe,
// 2026-11-02) : pour chaque exercice de la séance, une variante plus facile
// et une plus difficile. Pas de table « variantes » dans la base : on se sert
// des séances de la même condition, rangées par phase (aiguë → reprise du
// sport). Un exercice d'une séance de phase inférieure qui travaille la même
// zone du corps = variante plus facile ; phase supérieure = plus difficile.
// Les exercices qui font mal ou que le patient passe remontent en tête.

import { STAGE_ORDER } from "./levelStep.ts";

export interface VariantExercise {
  id: string;
  name: string;
  bodyPartIds: string[];
}

export interface VariantSeance {
  conditionId: string | null;
  stage: string | null;
  exercises: VariantExercise[];
}

export interface Recommendation {
  forId: string;
  forName: string;
  kind: "easier" | "harder";
  alt: { id: string; name: string };
  /** « douleur 5,5/10 », « passé 2 fois » : pourquoi il est en tête. */
  reason: string | null;
}

export function recommendVariants(input: {
  current: VariantSeance;
  pool: VariantSeance[];
  /** Exercices que le kiné peut choisir (filmés, non masqués). */
  pickable: Set<string>;
  /** Nom d'exercice → raison de le surveiller (lib/dashboard/exerciseWatch). */
  watch?: Map<string, string>;
  max?: number;
}): Recommendation[] {
  const { current, pool, pickable, watch = new Map(), max = 8 } = input;
  const idx = STAGE_ORDER.indexOf((current.stage ?? "") as (typeof STAGE_ORDER)[number]);
  if (!current.conditionId || idx < 0) return [];
  const inSeance = new Set(current.exercises.map((e) => e.id));
  const sameCondition = pool.filter((s) => s.conditionId === current.conditionId && s.stage);
  const stageOf = (s: VariantSeance) => STAGE_ORDER.indexOf(s.stage as (typeof STAGE_ORDER)[number]);
  const used = new Set<string>();

  const find = (ex: VariantExercise, dir: -1 | 1): VariantExercise | null => {
    for (let step = 1; step <= 2; step++) {
      const target = idx + dir * step;
      if (target < 0 || target >= STAGE_ORDER.length) return null;
      for (const s of sameCondition.filter((x) => stageOf(x) === target)) {
        const hit = s.exercises.find(
          (c) =>
            !inSeance.has(c.id) &&
            !used.has(c.id) &&
            pickable.has(c.id) &&
            c.bodyPartIds.some((b) => ex.bodyPartIds.includes(b)),
        );
        if (hit) return hit;
      }
    }
    return null;
  };

  const out: Recommendation[] = [];
  // Exercices surveillés d'abord (plus facile en premier pour eux).
  const ordered = [...current.exercises].sort((a, b) => Number(watch.has(b.name)) - Number(watch.has(a.name)));
  for (const ex of ordered) {
    const reason = watch.get(ex.name) ?? null;
    for (const dir of reason ? ([-1] as const) : ([-1, 1] as const)) {
      const alt = find(ex, dir);
      if (!alt) continue;
      used.add(alt.id);
      out.push({ forId: ex.id, forName: ex.name, kind: dir === -1 ? "easier" : "harder", alt: { id: alt.id, name: alt.name }, reason });
    }
  }
  return out.slice(0, max);
}
