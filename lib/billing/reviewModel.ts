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
