// Offres patient — source unique de vérité pour les prix, les plafonds et
// l'accès vidéo (spec docs/superpowers/specs/2026-09-08-patient-program-tiers-design.md
// §1). Réutilisé tel quel par le checkout Stripe et par l'affichage, pour que
// le prix annoncé et le prix facturé ne puissent jamais diverger. Les montants
// sont en centimes ; les prix sont construits inline au checkout (price_data),
// donc aucun Price ID Stripe à gérer.
//
// Les trois montants ci-dessous sont la BASE par défaut : chaque kiné peut les
// remplacer par les siens (instructors.tier_*_cents, migration 0053) — voir
// resolveTierPrices(). Le plafond et l'accès vidéo, eux, ne se modifient pas.

export type TierKey = "essentiel" | "standard" | "premium";

export interface Tier {
  key: TierKey;
  label: string;
  /** Prix par défaut, centimes / mois — actuellement le tarif de lancement. */
  amount: number;
  /**
   * Prix "normal" de référence, centimes / mois, affiché barré pendant
   * l'offre de lancement (Philippe, 2026-09-11 : -50% temporaire, remontera
   * à ce prix ensuite). Uniquement indicatif côté affichage — n'est jamais
   * facturé, `amount` (ou le prix propre du kiné) reste la seule source
   * pour Stripe.
   */
  listAmount: number;
  /** Séances recommandables par semaine ; null = illimité. */
  weeklyCap: number | null;
  videoLibrary: boolean;
  /**
   * Combien de jours d'historique (page /patient/historique) le patient voit
   * en clair ; au-delà, les blocs sont verrouillés avec une incitation à
   * passer à l'offre supérieure. null = illimité (Philippe, 2026-09-11 :
   * Standard doit débloquer plus qu'Essentiel au-delà du seul nombre de
   * séances/semaine).
   */
  historyDaysVisible: number | null;
}

export const TIER_KEYS: readonly TierKey[] = ["essentiel", "standard", "premium"] as const;

export const TIERS: Record<TierKey, Tier> = {
  essentiel: {
    key: "essentiel",
    label: "Essentiel",
    amount: 1999,
    listAmount: 3999,
    weeklyCap: 1,
    videoLibrary: false,
    historyDaysVisible: 7,
  },
  standard: {
    key: "standard",
    label: "Standard",
    amount: 2999,
    listAmount: 5999,
    weeklyCap: 3,
    videoLibrary: false,
    historyDaysVisible: null,
  },
  premium: {
    key: "premium",
    label: "Premium",
    amount: 3999,
    listAmount: 7999,
    weeklyCap: null,
    videoLibrary: true,
    historyDaysVisible: null,
  },
};

export const CURRENCY = "eur";

/** Jours gratuits avant le premier prélèvement (Philippe, 2026-09-10). */
export const TRIAL_DAYS = 7;

export function isTierKey(v: unknown): v is TierKey {
  return typeof v === "string" && (TIER_KEYS as readonly string[]).includes(v);
}

/** Les colonnes de prix propres à un kiné (instructors, migration 0053). */
export interface InstructorTierPriceRow {
  tier_essentiel_cents: number | null;
  tier_standard_cents: number | null;
  tier_premium_cents: number | null;
}

/** Prix effectifs d'un kiné : sa colonne si renseignée, sinon le défaut. */
export function resolveTierPrices(row: InstructorTierPriceRow | null | undefined): Record<TierKey, number> {
  return {
    essentiel: row?.tier_essentiel_cents ?? TIERS.essentiel.amount,
    standard: row?.tier_standard_cents ?? TIERS.standard.amount,
    premium: row?.tier_premium_cents ?? TIERS.premium.amount,
  };
}

// ---- Historique -------------------------------------------------------------
// L'ancien abonnement patient → EasyPhysio à 10 €/mois (`plan = 'patient_monthly'`)
// n'est plus proposé à la vente (spec §1). Les lignes `subscriptions` qui le
// portent encore restent valides (grandfathering, spec §7) : lib/billing/access.ts
// les reconnaît par leur clé, il n'y a plus rien à définir ici.
