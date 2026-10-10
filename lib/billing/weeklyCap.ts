// Plafond de séances par semaine selon l'offre du patient (spec
// docs/superpowers/specs/2026-09-08-patient-program-tiers-design.md §4).
// Annoncé sur la page des offres depuis septembre mais jamais appliqué
// (audit du 2026-10-08) : désormais vérifié quand le kiné attribue une
// séance — c'est lui qui est prévenu, jamais le patient bloqué au milieu de
// sa rééducation.
//
// Extension explicite : ce module tourne aussi sous `node --test`.
import { TIERS, isTierKey } from "./plans.ts";

/**
 * Message à montrer au kiné si la séance dépasse l'offre du patient, sinon
 * null. Pas d'offre (patient pas encore abonné : le kiné prépare souvent le
 * programme avant), ancienne offre ou Premium : jamais de blocage.
 */
export function weeklyCapViolation(
  plan: string | null | undefined,
  subscriptionLive: boolean,
  timesPerWeek: number | null | undefined,
): string | null {
  if (!subscriptionLive || !isTierKey(plan)) return null;
  const cap = TIERS[plan].weeklyCap;
  const wanted = timesPerWeek ?? 1;
  if (cap === null || wanted <= cap) return null;
  return `Ce patient a l'offre ${TIERS[plan].label} (${cap} séance${cap > 1 ? "s" : ""} par semaine au plus) et cette séance est prévue ${wanted} fois par semaine. Choisissez une séance moins fréquente, ou proposez-lui de passer à l'offre supérieure.`;
}
