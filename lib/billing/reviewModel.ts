// =============================================================================
// Nouveau modèle économique (Philippe, 2026-10-24) — chiffres affichés sur le
// site (page d'accueil, /praticiens, FAQ). Source unique : ne jamais réécrire
// ces montants en dur dans une page.
//
// Deux flux d'argent complètement séparés :
//   1. Le kiné paie EasyPhysio : un forfait fixe par patient actif et par mois,
//      une seule facture en fin de mois. Ce prix ne dépend JAMAIS du tarif que
//      le kiné pratique ni du fait que le patient le paie (sinon il redevient
//      une commission, interdite par l'art. R.4321-72 CSP).
//   2. Le patient paie son kiné : un tarif fixé par le kiné pour chaque bilan
//      de suivi mensuel réellement fait (art. R.4321-98 : honoraires seulement
//      pour des actes réellement effectués). EasyPhysio n'en prend rien.
//
// ATTENTION : la facturation réelle de l'appli (lib/billing/platformFee.ts,
// app/patient/abonnement) applique encore l'ancien modèle (abonnements patient
// + 15 %). Ce fichier ne sert qu'à l'affichage tant qu'elle n'est pas refaite.
// Modèle à faire valider par un avocat en droit de la santé avant le lancement.
// =============================================================================

/** Ce que paie le kiné à EasyPhysio, par patient actif et par mois, hors TVA. */
export const KINE_FEE_PER_ACTIVE_PATIENT_CENTS = 300;

/** TVA française sur l'abonnement EasyPhysio (le kiné ne la récupère pas). */
export const VAT_RATE = 0.2;

/** Le même forfait, TVA comprise : ce que le kiné paie vraiment. */
export const KINE_FEE_PER_ACTIVE_PATIENT_TTC_CENTS = Math.round(KINE_FEE_PER_ACTIVE_PATIENT_CENTS * (1 + VAT_RATE));

/** Tarif conseillé pour un bilan de suivi mensuel — le kiné fixe le sien. */
export const RECOMMENDED_REVIEW_PRICE_CENTS = 2000;

/** Bornes du tarif qu'un kiné peut fixer (évite les fautes de frappe). */
export const REVIEW_PRICE_MIN_CENTS = 1000;
export const REVIEW_PRICE_MAX_CENTS = 4000;

/**
 * 3e flux (Philippe, 2026-10-24) : n'importe quel patient peut aussi payer
 * EasyPhysio directement pour l'accès seul à l'appli, sans suivi par un kiné.
 * 5 € par mois (Philippe, 2026-10-24). Fonctions « bien-être » uniquement : bibliothèque,
 * séances qu'il compose lui-même, planning, historique, poursuite du programme
 * laissé par son kiné. JAMAIS de programme construit d'après une pathologie
 * déclarée : ce serait très probablement un dispositif médical (règlement UE
 * 2017/745, règle 11), avec marquage CE.
 */
export const PATIENT_APP_ONLY_MONTHLY_CENTS = 500;

/** Le premier mois est offert au kiné. */
export const FREE_FIRST_MONTH = true;

export const eurosFR = (cents: number, decimals = 2) =>
  (cents / 100).toLocaleString("fr-FR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

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
    cents >= REVIEW_PRICE_MIN_CENTS &&
    cents <= REVIEW_PRICE_MAX_CENTS
  );
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

/** « octobre 2026 ». */
export function periodLabel(period: string): string {
  const [y, m] = period.split("-").map(Number);
  return `${MONTHS_FR[m - 1]} ${y}`;
}

/** Numéro de note d'honoraires : « 2026-0007 » (suite par kiné et par année). */
export function feeNoteNumber(year: number, seq: number): string {
  return `${year}-${String(seq).padStart(4, "0")}`;
}

/**
 * Patient actif sur un mois : il a accepté l'invitation (CGU) et, dans le
 * mois, a fait au moins une séance, noté un ressenti, ou reçu un bilan validé.
 * Même règle que internal.admin_month_active_patients (migration 0071).
 */
export function isActivePatient(input: {
  termsAccepted: boolean;
  sessionsThisMonth: number;
  feedbackThisMonth: number;
  reviewThisMonth: boolean;
}): boolean {
  if (!input.termsAccepted) return false;
  return input.sessionsThisMonth > 0 || input.feedbackThisMonth > 0 || input.reviewThisMonth;
}

/**
 * Facture EasyPhysio d'un mois, hors TVA et TVA comprise. Le premier mois
 * facturable d'un kiné est offert (FREE_FIRST_MONTH).
 */
export function platformFeeForMonth(activePatients: number, isFirstBilledMonth: boolean) {
  const free = FREE_FIRST_MONTH && isFirstBilledMonth;
  const htCents = free ? 0 : Math.max(0, activePatients) * KINE_FEE_PER_ACTIVE_PATIENT_CENTS;
  const vatCents = Math.round(htCents * VAT_RATE);
  return { free, htCents, vatCents, ttcCents: htCents + vatCents };
}

/** Échappe une valeur pour un fichier CSV (séparateur « ; », Excel français). */
export function csvCell(value: string | number | null | undefined): string {
  const s = value == null ? "" : String(value);
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
