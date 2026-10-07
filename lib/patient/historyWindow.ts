// Fenêtre d'historique visible selon l'offre du patient — une seule règle
// partagée par la liste (app/patient/historique/page.tsx) et le détail d'une
// séance (app/patient/historique/[logId]/page.tsx), qui la contournait :
// l'URL d'une vieille séance restait ouvrable en Essentiel (Philippe,
// 2026-10-07).
import { TIERS, isTierKey } from "@/lib/billing/plans";

/** Libellé du jour d'une séance ; sert aussi de clé de regroupement. */
export function formatHistoryDay(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
}

/** Nombre de jours (avec séance) visibles en clair avant le verrou.
 *  Plan inconnu/historique (patient_monthly, grandfathering) = illimité (null),
 *  pas de mauvaise surprise sur un abonnement qui n'a jamais eu cette règle. */
export function historyDaysVisibleFor(subPlan: string | null | undefined): number | null {
  return isTierKey(subPlan) ? TIERS[subPlan].historyDaysVisible : null;
}
