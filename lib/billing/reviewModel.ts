// =============================================================================
// Modèle économique (Philippe, 2026-11-01, sur le modèle d'Andrew) — chiffres
// affichés sur le site (page d'accueil, /praticiens, FAQ) et utilisés par la
// facturation réelle. Source unique : ne jamais réécrire ces montants en dur.
//
// Deux flux d'argent séparés :
//   1. Le kiné paie EasyPhysio un abonnement FIXE, d'avance, patients
//      illimités (lib/billing/platformInvoice.ts) : 1, 3, 6 ou 12 mois, moins
//      cher par mois plus la durée est longue ; en cabinet, chaque kiné en plus
//      coûte moins cher (KINE_PLANS, CABINET_SHARES). Premier mois offert sur
//      la formule mensuelle seulement ; offre fondateur sur 12 mois jusqu'au
//      31/12/2026 (FOUNDER_OFFER).
//   2. Le patient paie son kiné un programme mensuel « hors nomenclature », au
//      tarif que le kiné fixe librement (0 € = accès gratuit). EasyPhysio ne
//      prend rien. La carte n'est prélevée que le mois où le kiné ajuste
//      réellement le programme (honoraires seulement pour un acte réalisé,
//      lib/billing/autoReview.ts). Le patient accepte le tarif par écrit avant.
// =============================================================================

import { INTL_TAGS, type Locale } from "../../i18n/locales.ts";

/**
 * Abonnement du kiné à EasyPhysio, TVA comprise, payé d'avance pour toute la
 * durée (Philippe, 2026-11-01, grille validée puis rendue plus rentable).
 */
export const KINE_PLANS = [
  { months: 1, ttcCents: 3999 },
  { months: 3, ttcCents: 9999 },
  { months: 6, ttcCents: 18999 },
  { months: 12, ttcCents: 34999 },
] as const;
export type PlanMonths = (typeof KINE_PLANS)[number]["months"];

/** Le prix d'un mois seul, TVA comprise (prix de référence affiché). */
export const KINE_SUBSCRIPTION_TTC_CENTS = KINE_PLANS[0].ttcCents;

/**
 * Cabinet (plusieurs kinés, un seul payeur) : part du prix payée pour chaque
 * kiné, dans l'ordre — le 1er plein tarif, le 2e −15 %, à partir du 3e −25 %
 * (Philippe, 2026-11-01). La remise s'ajoute à celle de la durée.
 */
export const CABINET_SHARES = [1, 0.85, 0.75] as const;

/**
 * Offre fondateur (Philippe, 2026-11-01 : faire rentrer de l'argent tôt) :
 * 12 mois à 299,99 € au lieu de 349,99 €, pour un abonnement qui commence au
 * plus tard le 31/12/2026. Pour la retirer : supprimer cette constante (ou
 * passer la date).
 */
export const FOUNDER_OFFER = { months: 12, ttcCents: 29999, until: "2026-12-31" } as const;

/** L'offre fondateur s'applique-t-elle à un abonnement qui commence ce jour-là (« AAAA-MM-JJ ») ? */
export function founderOfferActive(day: string): boolean {
  return day <= FOUNDER_OFFER.until;
}

/** « 31/12/2026 ». */
export const FOUNDER_OFFER_UNTIL_LABEL = FOUNDER_OFFER.until.split("-").reverse().join("/");

/** Nombre maximum de kinés dans un cabinet (garde-fou). */
export const CABINET_MAX_KINES = 20;

/** TVA française sur l'abonnement EasyPhysio (le kiné ne la récupère pas). */
export const VAT_RATE = 0.2;


/** Tarif conseillé pour le programme mensuel — le kiné fixe librement le sien. */
export const RECOMMENDED_REVIEW_PRICE_CENTS = 2000;

/** 0 € = suivi gratuit : le patient entre dans l'appli sans payer (Philippe, 2026-11-01). */
export const FREE_REVIEW_PRICE_CENTS = 0;

/** Bornes d'un tarif payant (évite les fautes de frappe) ; 0 € reste permis. */
export const REVIEW_PRICE_MIN_CENTS = 100;
export const REVIEW_PRICE_MAX_CENTS = 50000;

/** Le premier mois est offert au kiné. */
export const FREE_FIRST_MONTH = true;

// Frais Stripe estimés pour une carte européenne (1,5 % + 0,25 € par paiement),
// présentés comme une estimation partout où ils sont affichés.
export const STRIPE_FEE_RATE = 0.015;
export const STRIPE_FEE_FIXED_CENTS = 25;

/** Frais Stripe estimés pour UN paiement de ce montant, en centimes. */
export function estimateStripeFeeCents(priceCents: number): number {
  if (priceCents <= 0) return 0;
  return Math.round(priceCents * STRIPE_FEE_RATE + STRIPE_FEE_FIXED_CENTS);
}

// Le nom reste « eurosFR » (nombreux appels) ; `locale` choisit le format
// des décimales (fr : « 20,00 », en : « 20.00 »). Le montant reste en euros.
export const eurosFR = (cents: number, decimals = 2, locale: Locale = "fr") =>
  (cents / 100).toLocaleString(INTL_TAGS[locale], { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

// -----------------------------------------------------------------------------
// Règles de calcul (pures, testées dans reviewModel.test.ts)
// -----------------------------------------------------------------------------

/** Le tarif choisi par le kiné, ou le tarif conseillé s'il n'a rien fixé. */
export function effectiveReviewPrice(kinePriceCents: number | null | undefined): number {
  return isValidReviewPrice(kinePriceCents) ? (kinePriceCents as number) : RECOMMENDED_REVIEW_PRICE_CENTS;
}

export function isValidReviewPrice(cents: unknown): boolean {
  return (
    typeof cents === "number" &&
    Number.isInteger(cents) &&
    (cents === FREE_REVIEW_PRICE_CENTS || (cents >= REVIEW_PRICE_MIN_CENTS && cents <= REVIEW_PRICE_MAX_CENTS))
  );
}

/**
 * Accès patient selon le tarif du kiné (Philippe, 2026-11-01) : à 0 €, le
 * patient entre directement dans l'appli ; au-dessus, il accepte le suivi
 * (tarif par écrit + carte enregistrée) avant d'y accéder. Pas d'écran de
 * paiement tant que le kiné n'a pas activé ses paiements Stripe : le patient
 * ne pourrait pas payer et resterait bloqué.
 */
export function patientMustAcceptFollowUp(input: {
  kinePriceCents: number | null | undefined;
  kineCanCharge: boolean;
  followUpStatus: string | null | undefined;
}): boolean {
  if (!input.kineCanCharge) return false;
  if (effectiveReviewPrice(input.kinePriceCents) === FREE_REVIEW_PRICE_CENTS) return false;
  return input.followUpStatus !== "active";
}

/** Le mois (heure de Paris) sous forme « AAAA-MM-01 » — la clé d'un bilan. */
export function periodOf(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit" }).formatToParts(date);
  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  return `${y}-${m}-01`;
}

/** Le premier jour du mois suivant, « AAAA-MM-01 ». */
export function nextPeriod(period: string): string {
  const [y, m] = period.split("-").map(Number);
  return m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;
}

/** Le mois précédent, « AAAA-MM-01 ». */
export function previousPeriod(period: string): string {
  const [y, m] = period.split("-").map(Number);
  return m === 1 ? `${y - 1}-12-01` : `${y}-${String(m - 1).padStart(2, "0")}-01`;
}

const MONTHS_FR = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

/** « octobre 2026 » (en : « October 2026 »). */
export function periodLabel(period: string, locale: Locale = "fr"): string {
  const [y, m] = period.split("-").map(Number);
  if (locale === "fr") return `${MONTHS_FR[m - 1]} ${y}`;
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString(INTL_TAGS[locale], { month: "long", year: "numeric", timeZone: "UTC" });
}

/** Numéro de note d'honoraires : « 2026-0007 » (suite par kiné et par année). */
export function feeNoteNumber(year: number, seq: number): string {
  return `${year}-${String(seq).padStart(4, "0")}`;
}

export function isPlanMonths(value: unknown): value is PlanMonths {
  return KINE_PLANS.some((p) => p.months === value);
}

/** La durée choisie, ou 1 mois si elle est inconnue. */
export function planMonthsOf(value: unknown): PlanMonths {
  return isPlanMonths(value) ? value : 1;
}

/** Somme des parts payées pour `kines` kinés (1 kiné = 1 ; 3 kinés = 2). */
export function cabinetFactor(kines: number): number {
  const n = Math.max(1, Math.min(CABINET_MAX_KINES, Math.floor(kines)));
  let total = 0;
  for (let i = 0; i < n; i++) total += CABINET_SHARES[Math.min(i, CABINET_SHARES.length - 1)];
  return total;
}

/**
 * Prix d'un abonnement, TVA comprise : durée × nombre de kinés. Renvoie aussi
 * le prix par kiné et par mois, et l'économie par rapport à 1 mois × 1 kiné
 * payé chaque mois.
 */
export function subscriptionPrice(months: PlanMonths, kines = 1, day: string = new Date().toISOString().slice(0, 10)) {
  const plan = KINE_PLANS.find((p) => p.months === months) ?? KINE_PLANS[0];
  const n = Math.max(1, Math.min(CABINET_MAX_KINES, Math.floor(kines)));
  const founder = plan.months === FOUNDER_OFFER.months && founderOfferActive(day);
  const baseCents = founder ? FOUNDER_OFFER.ttcCents : plan.ttcCents;
  const ttcCents = Math.round(baseCents * cabinetFactor(n));
  const fullCents = KINE_SUBSCRIPTION_TTC_CENTS * plan.months * n;
  return {
    months: plan.months,
    kines: n,
    ttcCents,
    perKinePerMonthCents: Math.round(ttcCents / (plan.months * n)),
    savingCents: Math.max(0, fullCents - ttcCents),
    /** Prix sans l'offre fondateur (pour l'afficher barré), sinon null. */
    regularTtcCents: founder ? Math.round(plan.ttcCents * cabinetFactor(n)) : null,
    founder,
  };
}

/**
 * Ce que le kiné (ou le payeur d'un cabinet) règle pour une période, hors TVA
 * et TVA comprise. Sur la formule mensuelle seulement, son tout premier mois
 * est offert (FREE_FIRST_MONTH) ; les formules prépayées sont déjà remisées.
 * `day` : premier jour de la période (pour l'offre fondateur).
 */
export function platformFeeForPeriod(input: { months: PlanMonths; kines: number; isFirstBilledMonth: boolean; day?: string }) {
  const free = FREE_FIRST_MONTH && input.isFirstBilledMonth && input.months === 1;
  if (free) return { free: true, months: 1 as PlanMonths, kines: Math.max(1, input.kines), htCents: 0, vatCents: 0, ttcCents: 0 };
  const price = subscriptionPrice(input.months, input.kines, input.day);
  const htCents = Math.round(price.ttcCents / (1 + VAT_RATE));
  return { free: false, months: price.months, kines: price.kines, htCents, vatCents: price.ttcCents - htCents, ttcCents: price.ttcCents };
}

/** Le dernier jour (« AAAA-MM-JJ ») d'une période de `months` mois commençant le 1er `period`. */
export function periodLastDay(period: string, months: number): string {
  const [y, m] = period.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + months, 0)).toISOString().slice(0, 10);
}

/** Le mois `period` est-il couvert par une facture allant de `start` à `end` (dates incluses) ? */
export function periodCovered(period: string, start: string, end: string): boolean {
  return start <= period && period <= end;
}

/** Échappe une valeur pour un fichier CSV (séparateur « ; », Excel français). */
export function csvCell(value: string | number | null | undefined): string {
  const s = value == null ? "" : String(value);
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
