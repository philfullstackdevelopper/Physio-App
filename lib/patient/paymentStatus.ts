// Repère de 3 mois après la fin de l'accès, dont le kiné se servait pour juger
// quand il devient raisonnable de supprimer la fiche d'un « ancien patient ».
// Depuis le 2026-10-24 il n'y a plus d'abonnement patient, donc plus d'ancien
// patient calculé automatiquement : la valeur d'entrée est toujours null en
// pratique, la fonction reste pour l'interface de la liste.
export function paymentEligibleForDeletion(paymentLapsedAt: string | null, now: Date): boolean {
  if (!paymentLapsedAt) return false;
  const eligible = new Date(paymentLapsedAt);
  eligible.setMonth(eligible.getMonth() + 3);
  return eligible.getTime() <= now.getTime();
}
