// =============================================================================
// Programme mensuel du kiné et notes d'honoraires — règles pures (périodes,
// numéros de note, frais Stripe estimés, CSV).
//
// Les MONTANTS du modèle actuel (accès plateforme payé par le patient à
// EasyPhysio + 6 € au kiné) vivent dans lib/billing/patientPlans.ts. L'ancien
// abonnement payé par les kinés (grille par durée, cabinets, offre fondateur)
// a été retiré de ce fichier le 2026-11-08 (audit Stripe) : le kiné utilise
// EasyPhysio gratuitement depuis le 2026-11-02.
// =============================================================================

import { INTL_TAGS, type Locale } from "../../i18n/locales.ts";

/** Tarif conseillé pour le programme mensuel — le kiné fixe librement le sien. */
export const RECOMMENDED_REVIEW_PRICE_CENTS = 2000;

/** 0 € = suivi gratuit : le patient entre dans l'appli sans payer (Philippe, 2026-11-01). */
export const FREE_REVIEW_PRICE_CENTS = 0;

/** Bornes d'un tarif payant (évite les fautes de frappe) ; 0 € reste permis. */
export const REVIEW_PRICE_MIN_CENTS = 100;
export const REVIEW_PRICE_MAX_CENTS = 50000;

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

/** Le dernier jour (« AAAA-MM-JJ ») d'une période de `months` mois commençant le 1er `period`. */
export function periodLastDay(period: string, months: number): string {
  const [y, m] = period.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + months, 0)).toISOString().slice(0, 10);
}

/** Échappe une valeur pour un fichier CSV (séparateur « ; », Excel français). */
export function csvCell(value: string | number | null | undefined): string {
  const s = value == null ? "" : String(value);
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
