// =============================================================================
// Platform fee — pure logic (no DB, no Stripe). What a kiné owes EasyPhysio
// each month: 16% of his own declared patient price, per patient, prorated
// for how many days of that month the patient was enrolled.
//
// Rate history (Philippe, 2026-09-10): 15% originally -> briefly 20% to
// cover a Stripe processing fee absorption that turned out unsupported on
// Standard accounts (see startConnectOnboarding()) -> settled on 16% as
// plain platform margin. Note this lands close to, but not exactly, a flat
// 5€/patient — it's a %, not a flat fee, so the exact amount still scales
// with each kiné's own tier prices (lib/billing/plans.ts): launch prices as
// of 2026-09-11 are 19,99€/29,99€/39,99€ (Tier.amount) — a temporary -50%
// off the 39,99€/59,99€/79,99€ list prices (Tier.listAmount) shown struck
// through on /patient/abonnement — giving ~3,20€ / ~4,80€ / ~6,40€ at
// today's rate.
//
// v1 simplification, stated plainly (not silently assumed): there is no
// "active"/"deactivated" concept on patients yet, only a creation date. A
// patient counts as enrolled from patients.created_at onward, indefinitely —
// see the plan doc for why, and what a future iteration would add.
// =============================================================================

export const PLATFORM_FEE_RATE = 0.16;

/** Whole days in a given calendar month (UTC, month is 0-indexed like Date). */
export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

/**
 * How many days of [monthStart, monthEnd] a patient enrolled on `enrolledAt`
 * was active for. Clamped to the month's bounds — a patient enrolled before
 * the month started counts from day 1; one enrolled after the month ended
 * counts as 0.
 */
export function daysActiveInMonth(enrolledAt: Date, monthStart: Date, monthEnd: Date): number {
  const start = enrolledAt.getTime() > monthStart.getTime() ? enrolledAt : monthStart;
  if (start.getTime() > monthEnd.getTime()) return 0;
  const msPerDay = 86_400_000;
  return Math.floor((monthEnd.getTime() - start.getTime()) / msPerDay) + 1;
}

/** The platform fee, in cents, for one patient for one month. */
export function proratedFeeCents(
  kinePriceCents: number,
  activeDays: number,
  totalDaysInMonth: number,
): number {
  if (totalDaysInMonth <= 0) return 0;
  const raw = (kinePriceCents * PLATFORM_FEE_RATE * activeDays) / totalDaysInMonth;
  return Math.round(raw);
}

export interface PatientEnrollment {
  patientId: string;
  createdAt: Date;
}

export interface MonthlyFeeResult {
  patientCount: number;
  amountCents: number;
  perPatient: { patientId: string; activeDays: number; amountCents: number }[];
}

/** The full monthly bill for one kiné across all of his patients. */
export function computeMonthlyFee(
  kinePriceCents: number,
  patients: PatientEnrollment[],
  monthStart: Date,
  monthEnd: Date,
): MonthlyFeeResult {
  const totalDays = daysInMonth(monthStart.getUTCFullYear(), monthStart.getUTCMonth());
  const perPatient = patients.map((p) => {
    const activeDays = daysActiveInMonth(p.createdAt, monthStart, monthEnd);
    return {
      patientId: p.patientId,
      activeDays,
      amountCents: proratedFeeCents(kinePriceCents, activeDays, totalDays),
    };
  });
  const withActivity = perPatient.filter((p) => p.activeDays > 0);
  return {
    patientCount: withActivity.length,
    amountCents: withActivity.reduce((sum, p) => sum + p.amountCents, 0),
    perPatient: withActivity,
  };
}

export interface MonthEstimate {
  totalCents: number;
  feeCents: number;
  netCents: number;
  feeShare: number;
}

/**
 * Simulateur de la page Tarif : ce que N patients abonnés un mois complet
 * rapportent au kiné, ce qu'EasyPhysio prélève (15 %) et ce qu'il garde.
 * Pas de prorata ici — c'est une estimation « mois plein ».
 */
export function estimateMonth(priceCents: number, patientCount: number): MonthEstimate {
  const n = Math.max(0, Math.floor(patientCount));
  const price = Math.max(0, priceCents);
  const totalCents = price * n;
  const feeCents = Math.round(totalCents * PLATFORM_FEE_RATE);
  return { totalCents, feeCents, netCents: totalCents - feeCents, feeShare: PLATFORM_FEE_RATE };
}

// Le taux Stripe n'est pas quelque chose que cette appli connaît précisément
// à partir de ses seules données (il dépend de la banque émettrice de chaque
// carte et des paliers Stripe) — le rapprochement avec les vrais relevés
// Stripe est prévu pour plus tard (sous-projet 2, CLAUDE.md §4). En
// attendant, on affiche une estimation avec le tarif standard Stripe pour
// les cartes européennes (1,5 % + 0,25 €), clairement marquée « à peu près »
// dans l'UI plutôt que présentée comme un chiffre exact.
export const STRIPE_FEE_RATE = 0.015;
export const STRIPE_FEE_FIXED_CENTS = 25;

export interface TierRevenue {
  priceCents: number;
  count: number;
}

export interface MonthlySplit {
  totalCents: number;
  platformFeeCents: number;
  stripeFeeCents: number;
  netCents: number;
}

/**
 * Répartition « roue » de la page Tarif : à partir du tarif et du nombre de
 * patients abonnés de CHAQUE offre (des données réelles, pas une simulation
 * manuelle), combien va au kiné, combien à EasyPhysio (16 %, PLATFORM_FEE_RATE)
 * et combien (environ) à Stripe. Un abonnement = une transaction : le taux
 * Stripe s'applique au tarif de CETTE offre, le forfait fixe une fois par
 * patient payant.
 */
export function estimateMonthlySplit(tiers: TierRevenue[]): MonthlySplit {
  let totalCents = 0;
  let stripeFeeCents = 0;
  for (const { priceCents, count } of tiers) {
    const n = Math.max(0, Math.floor(count));
    const price = Math.max(0, priceCents);
    totalCents += price * n;
    stripeFeeCents += Math.round(price * STRIPE_FEE_RATE + STRIPE_FEE_FIXED_CENTS) * n;
  }
  const platformFeeCents = Math.round(totalCents * PLATFORM_FEE_RATE);
  return { totalCents, platformFeeCents, stripeFeeCents, netCents: totalCents - platformFeeCents - stripeFeeCents };
}
