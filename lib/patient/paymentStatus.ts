// Shared by lib/dashboard/patientRows.ts (list) and
// app/dashboard/patients/[id]/page.tsx (detail): whether a patient marked as
// no longer paying (patients.payment_lapsed_at, migration 0049) has passed
// the 3-month mark the instructor uses to judge when it's reasonable to
// delete them. Advisory only — see PatientActionsMenu, nothing enforces it.
export function paymentEligibleForDeletion(paymentLapsedAt: string | null, now: Date): boolean {
  if (!paymentLapsedAt) return false;
  const eligible = new Date(paymentLapsedAt);
  eligible.setMonth(eligible.getMonth() + 3);
  return eligible.getTime() <= now.getTime();
}
