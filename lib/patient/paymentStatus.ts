// « Ancien patient » : un patient dont l'abonnement ne donne plus accès à
// l'appli. Partagé par lib/dashboard/patientRows.ts (liste) et
// app/dashboard/patients/[id]/page.tsx (fiche).
//
// Depuis le 2026-10-10 (Philippe) c'est AUTOMATIQUE, d'après l'abonnement
// Stripe du patient (table subscriptions, lisible par son kiné — migration
// 0055) et avec exactement la même règle que l'écran cadenas côté patient
// (lockReason, lib/billing/access.ts). Avant, le kiné posait lui-même une
// étiquette « ne paie plus » (patients.payment_lapsed_at, migration 0049) —
// la colonne existe toujours mais n'est plus lue ni écrite.
import { lockReason, type LockReason } from "../billing/access.ts";

export interface SubscriptionLapse {
  reason: LockReason;
  /** Depuis quand le patient n'a plus accès (approximatif pour une carte refusée). */
  at: string;
}

export function subscriptionLapse(
  status: string | null | undefined,
  currentPeriodEnd: string | null | undefined,
  now: Date = new Date(),
): SubscriptionLapse | null {
  const reason = lockReason(status, currentPeriodEnd, now);
  if (!reason) return null;
  if (reason === "payment_failed" && currentPeriodEnd) {
    // Stripe a déjà avancé la période d'un mois au moment de l'échec : le
    // prélèvement refusé date d'environ un mois avant la fin de période.
    const failedAt = new Date(currentPeriodEnd);
    failedAt.setUTCMonth(failedAt.getUTCMonth() - 1);
    return { reason, at: (failedAt.getTime() < now.getTime() ? failedAt : now).toISOString() };
  }
  const end = currentPeriodEnd ? new Date(currentPeriodEnd) : now;
  return { reason, at: (end.getTime() < now.getTime() ? end : now).toISOString() };
}

// Repère de 3 mois après la fin de l'accès, dont le kiné se sert pour juger
// quand il devient raisonnable de supprimer la fiche. Indicatif seulement —
// rien ne l'impose (voir PatientActionsMenu).
export function paymentEligibleForDeletion(paymentLapsedAt: string | null, now: Date): boolean {
  if (!paymentLapsedAt) return false;
  const eligible = new Date(paymentLapsedAt);
  eligible.setMonth(eligible.getMonth() + 3);
  return eligible.getTime() <= now.getTime();
}
