// Numéro professionnel demandé à l'inscription, selon le pays du kiné
// (2026-11-18). Sans dépendance : lu par le formulaire (navigateur) et par le
// serveur (app/signup/finalize, app/signup/onboarding).
//
//  - France : RPPS (ou ADELI), FACULTATIF comme avant, vérifié ensuite par
//    l'Annuaire Santé (lib/instructor/rppsVerification.ts) — inchangé.
//  - Autres pays : numéro OBLIGATOIRE. Quand une règle publique de format
//    existe (chiffre de contrôle, préfixe), on la vérifie ici ; le compte est
//    alors validé comme en France. Sans règle publique, le numéro est gardé
//    tel quel et le compte attend la validation de Philippe dans /admin.
// Règles et sources : docs/international-billing.md. Un format correct ne
// prouve PAS que la personne est ce kiné : Philippe peut vérifier le numéro
// dans le registre public (lien `lookupUrl`).

export type ProfessionalIdRule = {
  country: string;
  /** Clé des textes (messages/<langue>/auth.json → cabinet.proId.<key>). */
  key: string;
  required: boolean;
  /** Vérification de format : true = règle publique appliquée ; absent = pas de règle, revue manuelle. */
  validate?: (normalized: string) => boolean;
  /** Registre public où vérifier le numéro (affiché dans /admin). */
  lookupUrl?: string;
  /** Validation par l'admin même quand le format est bon (ex. Suisse : NAREG + autorisation cantonale). */
  adminReview?: boolean;
};

/** Espaces, tirets, points et barres retirés ; lettres en majuscules. */
export function normalizeProfessionalId(raw: string): string {
  return String(raw ?? "")
    .replace(/[\s.\-/]+/g, "")
    .toUpperCase()
    .slice(0, 40);
}

/** Chiffre de contrôle GS1 (GLN, 13 chiffres) : poids 1 et 3 depuis la droite, hors dernier chiffre. */
export function gs1CheckDigitOk(digits: string): boolean {
  if (!/^\d+$/.test(digits) || digits.length < 2) return false;
  const body = digits.slice(0, -1);
  let sum = 0;
  for (let i = 0; i < body.length; i++) {
    const d = Number(body[body.length - 1 - i]);
    sum += i % 2 === 0 ? d * 3 : d;
  }
  return (10 - (sum % 10)) % 10 === Number(digits[digits.length - 1]);
}

export const PROFESSIONAL_ID_RULES: readonly ProfessionalIdRule[] = [
  { country: "FR", key: "FR", required: false, validate: (s) => /^\d{9,11}$/.test(s), lookupUrl: "https://annuaire.sante.fr/" },
  // GLN suisse : 13 chiffres commençant par 76, chiffre de contrôle GS1 ; registre NAREG / MedReg.
  { country: "CH", key: "CH", required: true, validate: (s) => /^76\d{11}$/.test(s) && gs1CheckDigitOk(s), lookupUrl: "https://www.nareg.ch/", adminReview: true },
  // INAMI belge : 11 chiffres ; algorithme du chiffre de contrôle non vérifié → pas de règle publique sûre → revue admin.
  { country: "BE", key: "BE", required: true, lookupUrl: "https://webappsa.riziv-inami.fgov.be/silverpages/" },
  { country: "GB", key: "GB", required: true, validate: (s) => /^PH\d{1,6}$/.test(s), lookupUrl: "https://www.hcpc-uk.org/check-the-register/" },
  // CORU (Irlande) : format « PT + chiffres » non confirmé publiquement → revue admin.
  { country: "IE", key: "IE", required: true, lookupUrl: "https://coru.ie/public-protection/check-the-register/" },
  // États-Unis : licence de l'État (pas de règle nationale) ; Canada : ordre provincial (OPPQ au Québec…) → revue admin.
  { country: "US", key: "US", required: true },
  { country: "CA", key: "CA", required: true },
  { country: "AU", key: "AU", required: true, validate: (s) => /^PHY\d{10}$/.test(s), lookupUrl: "https://www.ahpra.gov.au/Registration/Registers-of-Practitioners.aspx" },
];

/** Règle du pays ; un pays sans règle demande un numéro libre, revu par l'admin. */
export function professionalIdRule(country: string): ProfessionalIdRule {
  const code = (country || "FR").toUpperCase();
  return PROFESSIONAL_ID_RULES.find((r) => r.country === code) ?? { country: code, key: "other", required: true };
}

export type ProfessionalIdCheck =
  /** Vide et facultatif (France). */
  | { ok: true; value: null; formatChecked: false }
  /** Format vérifié par la règle publique du pays. */
  | { ok: true; value: string; formatChecked: true }
  /** Pas de règle publique : numéro gardé, validation manuelle. */
  | { ok: true; value: string; formatChecked: false }
  | { ok: false; reason: "required" | "format" };

export function checkProfessionalId(country: string, raw: string | null | undefined): ProfessionalIdCheck {
  const rule = professionalIdRule(country);
  const value = normalizeProfessionalId(raw ?? "");
  if (!value) return rule.required ? { ok: false, reason: "required" } : { ok: true, value: null, formatChecked: false };
  if (rule.validate) return rule.validate(value) ? { ok: true, value, formatChecked: true } : { ok: false, reason: "format" };
  if (value.length < 3) return { ok: false, reason: "format" };
  return { ok: true, value, formatChecked: false };
}

/**
 * Le compte peut-il être validé d'office ? France : oui (comme avant).
 * Ailleurs : seulement si le format est vérifié ET que le pays ne demande pas
 * une revue de l'admin. Sinon il attend la validation de Philippe dans /admin.
 */
export function professionalIdAutoApproves(country: string, raw: string | null | undefined): boolean {
  const code = (country || "FR").toUpperCase();
  if (code === "FR") return true;
  const check = checkProfessionalId(code, raw);
  return check.ok && check.formatChecked && !professionalIdRule(code).adminReview;
}
