// =============================================================================
// Platform fee — pure logic (no DB, no Stripe). What a kiné owes Physio-App
// each month: 15% of his own declared patient price, per patient, prorated
// for how many days of that month the patient was enrolled.
//
// v1 simplification, stated plainly (not silently assumed): there is no
// "active"/"deactivated" concept on patients yet, only a creation date. A
// patient counts as enrolled from patients.created_at onward, indefinitely —
// see the plan doc for why, and what a future iteration would add.
// =============================================================================

export const PLATFORM_FEE_RATE = 0.15;

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
