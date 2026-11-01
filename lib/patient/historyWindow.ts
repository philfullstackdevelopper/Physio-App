// Jour d'une séance pour l'Historique du patient (liste et détail).

/** Libellé du jour d'une séance ; sert aussi de clé de regroupement. */
export function formatHistoryDay(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
}
