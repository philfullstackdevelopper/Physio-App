// Equipment a patient has at home, declared during onboarding
// (patient_profiles.equipment, migration 0050). Surfaced on the kiné's
// patient page so he can factor it in when picking/adjusting a séance — there
// is no automatic equipment-based exercise filtering yet (the exercise
// library has no equipment tags of its own; tagging ~300 exercises is a
// separate, larger effort), so this is informational for now.
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
