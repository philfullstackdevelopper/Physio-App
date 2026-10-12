// Matériel : ce que le PATIENT a chez lui, et ce dont un EXERCICE a besoin.
//
// 1. Le patient déclare son matériel pendant l'onboarding
//    (patient_profiles.equipment, migration 0050) — EquipmentId ci-dessous.
// 2. Chaque exercice porte la liste du matériel INDISPENSABLE pour le faire
//    (exercises.equipment, migration 0065) — ExerciseEquipmentId : les mêmes
//    identifiants, plus du matériel qu'un patient n'a en principe pas chez lui
//    (appareils de salle, kettlebell, piscine…).
// 3. Quand le kiné compose ou ajuste une séance, l'appli lui SIGNALE les
//    exercices pour lesquels il manque du matériel au patient (missingEquipment)
//    et les range tout en bas de la liste, après les exercices faisables — sans jamais
//    l'empêcher de choisir : c'est lui qui décide (Philippe, 2026-10-12 : « are
//    we sure that the exercises the physio can assign depend on what the
//    patient can work with at home? »). Avant, le matériel du patient n'était
//    qu'une information sur sa fiche, sans lien avec les exercices.
//
// Le classement des ~360 exercices de la plateforme a été fait par Claude à
// partir du nom et des consignes de chaque exercice (2026-10-12) — à faire
// relire par le kiné partenaire avant le lancement, comme le reste du contenu
// clinique. « tapis » n'est jamais indispensable (confort) : aucun exercice
// ne l'exige.

/** Matériel que le patient peut déclarer avoir chez lui (onboarding). */
export type EquipmentId =
  | "aucun"
  | "tapis"
  | "elastiques"
  | "halteres"
  | "chaise"
  | "velo_rameur"
  | "barre_traction"
  | "swiss_ball";

export const EQUIPMENT_LABELS: Record<EquipmentId, string> = {
  aucun: "Aucun matériel (poids du corps)",
  tapis: "Tapis de sol",
  elastiques: "Élastiques de résistance",
  halteres: "Haltères ou poids légers",
  chaise: "Chaise ou banc stable",
  velo_rameur: "Vélo d'appartement ou rameur",
  barre_traction: "Barre de traction",
  swiss_ball: "Swiss ball / ballon de gym",
};

export const EQUIPMENT_OPTIONS = Object.keys(EQUIPMENT_LABELS) as EquipmentId[];

/** Matériel qu'un exercice peut exiger : celui du patient, plus du matériel
 *  qu'on ne trouve en principe pas à la maison. */
export type ExerciseEquipmentId =
  | Exclude<EquipmentId, "aucun" | "tapis">
  | "salle"
  | "kettlebell"
  | "corde_a_sauter"
  | "roue_abdominale"
  | "piscine";

/** Libellés courts, pour la pastille « Matériel : … » du sélecteur d'exercices. */
export const EXERCISE_EQUIPMENT_LABELS: Record<ExerciseEquipmentId, string> = {
  elastiques: "Élastique",
  halteres: "Haltères",
  chaise: "Chaise ou banc",
  velo_rameur: "Vélo ou rameur",
  barre_traction: "Barre de traction",
  swiss_ball: "Swiss ball",
  salle: "Matériel de salle",
  kettlebell: "Kettlebell",
  corde_a_sauter: "Corde à sauter",
  roue_abdominale: "Roue abdominale",
  piscine: "Piscine",
};

/** Ordre d'affichage (formulaire « exercice » du kiné, pastilles). */
export const EXERCISE_EQUIPMENT_OPTIONS = Object.keys(EXERCISE_EQUIPMENT_LABELS) as ExerciseEquipmentId[];

export function isExerciseEquipmentId(v: unknown): v is ExerciseEquipmentId {
  return typeof v === "string" && v in EXERCISE_EQUIPMENT_LABELS;
}

/**
 * Le matériel qu'il MANQUE au patient pour faire cet exercice.
 * - exercice sans matériel indispensable → rien ne manque ;
 * - `patientEquipment` null = on ne sait pas ce qu'a le patient (onboarding
 *   pas terminé, ou sélecteur ouvert hors d'une fiche patient) → on ne signale
 *   rien plutôt que de tout marquer à tort ;
 * - sinon, tout ce que l'exercice exige et que le patient n'a pas coché. Le
 *   matériel « hors maison » (salle, piscine…) manque donc toujours.
 */
export function missingEquipment(
  required: readonly string[] | null | undefined,
  patientEquipment: readonly string[] | null | undefined,
): ExerciseEquipmentId[] {
  if (!required || required.length === 0 || patientEquipment == null) return [];
  const owned = new Set(patientEquipment);
  return required.filter((r): r is ExerciseEquipmentId => isExerciseEquipmentId(r) && !owned.has(r));
}

/** « Haltères, Chaise ou banc » — pour la pastille et les infobulles. */
export function equipmentListLabel(ids: readonly string[]): string {
  return ids.filter(isExerciseEquipmentId).map((id) => EXERCISE_EQUIPMENT_LABELS[id]).join(", ");
}
