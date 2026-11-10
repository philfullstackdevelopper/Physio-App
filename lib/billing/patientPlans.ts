// =============================================================================
// MODÈLE DÉFINITIF (Philippe, 2026-11-04) — source unique des montants.
//
// Le patient paie chaque mois DEUX services distincts, vendus par deux
// vendeurs distincts, prélevés en deux paiements distincts sur la même carte :
//
//   1. ACCÈS À LA PLATEFORME — vendu par EasyPhysio, abonnement mensuel sur le
//      compte d'EasyPhysio (sans TVA, facture EasyPhysio). Dû CHAQUE
//      mois d'accès, que le kiné agisse ou non : c'est le prix de l'appli,
//      jamais une part de l'acte du kiné. Trois offres (Philippe, 2026-11-04) :
//      sans engagement 6,99 €, engagement 3 mois 3,99 €, engagement 6 mois
//      2,99 € par mois. L'engagement ne porte QUE sur cet abonnement ; à sa fin,
//      il continue au même prix, mois par mois, résiliable à tout moment.
//      10 jours d'essai gratuit à la première souscription.
//
//   2. PROGRAMME DU KINÉ — 6,00 € / mois, vendu par le kiné, identique dans les
//      trois offres, jamais remisé ni payé d'avance. Paiement direct sur le
//      compte Stripe du kiné, 0 % pour EasyPhysio, note d'honoraires à son nom,
//      seulement les mois où il met à jour le programme (après l'essai).
//
// Pourquoi deux paiements (audit juridique du 2026-11-04, reports/Frais
// plateforme patient kiné légalité.md) : EasyPhysio ne prend JAMAIS d'argent
// sur le paiement du kiné (pas d'« application fee »), sinon sa part serait
// une part des honoraires du kiné (art. L.4113-5 / R.4321-72 CSP).
//
// Rien de ce fichier ne lit la base ni Stripe : affichage, prélèvements et
// contrôles lisent les mêmes chiffres. Ne jamais réécrire ces montants ailleurs.
// =============================================================================

import { INTL_TAGS, type Locale } from "../../i18n/locales.ts";

/** Programme du kiné, centimes, par mois où il met à jour le programme (honoraires). */
export const KINE_FOLLOW_UP_CENTS = 600;
/** Essai gratuit à la première souscription (aucun prélèvement pendant ces jours-là). */
export const TRIAL_DAYS = 10;
/**
 * Pas de TVA sur l'accès à la plateforme (Philippe, 2026-11-08) : EasyPhysio est
 * une micro-entreprise en franchise en base de TVA. La facture porte cette
 * mention à la place. Si l'entreprise devient redevable de la TVA (dépassement
 * du seuil, passage en société), il faudra la réintroduire ici et au paiement.
 */
export const PLATFORM_INVOICE_FOOTER = "TVA non applicable, art. 293 B du CGI.";

export type PlatformOfferKey = "plan_1m" | "plan_3m" | "plan_6m";

export interface PlatformOffer {
  key: PlatformOfferKey;
  /** Durée d'engagement de l'abonnement d'accès, en mois (0 = sans engagement). */
  commitmentMonths: 0 | 3 | 6;
  label: string;
  /** Accès à la plateforme, prix payé par le patient, centimes, par mois. */
  platformCents: number;
}

/**
 * Les trois offres d'accès. Les noms plan_1m / plan_3m / plan_6m sont déjà
 * autorisés par la base (migration 0080) : aucun changement de base. Une
 * formule de ces noms qui vit sur le compte d'un KINÉ est l'ancien modèle du
 * 2026-11-02 (voir isLegacySubscription).
 */
export const PLATFORM_OFFERS: readonly PlatformOffer[] = [
  { key: "plan_1m", commitmentMonths: 0, label: "Sans engagement", platformCents: 699 },
  { key: "plan_3m", commitmentMonths: 3, label: "Engagement 3 mois", platformCents: 399 },
  { key: "plan_6m", commitmentMonths: 6, label: "Engagement 6 mois", platformCents: 299 },
];

/** Offre mise en avant (« Le plus avantageux ») et offre proposée par défaut. */
export const BEST_OFFER_KEY: PlatformOfferKey = "plan_6m";
export const DEFAULT_OFFER_KEY: PlatformOfferKey = "plan_3m";

/** Abonnement d'accès à 3,99 € sans engagement vendu le 2026-11-04 (commit d16f1b8) : toujours reconnu. */
export const EARLY_ACCESS_PLAN_KEY = "patient_monthly";

export function isPlatformOfferKey(v: unknown): v is PlatformOfferKey {
  return typeof v === "string" && PLATFORM_OFFERS.some((o) => o.key === v);
}

export function platformOffer(key: PlatformOfferKey): PlatformOffer {
  return PLATFORM_OFFERS.find((o) => o.key === key)!;
}

/** Prix mensuel de l'offre pour le patient (accès + programme du kiné). */
export function monthlyTotalCents(offer: PlatformOffer): number {
  return offer.platformCents + KINE_FOLLOW_UP_CENTS;
}

/** Économie par rapport à l'offre sans engagement, en % arrondi (0 pour elle-même). */
export function savingsPercent(offer: PlatformOffer): number {
  const base = Math.max(...PLATFORM_OFFERS.map(monthlyTotalCents));
  return Math.round((1 - monthlyTotalCents(offer) / base) * 100);
}

/** Frais Stripe estimés d'un paiement par carte européenne (1,5 % + 0,25 €). */
export function stripeFeeCents(amountCents: number): number {
  return Math.round(amountCents * 0.015 + 25);
}

/** Ce que garde EasyPhysio par patient et par mois, après frais de carte (estimation, sans TVA). */
export function platformNetCents(offer: PlatformOffer): number {
  return offer.platformCents - stripeFeeCents(offer.platformCents);
}

/** Ce que touche le kiné par patient et par mois de mise à jour, après frais de carte (estimation). */
export const KINE_NET_CENTS = KINE_FOLLOW_UP_CENTS - stripeFeeCents(KINE_FOLLOW_UP_CENTS);

/** Plus bas et plus haut total mensuel (textes « de … à … »). */
export const LOWEST_MONTHLY_TOTAL_CENTS = Math.min(...PLATFORM_OFFERS.map(monthlyTotalCents));
export const HIGHEST_MONTHLY_TOTAL_CENTS = Math.max(...PLATFORM_OFFERS.map(monthlyTotalCents));
export const LOWEST_PLATFORM_CENTS = Math.min(...PLATFORM_OFFERS.map((o) => o.platformCents));
export const HIGHEST_PLATFORM_CENTS = Math.max(...PLATFORM_OFFERS.map((o) => o.platformCents));

/** « 12,99 € sans engagement, 9,99 € avec un engagement de 3 mois ou 8,99 € avec 6 mois » (textes du site). */
export function offersSummaryFR(): string {
  const parts = PLATFORM_OFFERS.map((o, i) => {
    const total = `${eurosFR(monthlyTotalCents(o))} €`;
    if (!o.commitmentMonths) return `${total} sans engagement`;
    return i === 1 ? `${total} avec un engagement de ${o.commitmentMonths} mois` : `${total} avec ${o.commitmentMonths} mois`;
  });
  return `${parts.slice(0, -1).join(", ")} ou ${parts[parts.length - 1]}`;
}

/** Fin d'engagement d'un abonnement qui démarre après l'essai (ISO), ou null sans engagement. */
export function commitmentEnd(offer: PlatformOffer, paidStart: Date): string | null {
  if (!offer.commitmentMonths) return null;
  const d = new Date(paidStart);
  d.setMonth(d.getMonth() + offer.commitmentMonths);
  return d.toISOString();
}

/**
 * Fin d'engagement calculée sur l'abonnement RÉEL chez Stripe (audit du
 * 2026-11-08) : l'engagement court à partir du premier mois payé, c'est-à-dire
 * la fin de l'essai s'il y en a eu un, sinon le début de l'abonnement. Plus
 * juste que la date estimée à l'ouverture du paiement (metadata commit_until),
 * qui reste la solution de secours.
 */
export function commitmentEndOfSubscription(sub: {
  plan: string | null | undefined;
  trial_end?: number | null;
  start_date?: number | null;
  commit_until?: string | null;
}): string | null {
  if (!isPlatformOfferKey(sub.plan)) return null;
  const startUnix = sub.trial_end ?? sub.start_date ?? null;
  if (startUnix) return commitmentEnd(platformOffer(sub.plan), new Date(startUnix * 1000));
  return sub.commit_until ?? null;
}

/** « 12,99 » (en : « 12.99 ») ; le nom reste « eurosFR », le montant reste en euros. */
export function eurosFR(cents: number, locale: Locale = "fr"): string {
  return (cents / 100).toLocaleString(INTL_TAGS[locale], { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ---------------------------------------------------------------------------
// Accès à l'appli
// ---------------------------------------------------------------------------

export type SubscriptionRow = {
  plan: string;
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean | null;
  /** Compte Stripe du kiné pour l'ancien modèle ; vide = compte d'EasyPhysio. */
  stripe_account_id?: string | null;
};

/** Abonnement d'accès du modèle actuel (compte d'EasyPhysio). */
export function isPlatformSubscription(sub: SubscriptionRow | null): boolean {
  if (!sub || sub.stripe_account_id) return false;
  return isPlatformOfferKey(sub.plan) || sub.plan === EARLY_ACCESS_PLAN_KEY;
}

/** Formule de l'ancien modèle (2026-11-02), sur le compte du kiné : plus vendue. */
export function isLegacySubscription(sub: SubscriptionRow | null): boolean {
  return !!sub && !!sub.stripe_account_id && isPlatformOfferKey(sub.plan);
}

/**
 * L'abonnement donne-t-il accès à l'appli maintenant ?
 * - actif ou en essai : oui, même résilié, jusqu'à la fin de la période ;
 * - paiement refusé (past_due, unpaid, incomplete) : non, tout de suite
 *   (règle de Philippe : une carte refusée verrouille immédiatement) ;
 * - terminé (canceled…) : non.
 * Une formule de l'ancien modèle reste valable jusqu'à la fin de sa période
 * payée (elle ne se renouvelle plus).
 */
export function subscriptionGivesAccess(sub: SubscriptionRow | null, now: Date = new Date()): boolean {
  const legacy = isLegacySubscription(sub);
  if (!sub || (!isPlatformSubscription(sub) && !legacy)) return false;
  if (sub.status !== "active" && sub.status !== "trialing") return false;
  const ended = !!sub.current_period_end && new Date(sub.current_period_end) <= now;
  if (ended && (sub.cancel_at_period_end || legacy)) return false;
  return true;
}

/** Période dépassée sans nouvelles de Stripe : il faut relire l'abonnement chez Stripe. */
export function subscriptionNeedsRefresh(sub: SubscriptionRow | null, now: Date = new Date()): boolean {
  if (!sub || (!isPlatformSubscription(sub) && !isLegacySubscription(sub))) return false;
  if (!sub.current_period_end) return false;
  return (sub.status === "active" || sub.status === "trialing") && new Date(sub.current_period_end) <= now;
}

/**
 * Le kiné peut-il prélever ses 6 € ce mois-ci ? Seulement hors essai, avec un
 * abonnement d'accès actif ET non résilié : « résilier arrête les deux
 * paiements » (audit du 2026-11-10, M6). Un abonnement résilié qui court
 * jusqu'à la fin du mois ou de l'engagement (cancel_at_period_end, qui couvre
 * aussi cancel_at) donne encore accès à l'appli, mais plus aucun prélèvement
 * du kiné.
 */
export function kineFollowUpChargeable(sub: SubscriptionRow | null, now: Date = new Date()): boolean {
  return isPlatformSubscription(sub) && sub!.status === "active" && !sub!.cancel_at_period_end && subscriptionGivesAccess(sub, now);
}

// ---------------------------------------------------------------------------
// Règles de l'audit du 2026-11-10 (pures, testées dans patientPlans.test.ts)
// ---------------------------------------------------------------------------

/**
 * Version du texte que le patient accepte en cochant la case du paywall (CGU +
 * les deux montants). Enregistrée avec son accord (migration 0089). À changer
 * à chaque modification des CGU ou du texte de la case.
 */
export const BILLING_TERMS_VERSION = "2026-11-08";

/**
 * Essai gratuit : seulement à la toute première souscription — pas de ligne
 * d'abonnement, et l'e-mail n'a jamais eu d'essai (même après suppression puis
 * recréation du compte : empreinte gardée côté serveur, migration 0089).
 */
export function trialGranted(p: { hasSubscriptionRow: boolean; trialAlreadyUsed: boolean }): boolean {
  return !p.hasSubscriptionRow && !p.trialAlreadyUsed;
}

/**
 * Comment résilier chez Stripe.
 * - Pendant l'essai gratuit : fin à la fin de l'essai, AUCUN prélèvement, même
 *   pour une offre avec engagement (l'engagement ne court qu'à partir du
 *   premier mois payé).
 * - Pendant un engagement (après l'essai) : fin à la fin de l'engagement.
 * - Sinon : fin de la période en cours.
 * NB : le droit de rétractation de 14 jours annoncé dans les CGU n'est PAS
 * codé ici (ni la sortie d'engagement par suppression du compte) : règle à
 * décider avec un juriste avant d'y toucher.
 */
export function cancellationMode(p: { status: string; commitUntil: string | null; now?: Date }): { kind: "period_end" } | { kind: "at"; at: string } {
  const now = p.now ?? new Date();
  if (p.status === "trialing") return { kind: "period_end" };
  if (p.commitUntil && new Date(p.commitUntil) > now) return { kind: "at", at: p.commitUntil };
  return { kind: "period_end" };
}

/**
 * Dernier instant où une formule de l'ancien modèle (sur le compte du kiné) a
 * pu être vendue : fin du 4 novembre 2026, heure de Paris. Une formule créée
 * après ne vient pas d'EasyPhysio (ou rejoue une ancienne signature) : refusée.
 */
export const LEGACY_MODEL_LAST_SALE = "2026-11-04T23:00:00Z";

export function legacySubscriptionAccepted(createdUnix: number | null | undefined): boolean {
  if (!createdUnix) return false;
  return createdUnix * 1000 <= new Date(LEGACY_MODEL_LAST_SALE).getTime();
}

/** États d'un abonnement Stripe encore « ouvert » (il prélève ou peut encore prélever). */
export const OPEN_SUBSCRIPTION_STATUSES: readonly string[] = ["active", "trialing", "past_due", "unpaid", "incomplete"];

/**
 * Abonnements d'accès en double (audit M5) : parmi les abonnements du même
 * patient chez Stripe, on GARDE le plus récent de ceux qui donnent accès
 * (actif ou en essai) et on renvoie les autres, à arrêter — sinon l'ancien
 * continuerait d'être prélevé sans que le site le voie. La règle ne dépend
 * que de Stripe : deux messages traités en même temps choisissent le même
 * abonnement à garder. Sans aucun abonnement actif ou en essai, rien n'est
 * arrêté ici (un paiement refusé est traité à la nouvelle souscription) ; un
 * abonnement « incomplete » (premier paiement en cours) n'est jamais arrêté ici.
 */
export function duplicateSubscriptionIds(subs: readonly { id: string; status: string; created: number }[]): string[] {
  const keep = subs
    .filter((s) => s.status === "active" || s.status === "trialing")
    .sort((a, b) => b.created - a.created || (a.id < b.id ? 1 : -1))[0];
  if (!keep) return [];
  return subs.filter((s) => s.id !== keep.id && ["active", "trialing", "past_due", "unpaid"].includes(s.status)).map((s) => s.id);
}

/**
 * Accord du patient pour les honoraires de son kiné (migration 0089,
 * internal.kine_fees_acceptance) : 'other' = son accord nomme un AUTRE kiné →
 * ni copie de carte ni prélèvement tant qu'il n'a pas redonné son accord.
 * 'none' = abonné avant l'enregistrement des accords : toléré, comme avant.
 */
export function kineFeesAccepted(state: "yes" | "other" | "none"): boolean {
  return state !== "other";
}

/**
 * Le patient doit-il souscrire avant d'entrer dans l'appli ?
 * Toujours (Philippe, 2026-11-04 : « tant que cela n'a pas été débloqué, le
 * patient ne peut pas accéder au reste »), sauf si son kiné est suspendu, si
 * l'accès est offert au patient par l'administrateur (comptes de test), ou si
 * l'abonnement en cours donne accès. Un kiné qui n'a pas encore activé Stripe
 * ne dispense plus du paywall : l'accès EasyPhysio est payé à EasyPhysio, et
 * la carte est copiée chez le kiné plus tard, dès que ses paiements sont actifs
 * (lib/billing/autoReview.ts).
 */
export function patientMustSubscribe(p: {
  kineSuspended: boolean;
  freeAccessUntil: string | null;
  subscription: SubscriptionRow | null;
  now?: Date;
}): boolean {
  const now = p.now ?? new Date();
  if (p.kineSuspended) return false;
  if (p.freeAccessUntil && new Date(p.freeAccessUntil) > now) return false;
  return !subscriptionGivesAccess(p.subscription, now);
}
