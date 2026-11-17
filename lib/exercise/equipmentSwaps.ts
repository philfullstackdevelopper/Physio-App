// Remplacement automatique des exercices selon le matériel du patient
// (Philippe, 2026-11-17 : « are we sure all of these respect the things the
// patient said they had at the beginning? » → « Yes, build it »).
//
// Une séance de la PLATEFORME est la même pour tous. Quand le patient n'a pas
// le matériel qu'un de ses exercices exige (élastique, haltères, vélo, corde),
// on lui montre à la place un exercice filmé, sans matériel, qui travaille la
// même chose. Le patient et son kiné voient le même remplacement (le kiné avec
// la mention « remplacé faute de matériel »).
//
// Ne touche PAS :
// - les séances d'un kiné, ni les copies « Ajuster la séance » d'un patient :
//   le kiné y a choisi ses exercices en voyant le matériel du patient ;
// - un patient dont on ne connaît pas encore le matériel (questionnaire pas fait).
//
// Contenu clinique choisi par Claude : à relire par Jules.

import { missingEquipment } from "./equipment.ts";
import { platformExerciseName } from "./exerciseNames.ts";

/** Exercice à remplacer (nom anglais en base) → remplaçants, par ordre de
 *  préférence, tous filmés et sans matériel (ou objet de la maison). */
export const NO_EQUIPMENT_SWAPS: Readonly<Record<string, readonly string[]>> = {
  "Cycling": ["Walking"],
  "Jump Rope": ["Lateral Shuffle", "Hop and Stick"],
  "Banded Row": ["Prone T Arm Raise (Floor)", "Reverse Snow Angel", "Prone Y Raise", "Wall Slides"],
  "Banded Face Pull": ["Prone Y Raise", "Reverse Snow Angel", "Prone T Arm Raise (Floor)", "Wall Slides", "Chin Tuck", "Thoracic Extension Over Chair"],
  "Band Shoulder External Rotation": ["Shoulder Isometrics Against Wall", "Prone T Arm Raise (Floor)", "Wall Slides"],
  "Band Shoulder Internal Rotation": ["Shoulder Isometrics Against Wall", "Towel Internal Rotation Stretch", "Wall Slides", "Shoulder Circles"],
  "External Rotation at 90° Abduction (Band)": ["Prone Y Raise", "Prone T Arm Raise (Floor)", "Wall Slides"],
  "Banded Clamshell": ["Side-Lying Hip Abduction", "Glute Bridge", "Glute Bridge March", "Single-Leg Stance", "Bird Dog"],
  "Banded Lateral Walk": ["Side-Lying Hip Abduction", "Single-Leg Stance", "Lateral Weight Shift", "Glute Bridge"],
  "Banded Standing Hip Abduction": ["Side-Lying Hip Abduction", "Single-Leg Stance", "Glute Bridge"],
  "Pallof Press": ["Dead Bug", "Modified Side Plank (Light)", "Bird Dog", "Plank"],
  "Terminal Knee Extension (Band)": ["Quad Set", "Straight Leg Raise", "Wall Sit", "Sit-to-Stand"],
  "Ankle Eversion (Band)": ["Lateral Weight Shift", "Single-Leg Stance", "Calf Raise", "Y-Balance Reach", "Ankle Circles"],
  "Farmer Carry": ["Plank", "Bird Dog", "Walking"],
};

/** Tous les remplaçants possibles (pour les lire en base en une requête). */
export const SWAP_TARGET_NAMES: readonly string[] = [...new Set(Object.values(NO_EQUIPMENT_SWAPS).flat())];

export interface SwapInput {
  name: string;
  equipment?: readonly string[] | null;
}

/**
 * Pour chaque exercice de la séance (dans l'ordre), le nom anglais du
 * remplaçant, ou null s'il reste tel quel. Un remplaçant déjà présent dans la
 * séance (ou déjà choisi plus haut) est sauté ; sans remplaçant possible,
 * l'exercice reste (le kiné voit alors la pastille « matériel manquant »).
 * `patientEquipment` null = matériel inconnu → aucun remplacement.
 */
export function planEquipmentSwaps(rows: readonly SwapInput[], patientEquipment: readonly string[] | null | undefined): (string | null)[] {
  if (patientEquipment == null) return rows.map(() => null);
  const present = new Set(rows.map((r) => platformExerciseName(r.name)));
  return rows.map((r) => {
    if (missingEquipment(r.equipment, patientEquipment).length === 0) return null;
    const options = NO_EQUIPMENT_SWAPS[platformExerciseName(r.name)] ?? [];
    const pick = options.find((o) => !present.has(o));
    if (!pick) return null;
    present.add(pick);
    return pick;
  });
}

/**
 * Applique le plan à des lignes de séance `{ exercises: … }`, avec `lookup`
 * qui donne l'exercice remplaçant à partir de son nom anglais (ex. une liste
 * d'exercices déjà chargée). Une ligne remplacée reçoit `swappedFrom` (nom
 * d'origine, tel qu'affiché) ; répétitions et maintien repassent à la règle
 * habituelle du nouvel exercice, le nombre de séries est gardé.
 */
export function swapRows<E extends SwapInput, R extends { exercises: E | null }>(
  rows: readonly R[],
  patientEquipment: readonly string[] | null | undefined,
  lookup: (englishName: string) => E | undefined,
): (R & { swappedFrom: string | null })[] {
  const plan = planEquipmentSwaps(rows.map((r) => ({ name: r.exercises?.name ?? "", equipment: r.exercises?.equipment })), patientEquipment);
  return rows.map((r, i) => {
    const target = plan[i] ? lookup(plan[i]!) : undefined;
    if (!target || !r.exercises) return { ...r, swappedFrom: null };
    const swapped = { ...r, exercises: target, swappedFrom: r.exercises.name } as R & { swappedFrom: string | null };
    if ("reps" in swapped) (swapped as Record<string, unknown>).reps = null;
    if ("hold_seconds" in swapped) (swapped as Record<string, unknown>).hold_seconds = null;
    return swapped;
  });
}

/** Séance concernée par les remplacements : une séance de la plateforme (ni
 *  créée par un kiné, ni copie personnelle d'un patient). */
export function isPlatformSeance(w: { created_by?: unknown; patient_id?: unknown } | null | undefined): boolean {
  return !!w && !w.created_by && !w.patient_id;
}
