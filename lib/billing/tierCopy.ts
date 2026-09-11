import { TIERS, type TierKey } from "./plans";

// Copie d'affichage partagée entre /patient/abonnement (premier choix) et
// /patient/compte/changer-offre (changement d'offre) — extraite ici pour que
// les deux pages parlent des offres dans les mêmes termes (Philippe,
// 2026-09-11 : changer-offre doit reprendre le langage de la page de base).

// L'avantage qui distingue le plus chaque offre des deux autres (Philippe,
// 2026-09-11 : « mettre en avant un avantage pour chacun des abonnements »).
// Volontairement distinct de featuresFor() ci-dessous : la liste à coches
// reste exhaustive et commune, ceci est le seul argument mis en avant.
export const HIGHLIGHT: Record<TierKey, string> = {
  essentiel: "Le plus accessible pour démarrer",
  standard: "Le meilleur équilibre séances / prix",
  premium: "Aucune limite de séances",
};

// Ce que chaque offre débloque, en langage patient. Les trois premières
// lignes viennent de lib/billing/plans.ts (plafond, vidéo, historique) ; le
// reste est commun.
export function featuresFor(key: TierKey): string[] {
  const t = TIERS[key];
  const cap =
    t.weeklyCap === null
      ? "Séances illimitées chaque semaine"
      : t.weeklyCap === 1
        ? "1 séance par semaine"
        : `Jusqu'à ${t.weeklyCap} séances par semaine`;
  const history =
    t.historyDaysVisible === null
      ? "Historique complet de vos séances"
      : `Historique des ${t.historyDaysVisible} derniers jours`;
  return [
    cap,
    history,
    ...(t.videoLibrary ? ["Bibliothèque vidéo complète"] : []),
    "Programme personnalisé par votre kiné",
    "Suivi de vos séances et de vos douleurs",
    "Messagerie directe avec votre kiné",
  ];
}
