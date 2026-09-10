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
  /** Prix par défaut, centimes / mois. */
  amount: number;
  /** Séances recommandables par semaine ; null = illimité. */
  weeklyCap: number | null;
  videoLibrary: boolean;
}

export const TIER_KEYS: readonly TierKey[] = ["essentiel", "standard", "premium"] as const;

export const TIERS: Record<TierKey, Tier> = {
  essentiel: { key: "essentiel", label: "Essentiel", amount: 1999, weeklyCap: 1, videoLibrary: false },
  standard: { key: "standard", label: "Standard", amount: 3499, weeklyCap: 3, videoLibrary: false },
  premium: { key: "premium", label: "Premium", amount: 4999, weeklyCap: null, videoLibrary: true },
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
