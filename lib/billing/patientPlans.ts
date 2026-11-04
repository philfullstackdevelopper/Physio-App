// =============================================================================
// MODÈLE DÉFINITIF (Philippe, 2026-11-04) — source unique des montants.
//
// Le patient paie 9,99 € par mois, en DEUX services distincts, vendus par deux
// vendeurs distincts, prélevés en deux paiements distincts sur la même carte :
//
//   1. ACCÈS À LA PLATEFORME — 3,99 € TTC / mois, vendu par EasyPhysio.
//      Abonnement Stripe sur le compte d'EasyPhysio (TVA 20 % incluse, facture
//      EasyPhysio). Dû CHAQUE mois d'accès, que le kiné agisse ou non : c'est
//      le prix de l'appli (hébergement, vidéos, messagerie), jamais une part de
//      l'acte du kiné. 10 jours d'essai gratuit à la première inscription.
//
//   2. PROGRAMME DU KINÉ — 6,00 € / mois, vendu par le kiné.
//      Paiement direct sur le compte Stripe du kiné, 0 % pour EasyPhysio, note
//      d'honoraires à son nom. Prélevé seulement les mois où le kiné met à jour
//      le programme (après l'essai) : honoraires pour un acte réellement fait.
//
// Pourquoi deux paiements (audit juridique du 2026-11-04, reports/Frais
// plateforme patient kiné légalité.md) : EasyPhysio ne prend JAMAIS d'argent
// sur le paiement du kiné (pas d'« application fee »), sinon les 3,99 €
// seraient une part de ses honoraires (art. L.4113-5 / R.4321-72 CSP).
//
// Rien de ce fichier ne lit la base ni Stripe : affichage, prélèvements et
// contrôles lisent les mêmes chiffres. Ne jamais réécrire ces montants ailleurs.
// =============================================================================

/** Accès à la plateforme, TTC, centimes, par mois (EasyPhysio). */
export const PLATFORM_ACCESS_TTC_CENTS = 399;
/** Programme du kiné, centimes, par mois où il met à jour le programme (honoraires, sans TVA). */
export const KINE_FOLLOW_UP_CENTS = 600;
/** Total payé par le patient un mois où le kiné met à jour son programme. */
export const PATIENT_MONTHLY_TOTAL_CENTS = PLATFORM_ACCESS_TTC_CENTS + KINE_FOLLOW_UP_CENTS;
/** Essai gratuit à la première inscription (aucun prélèvement pendant ces jours-là). */
export const TRIAL_DAYS = 10;
/** TVA sur l'accès à la plateforme (les honoraires du kiné en sont exonérés). */
export const PLATFORM_VAT_RATE = 0.2;

/**
 * Nom de la formule dans la table `subscriptions`. « patient_monthly » est un
 * nom déjà autorisé par la base (migration 0080) : aucun changement de base.
 */
export const ACCESS_PLAN_KEY = "patient_monthly";
/** Formules du modèle précédent (2026-11-02), payées sur le compte du kiné : arrêtées. */
export const LEGACY_PLAN_KEYS = ["plan_1m", "plan_3m", "plan_6m"] as const;

export function isLegacyPlanKey(v: unknown): boolean {
  return typeof v === "string" && (LEGACY_PLAN_KEYS as readonly string[]).includes(v);
}

/** Frais Stripe estimés d'un paiement par carte européenne (1,5 % + 0,25 €). */
export function stripeFeeCents(amountCents: number): number {
  return Math.round(amountCents * 0.015 + 25);
}

/** Accès à la plateforme hors TVA, centimes. */
export const PLATFORM_ACCESS_HT_CENTS = Math.round(PLATFORM_ACCESS_TTC_CENTS / (1 + PLATFORM_VAT_RATE));
/** Ce que garde EasyPhysio par patient et par mois, hors TVA, après frais de carte (estimation). */
export const PLATFORM_NET_CENTS = PLATFORM_ACCESS_HT_CENTS - stripeFeeCents(PLATFORM_ACCESS_TTC_CENTS);
/** Ce que touche le kiné par patient et par mois de mise à jour, après frais de carte (estimation). */
export const KINE_NET_CENTS = KINE_FOLLOW_UP_CENTS - stripeFeeCents(KINE_FOLLOW_UP_CENTS);

export function eurosFR(cents: number): string {
  return (cents / 100).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ---------------------------------------------------------------------------
// Accès à l'appli
// ---------------------------------------------------------------------------

export type SubscriptionRow = {
  plan: string;
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean | null;
};

/**
 * L'abonnement d'accès donne-t-il accès à l'appli maintenant ?
 * - actif ou en essai : oui, même résilié, jusqu'à la fin de la période ;
 * - paiement refusé (past_due, unpaid, incomplete) : non, tout de suite
 *   (règle de Philippe : une carte refusée verrouille immédiatement) ;
 * - terminé (canceled…) : non.
 * Une formule de l'ancien modèle reste valable jusqu'à la fin de sa période
 * payée (elle ne se renouvelle plus), puis le patient passe au modèle actuel.
 */
export function subscriptionGivesAccess(sub: SubscriptionRow | null, now: Date = new Date()): boolean {
  if (!sub) return false;
  if (sub.plan !== ACCESS_PLAN_KEY && !isLegacyPlanKey(sub.plan)) return false;
  if (sub.status !== "active" && sub.status !== "trialing") return false;
  const ended = !!sub.current_period_end && new Date(sub.current_period_end) <= now;
  if (ended && (sub.cancel_at_period_end || isLegacyPlanKey(sub.plan))) return false;
  return true;
}

/** Période dépassée sans nouvelles de Stripe : il faut relire l'abonnement chez Stripe. */
export function subscriptionNeedsRefresh(sub: SubscriptionRow | null, now: Date = new Date()): boolean {
  if (!sub || (sub.plan !== ACCESS_PLAN_KEY && !isLegacyPlanKey(sub.plan))) return false;
  if (!sub.current_period_end) return false;
  return (sub.status === "active" || sub.status === "trialing") && new Date(sub.current_period_end) <= now;
}

/** Le kiné peut-il prélever ses 6 € ce mois-ci ? Seulement hors essai, abonnement d'accès actif. */
export function kineFollowUpChargeable(sub: SubscriptionRow | null, now: Date = new Date()): boolean {
  return !!sub && sub.plan === ACCESS_PLAN_KEY && sub.status === "active" && subscriptionGivesAccess(sub, now);
}

/**
 * Le patient doit-il souscrire avant d'entrer dans l'appli ?
 * Toujours, sauf si son kiné n'a pas encore activé ses paiements (rien ne peut
 * être encaissé pour lui), s'il est suspendu, si l'accès est offert au patient
 * par l'administrateur (comptes de test), ou si l'abonnement en cours donne accès.
 */
export function patientMustSubscribe(p: {
  kineCanCharge: boolean;
  kineSuspended: boolean;
  freeAccessUntil: string | null;
  subscription: SubscriptionRow | null;
  now?: Date;
}): boolean {
  const now = p.now ?? new Date();
  if (!p.kineCanCharge || p.kineSuspended) return false;
  if (p.freeAccessUntil && new Date(p.freeAccessUntil) > now) return false;
  return !subscriptionGivesAccess(p.subscription, now);
}
