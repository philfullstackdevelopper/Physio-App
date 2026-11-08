// Phases d'une pathologie (Phase 1 à 4) : doses par défaut, critère pour
// passer à la suivante, et « séance suivante » (Philippe, 2026-11-05 —
// propositions 2 et 5 de la page « Modèles de séances »).
//
// Contenu clinique rédigé par Claude à partir de la pratique courante : à
// faire relire par le kiné partenaire avant le lancement, comme les modèles.

import { STAGE_ORDER } from "./levelStep.ts";

export type Stage = (typeof STAGE_ORDER)[number];

/** Dose proposée pour un exercice en répétitions ajouté à une séance de cette
 *  phase (le kiné la modifie librement). Les exercices de maintien ou
 *  d'endurance gardent leur consigne. */
export const PHASE_DOSE: Record<Stage, { sets: number; reps: number }> = {
  acute: { sets: 3, reps: 10 },
  subacute: { sets: 3, reps: 12 },
  recovery: { sets: 3, reps: 10 },
  return_to_sport: { sets: 3, reps: 8 },
};

/** Ce qui doit être atteint pour QUITTER cette phase. */
export const PHASE_PASS: Record<Stage, string> = {
  acute: "Douleur au repos ≤ 3/10, gonflement stable, contraction musculaire possible",
  subacute: "Amplitude presque complète, marche (ou geste quotidien) sans boiterie",
  recovery: "Force ≥ 80 % du côté sain, pas de douleur le lendemain des séances",
  return_to_sport: "Tests de saut et de course validés par le kiné",
};

/** PHASE_PASS dans la langue de l'interface (`t` = traducteur
 *  « exercise.phasePass », fourni par l'appelant ; absent = français). */
export function phasePass(stage: Stage, t?: (key: string) => string): string {
  return t ? t(stage) : PHASE_PASS[stage];
}

export const PHASE_NUMBER: Record<Stage, number> = { acute: 1, subacute: 2, recovery: 3, return_to_sport: 4 };

export function isStage(s: string | null | undefined): s is Stage {
  return !!s && (STAGE_ORDER as readonly string[]).includes(s);
}

/** Dose pré-remplie d'un exercice en répétitions, ou null (phase inconnue,
 *  exercice de maintien ou d'endurance). */
export function phaseDoseFor(stage: string | null | undefined, kind: "reps" | "hold" | "duration" | undefined) {
  if (!isStage(stage) || (kind && kind !== "reps")) return null;
  return PHASE_DOSE[stage];
}

export interface NextCandidate {
  id: string;
  name: string;
  conditionId?: string | null;
  stage?: string | null;
}

/** Séance suivante dans la même pathologie : la suivante de la même phase
 *  (séance A → séance B, ordre alphabétique des noms), sinon la première de
 *  la phase suivante (une phase vide est sautée). `current` peut être la copie
 *  personnelle d'un patient : elle a le nom, la pathologie et la phase de la
 *  séance d'origine, qui n'est donc pas reproposée. */
export function nextSeance<T extends NextCandidate>(current: NextCandidate, pool: T[]): T | null {
  const idx = STAGE_ORDER.indexOf((current.stage ?? "") as Stage);
  if (!current.conditionId || idx < 0) return null;
  const rank = (w: NextCandidate) => STAGE_ORDER.indexOf((w.stage ?? "") as Stage);
  const after = (w: NextCandidate) => {
    const r = rank(w);
    if (r !== idx) return r > idx;
    return w.name.localeCompare(current.name, "fr") > 0;
  };
  const candidates = pool
    .filter((w) => w.id !== current.id && w.conditionId === current.conditionId && rank(w) >= 0 && after(w))
    .sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name, "fr"));
  return candidates[0] ?? null;
}
