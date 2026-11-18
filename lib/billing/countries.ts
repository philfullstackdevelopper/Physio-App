// =============================================================================
// PAYS D'EXERCICE DU KINÉ (2026-11-18) — source unique, sans dépendance, lisible
// par le serveur comme par les écrans d'inscription.
//
// Le pays est choisi par le kiné à l'inscription et ne change plus ensuite
// (migration 0101) : il décide
//   - du pays de son compte Stripe Connect (accounts.create { country }) ;
//   - de la monnaie des DEUX paiements de ses patients (accès EasyPhysio +
//     programme du kiné), montants dans lib/billing/patientPlans.ts
//     (COUNTRY_PRICES) ;
//   - du numéro professionnel demandé (lib/instructor/professionalId.ts) ;
//   - des mentions de la note d'honoraires et de TVA (messages/<langue>/
//     billing.json → feeNoteCountry.<CODE>).
//
// Un pays n'est OUVERT (`enabled: true`) que si :
//   1. Stripe Connect y est disponible pour un compte créé par une plateforme
//      française ;
//   2. le modèle « le patient paie à son kiné des honoraires hors assurance
//      maladie, EasyPhysio ne prend rien dessus » paraît légal ;
//   3. EasyPhysio n'y doit pas s'immatriculer à la TVA dès le premier euro.
// Recherche, sources et raisons pays par pays : docs/international-billing.md.
// Tout texte juridique ou de facturation hors France est un BROUILLON à faire
// relire (juriste local) : ouvrir un pays ne vaut pas validation juridique.
//
// La France reste exactement comme avant : RPPS facultatif, « hors
// nomenclature », art. R.4321-98 CSP, TVA art. 261-4-1° CGI.
// =============================================================================

export type CurrencyCode = "eur" | "chf" | "gbp" | "cad" | "usd" | "aud" | "nzd";

/** Pourquoi un pays est fermé (affiché dans /admin et la doc). */
/**
 * enabled             : ouvert, le modèle paraît légal (recherche du 2026-11-18).
 * enabled_conditions  : ouvert à la demande de Philippe (2026-11-18, « enable
 *                       canada, america, england ») MALGRÉ une condition
 *                       juridique ou fiscale à remplir avant de vrais patients
 *                       (voir `note` et docs/international-billing.md).
 */
export type CountryStatus = "enabled" | "enabled_conditions" | "needs_lawyer" | "blocked_tax" | "blocked_stripe" | "blocked_data";

export interface CountryConfig {
  /** Code ISO 3166-1 alpha-2 (aussi le `country` du compte Stripe Connect). */
  code: string;
  currency: CurrencyCode;
  status: CountryStatus;
  /** Ouvert à l'inscription et à la facturation. */
  enabled: boolean;
  /** Une phrase, en anglais : raison du statut (détail dans la doc). */
  note: string;
}

const c = (code: string, currency: CurrencyCode, status: CountryStatus, note: string): CountryConfig => ({
  code,
  currency,
  status,
  enabled: status === "enabled" || status === "enabled_conditions",
  note,
});

/**
 * Ordre = ordre d'affichage dans la liste de l'inscription (France d'abord,
 * puis les pays ouverts, puis les autres, grisés « bientôt »).
 */
export const COUNTRIES: readonly CountryConfig[] = [
  c("FR", "eur", "enabled", "Live model since 2026-11-04 (reports/Frais plateforme patient kiné légalité.md)."),
  c("CH", "chf", "enabled", "Self-pay physio outside LAMal (no fixed tariff); Swiss VAT only above CHF 100k worldwide turnover; France adequate for data. CONDITIONAL: Stripe to confirm direct charges + card cloning for CH accounts, admin checks NAREG/cantonal licence, Swiss lawyer reviews texts."),
  c("BE", "eur", "needs_lawyer", "INAMI conventions and the fee-supplement rules for remote follow-up need a Belgian lawyer."),
  c("LU", "eur", "needs_lawyer", "Mandatory CNS conventioning: unclear whether an out-of-nomenclature remote fee is allowed."),
  c("MC", "eur", "blocked_stripe", "Monaco is not a Stripe-supported country."),
  c("DE", "eur", "needs_lawyer", "Physios need a prescription or a Heilpraktiker licence to treat; GKV rules."),
  c("NL", "eur", "needs_lawyer", "NZa rules on billable services."),
  c("ES", "eur", "needs_lawyer", "Colegio rules and invoicing not confirmed."),
  c("IT", "eur", "needs_lawyer", "Mandatory e-invoicing / Tessera Sanitaria reporting."),
  c("PT", "eur", "needs_lawyer", "Certified invoicing software required."),
  c("AT", "eur", "needs_lawyer", "Physio treatment requires a medical referral."),
  c("IE", "eur", "enabled", "Private physio fees unregulated, CORU registration, physio fees VAT-exempt; EU (OSS threshold €10k, GDPR). Draft wording, lawyer review before real patients."),
  c("GB", "gbp", "enabled_conditions", "BEFORE REAL PATIENTS: EasyPhysio must register for UK VAT (non-established supplier of digital services, no threshold) and charge 20 % on platform access. HCPC physio fees are VAT-exempt."),
  c("CA", "cad", "enabled_conditions", "BEFORE REAL PATIENTS: GST/HST (and QST) registration once C$30k of Canadian sales; provincial college rules; Quebec Law 25 privacy impact assessment for data hosted in France."),
  c("US", "usd", "enabled_conditions", "BEFORE REAL PATIENTS: HIPAA business-associate agreements (Scalingo, Clerk, Stripe…), physio licence in the patient's state, state sales tax on SaaS (economic nexus) — needs US counsel."),
  c("AU", "aud", "needs_lawyer", "AHPRA advertising/telehealth rules and APP 8 transfer need an Australian lawyer."),
  c("NZ", "nzd", "needs_lawyer", "Promising, but Privacy Act transfer and Board rules not confirmed."),
];

export const DEFAULT_COUNTRY = "FR";

export function countryConfig(code: string | null | undefined): CountryConfig | null {
  if (!code) return null;
  return COUNTRIES.find((x) => x.code === code.toUpperCase()) ?? null;
}

/** Pays ouvert ? (inconnu = non). */
export function isCountryEnabled(code: string | null | undefined): boolean {
  return countryConfig(code)?.enabled ?? false;
}

/** Pays du kiné tel que lu en base : vide (anciennes fiches) = France. */
export function instructorCountry(code: string | null | undefined): string {
  return (code ?? DEFAULT_COUNTRY).toUpperCase();
}

export const ENABLED_COUNTRY_CODES: readonly string[] = COUNTRIES.filter((x) => x.enabled).map((x) => x.code);
