// =============================================================================
// Douleur de la séance, déduite des douleurs notées exercice par exercice.
//
// (Philippe, 2026-11-06 : audit, on allège) La question « Comment vous
// sentez-vous ? » de fin de séance (échelle 1–10) est supprimée : le patient
// note déjà la douleur de chaque exercice (0–10). La valeur de séance que le
// kiné voit (patient_feedback.pain_score : stat « Douleur », courbe 30 jours,
// frein de phase, alertes) est désormais la PLUS FORTE douleur notée pendant
// la séance, ramenée sur l'échelle 1–10 de la colonne (0 = « aucune » → 1,
// qui voulait déjà dire « aucune » sur l'ancienne échelle).
// =============================================================================

/**
 * Plus forte douleur notée pendant la séance, sur 1–10, ou null si le patient
 * n'a noté aucune douleur (patient_feedback.pain_score étant NOT NULL, aucune
 * ligne n'est alors enregistrée).
 */
export function sessionPainScore(pains: (number | null | undefined)[]): number | null {
  const answered = pains.filter((p): p is number => typeof p === "number" && Number.isFinite(p));
  if (answered.length === 0) return null;
  const highest = Math.max(...answered);
  return Math.min(10, Math.max(1, Math.round(highest)));
}
