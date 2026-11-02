// Doses saisies par le kiné (séries, répétitions, maintien) dans les fenêtres
// « Modifier la séance » et « Ajuster la séance » (migration 0080). Champs
// nommés par exercice : dose_sets_<id>, dose_reps_<id>, dose_hold_<id>.
// Vide = la règle habituelle (3 séries de 8 à 12).

export interface DoseColumns {
  sets?: number;
  reps?: number;
  hold_seconds?: number;
}

const clampInt = (raw: FormDataEntryValue | null, min: number, max: number): number | undefined => {
  const n = Math.round(Number(String(raw ?? "").trim()));
  if (!String(raw ?? "").trim() || !Number.isFinite(n)) return undefined;
  return Math.min(max, Math.max(min, n));
};

/** Les colonnes à écrire pour un exercice — seulement celles remplies, pour
 *  qu'une séance sans dose s'enregistre même avant la migration 0080. */
export function doseColumnsFromForm(formData: FormData, exerciseId: string): DoseColumns {
  const out: DoseColumns = {};
  const sets = clampInt(formData.get(`dose_sets_${exerciseId}`), 1, 10);
  const reps = clampInt(formData.get(`dose_reps_${exerciseId}`), 1, 100);
  const hold = clampInt(formData.get(`dose_hold_${exerciseId}`), 1, 600);
  if (sets !== undefined) out.sets = sets;
  if (reps !== undefined) out.reps = reps;
  if (hold !== undefined) out.hold_seconds = hold;
  return out;
}

/** Recopie la dose d'une ligne existante (lue avec select("*")). */
export function doseColumnsFromRow(row: Record<string, unknown>): DoseColumns {
  const out: DoseColumns = {};
  if (typeof row.sets === "number") out.sets = row.sets;
  if (typeof row.reps === "number") out.reps = row.reps;
  if (typeof row.hold_seconds === "number") out.hold_seconds = row.hold_seconds;
  return out;
}
