// « Un niveau plus facile / plus difficile » (Philippe, 2026-11-02, inspiré
// des programmes modèles de Fullphysio) : chaque condition a déjà ses séances
// par phase (aiguë → reprise du sport, migrations 0007 / 0025). Monter ou
// descendre d'un niveau = passer à la séance de la même condition, phase
// suivante ou précédente.

export const STAGE_ORDER = ["acute", "subacute", "recovery", "return_to_sport"] as const;

export interface LevelCandidate {
  id: string;
  conditionId: string | null;
  stage: string | null;
}

/** La séance d'un niveau en dessous / au-dessus, dans la même condition.
 *  Saute une phase sans séance (ex. aiguë → récupération s'il n'y a rien en
 *  subaiguë). Le premier candidat de la liste l'emporte (l'ordre de la liste
 *  est déjà celui que le kiné voit). */
export function levelNeighbours(
  current: { id: string; conditionId: string | null; stage: string | null },
  pool: LevelCandidate[],
): { easier: string | null; harder: string | null } {
  const idx = STAGE_ORDER.indexOf((current.stage ?? "") as (typeof STAGE_ORDER)[number]);
  if (!current.conditionId || idx < 0) return { easier: null, harder: null };
  const sameCondition = pool.filter((w) => w.conditionId === current.conditionId && w.id !== current.id);
  const at = (i: number) => sameCondition.find((w) => w.stage === STAGE_ORDER[i])?.id ?? null;
  let easier: string | null = null;
  for (let i = idx - 1; i >= 0 && !easier; i--) easier = at(i);
  let harder: string | null = null;
  for (let i = idx + 1; i < STAGE_ORDER.length && !harder; i++) harder = at(i);
  return { easier, harder };
}
