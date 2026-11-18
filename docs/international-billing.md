# EasyPhysio: can the billing model work outside France?

**Date:** 2026-11-18
**Status:** research draft. **Not legal or tax advice.**

> **Disclaimer.** An AI (Claude) wrote this from public web sources found on 2026-11-18. It is a starting point for a lawyer and an accountant, not a conclusion. Some sources are secondary (law-firm blogs, tax-software vendors, HL7/FHIR guides). Those are marked, and anything not checked against a primary source is marked **unverified**. Every non-French legal text, invoice wording or VAT mention below is a **draft that a human must review** (local lawyer or accountant, plus the partner physio). The verdicts are deliberately conservative: if any core point is unclear, the country is disabled.

---

## 0. The model being assessed (recap)

- **EasyPhysio** is a French micro-entreprise under the VAT franchise (art. 293 B CGI). Its health data is hosted in France on HDS-certified hosting (Scalingo osc-fr1).
- **Payment 1 (patient → EasyPhysio):** a platform-access subscription at 6.99 / 3.99 / 2.99 €/month, with a 10-day trial. This is a B2C *electronically supplied service* sold from France and charged on EasyPhysio's own Stripe account.
- **Payment 2 (patient → physio):** a "programme follow-up" fee of 6 €/month, charged only in months when the physio updates the programme. It is a **direct charge** on the physio's Stripe Connect (Express) account with **no application fee**, and the fee note is issued in the physio's name. In France this is "hors nomenclature" with the patient's prior written price acceptance (art. R.4321-98 CSP). The split exists because of the fee-sharing ban (art. L.4113-5 / R.4321-72 CSP).

## 1. Cross-cutting findings (apply to every country)

### 1.1 Stripe Connect from a French platform

- **Express accounts abroad: yes.** Stripe's Express guide says platforms established in France (and in about 40 other listed countries) "can create Express accounts for most countries supported by Stripe", and that onboarding by country is switched on in the Connect settings. Source: [docs.stripe.com/connect/express-accounts](https://docs.stripe.com/connect/express-accounts).
- **Direct charges abroad: allowed in principle, with a caveat.**
  - Stripe's charge-type page puts the "cross-region" restriction only on *destination charges* and *separate charges and transfers* without `on_behalf_of`. It says direct-charge funds "are always paid out in the connected account's country". Source: [docs.stripe.com/connect/charges](https://docs.stripe.com/connect/charges).
  - "Cross-border payouts" (US/UK/EEA/CA/CH only) cover only indirect flows and do **not** include direct charges. That limit does not affect EasyPhysio, because a direct charge never moves money from the platform's balance. Source: [docs.stripe.com/connect/cross-border-payouts](https://docs.stripe.com/connect/cross-border-payouts).
  - **Caveat 1.** Stripe now says direct charges are "not recommended for legacy v1 Express and Custom accounts" and points to Accounts v2 or destination charges instead ([connect/charges](https://docs.stripe.com/connect/charges)). EasyPhysio uses Express plus direct charges. Before opening a new country, confirm with Stripe support that a French platform can do direct charges on an Express (or v2) account in that country.
  - **Caveat 2 (unverified).** The live flow *clones* the patient's card from the platform account onto the physio's connected account. Whether cloning works when the connected account is in another region (e.g. FR platform → AU account) was **not verified**. Ask Stripe.
  - **Caveat 3.** Direct-charge connected accounts need the `card_payments` capability, which requires the **full** service agreement, not the recipient one ([service agreement types](https://docs.stripe.com/connect/service-agreement-types)).
- **Supported-country list:** [stripe.com/global](https://stripe.com/global) lists every country assessed here **except Monaco**. Monaco also does not appear among the territories that may register as France ([Stripe support: outlying territories](https://support.stripe.com/questions/can-i-use-stripe-if-my-business-is-based-in-an-outlying-territory-of-a-supported-)).

### 1.2 VAT on EasyPhysio's own subscription (B2C electronic service sold from France)

- **EU countries:** a single EU-wide threshold of **€10,000/year** (excluding VAT) applies to cross-border B2C telecom, broadcasting and electronic services (TBE). Below it, the place of supply stays France, so French rules apply, including the **293 B franchise (no VAT charged)**. Above it, the customer's country rate applies (via OSS). The threshold covers *all* EU countries combined, current or previous calendar year. Source: Irish Revenue's TBE guidance, which describes the EU-wide rule: [revenue.ie electronically supplied services](https://www.revenue.ie/en/vat/vat-on-services/electronic-services/vat-and-electronically-supplied-services/index.aspx).
  - **Action:** EasyPhysio must track non-French EU B2C revenue and plan the switch to OSS before it reaches €10,000. Crossing the threshold mid-year switches all later supplies.
- **UK:** a non-established taxable person (NETP) must register for UK VAT from the **first £** of taxable UK supplies, digital services included. There is no threshold. Sources: [VAT Notice 700/1](https://www.gov.uk/government/publications/vat-notice-7001-should-i-be-registered-for-vat/vat-notice-7001-should-i-be-registered-for-vat), [HMRC VATDREG04150](https://gov.uk/hmrc-internal-manuals/vat-deregistration/vatdreg04150).
- **Switzerland:** foreign providers of electronic services to Swiss private customers must register once **worldwide** turnover reaches CHF 100,000. Source: [ESTV: assujettissement des entreprises étrangères](https://www.estv.admin.ch/fr/tva-assujettissement-entreprises-etrangeres), confirmed by secondary sources. EasyPhysio is far below this, so no Swiss registration is due.
- **Australia:** a non-resident must register for GST once its Australian consumer sales reach **A$75,000** (current or projected 12 months). Source: [ATO: non-resident businesses and GST](https://www.ato.gov.au/businesses-and-organisations/international-tax-for-business/non-resident-businesses-and-gst). EasyPhysio is below this, so no registration is due.
- **New Zealand:** offshore suppliers of remote services must register once NZ supplies reach **NZ$60,000** (past or next 12 months). Source: [IRD: GST on remote services](https://www.ird.govt.nz/gst-on-remote-services). EasyPhysio is below this.
- **Canada:** the simplified GST/HST regime for non-resident digital vendors applies above **C$30,000** of specified supplies over 12 months. **Quebec QST** has its own simplified registration, also around C$30,000. Sources are secondary, e.g. [Stripe guide: Canada GST registration](https://stripe.com/en-lu/guides/tax-registration-process-canada). The CRA and Revenu Québec pages were **not opened (unverified)**.
- **United States:** state sales tax on SaaS varies by state, and economic-nexus thresholds (often $100,000 or 200 transactions) are **unverified per state**. Some states tax SaaS and some don't.

### 1.3 Professional-ID validation: general advice

Format checks only prove a number is *well-formed*. For example, about 1 in 10 random 10-digit strings passes the NPI Luhn check ([Stedi NPI doc](https://stedi.com/docs/healthcare/national-provider-identifier)). Keep the manual admin approval from `/admin`, and add a "check on the public register" link for each country.

---

## 2. Summary table

| Country | ISO | Currency | Stripe Connect from FR platform (Express + direct charge) | Professional ID (format) | Verdict |
|---|---|---|---|---|---|
| France | FR | eur | Yes (domestic) | RPPS: 11 digits, Luhn (see §3) | **ENABLE** |
| Belgium | BE | eur | Yes (in Stripe list; direct-charge caveat §1.1) | INAMI/RIZIV: 11 digits (8 + 3 qualification code); check digits 7–8 by modulo, exact rule unverified | DISABLED — needs a local lawyer |
| Switzerland | CH | chf | Yes (in Stripe list; caveat §1.1) | GLN: 13 digits, GS1 mod-10, in practice starts `760` (Refdata person GLNs seen as `7601…`) | **ENABLE** (with conditions) |
| Luxembourg | LU | eur | Yes (in Stripe list) | Ministry authorisation + CNS "code prestataire": no public format rule found | DISABLED — needs a local lawyer (CNS convention is automatic) |
| Monaco | MC | eur | **No**: not in stripe.com/global | No public format rule found | DISABLED — Stripe not available |
| Germany | DE | eur | Yes | No national physio register; GKV billing uses IK number (9 digits, format unverified) | DISABLED — needs a local lawyer (prescription / Heilpraktiker rule) |
| Netherlands | NL | eur | Yes | BIG number (digit count unverified) | DISABLED — needs a local lawyer (NZa billable-service rules) |
| Spain | ES | eur | Yes | Colegio membership number (per college; REPS) — no public format rule | DISABLED — needs a local lawyer |
| Italy | IT | eur | Yes | Albo dei Fisioterapisti registration number (per regional order) — no public format rule | DISABLED — needs a local lawyer |
| Portugal | PT | eur | Yes | Ordem dos Fisioterapeutas *cédula profissional* — no public format rule found | DISABLED — needs a local lawyer |
| Ireland | IE | eur | Yes | CORU Register of Physiotherapists number — format unverified (commonly cited `PT` + digits) | **ENABLE** |
| Austria | AT | eur | Yes | Gesundheitsberuferegister (GBR) number — format unverified | DISABLED — needs a local lawyer (medical-referral rule) |
| United Kingdom | GB | gbp | Yes | HCPC: `PH` + up to 6 digits, no check digit | DISABLED — UK VAT registration from the first £ (NETP) |
| Canada (excl. Quebec) | CA | cad | Yes | Provincial college registration — varies by province, no national rule | DISABLED — needs a local lawyer (provincial rules + health-privacy laws) |
| Quebec | CA-QC | cad | Yes (Canadian account) | OPPQ permit number — no official rule (examples are 5 digits) | DISABLED — needs a local lawyer (Law 25 PIA, Quebec health-information act) |
| United States | US | usd | Yes | State licence (per state) + NPI: 10 digits, Luhn with `80840` prefix | DISABLED — needs a local lawyer (state licensure, HIPAA, state sales tax) |
| Australia | AU | aud | Yes (Express countries "most"; caveat §1.1) | AHPRA: `PHY` + 10 digits | DISABLED — needs a local lawyer (promising; APP 8 / consumer law to confirm) |
| New Zealand | NZ | nzd | Yes | HPI-CPN: 2 digits + 4 letters; Board number format unverified | DISABLED — needs a local lawyer (promising; Code of Rights / HIPC to confirm) |

Countries not assessed: Norway, Liechtenstein, the Nordics and others. All are in Stripe's list. Norway would add the VOEC scheme question for EasyPhysio's subscription (unverified). Leave them disabled.

---

## 3. France (baseline)

1. **Stripe:** domestic Express + direct charges, the current live setup. Currency `eur`.
2. **ID:** RPPS, 11 digits, last digit a Luhn check digit. This is the rule commonly implemented (and presumably what the app's existing RPPS check uses), **not re-verified in this research**. Public lookup: Annuaire Santé (URL not opened here).
3. **Legality:** this is the model as designed: "hors nomenclature" fee, written prior price acceptance (art. R.4321-98 CSP), 0 % platform share (art. L.4113-5 / R.4321-72 CSP). See `reports/Frais plateforme patient kiné légalité.md` in the main repo.
4. **VAT:** physio fee is exempt (medical care, art. 261-4-1° CGI). Whether a remote exercise-programme follow-up counts as "soins" should be confirmed by the accountant. EasyPhysio is under the franchise: "TVA non applicable, art. 293 B du CGI".
5. **Data:** HDS hosting in France, which is what the law requires.
6. **Verdict: ENABLE.**

## 4. Belgium (BE, eur)

1. **Stripe:** Belgium is in [stripe.com/global](https://stripe.com/global). A French platform can onboard Express accounts there ([express-accounts](https://docs.stripe.com/connect/express-accounts)). Currency `eur`. Direct-charge caveat §1.1.
2. **ID:** INAMI/RIZIV number plus the Health Ministry *visa*.
   - Format: 11 digits. The first 8 identify the provider and are kept for life ("Le numéro INAMI à huit chiffres (sans le code de qualification) reste utilisable à vie" — [INAMI methodology](https://www.inami.fgov.be/fr/statistiques/statistiques-soins-de-sante/statistiques-relatives-aux-dispensateurs-de-soins-individuels-methodologie)). The last 3 digits are the qualification/competence code ([INAMI competence codes](https://www.inami.fgov.be/fr/professionnels/information-tous/Pages/codes-competences-num%C3%A9ro-inami-dispensateurs-soins.aspx)).
   - Digits 7–8 are check digits computed from the first 6 by a modulo (secondary source: 97, 89, 83 or 79). **The exact algorithm is unverified**, and that kinés' numbers start with `5` is **unverified**.
   - Safe rule: strip separators, then `^\d{11}$`.
   - How a kiné obtains the number: [INAMI kinés](https://www.inami.fgov.be/fr/professionnels/professionnels-de-la-sante/kinesitherapeutes/obtenir-votre-numero-inami-en-tant-que-kinesitherapeute-et-enregistrer-votre-pratique-en-cabinet). No public lookup URL was verified.
3. **Legality:** unclear on two core points.
   - **Prescription:** Belgian kinés traditionally need a medical prescription. Art. 43 §6 of the coordinated law of 10 May 2015 (LEPS) lets the King list situations where treatment may start *without* one. In 2025 a royal decree on direct access was still at draft/advice stage ([CFK/FRK advice art. 43–44, 2025](https://overlegorganen.gezondheid.belgie.be/sites/default/files/documents/2025.02_cfk_frk_art_43_art_44_0.pdf), [ARKB note on direct access](https://overlegorganen.gezondheid.belgie.be/sites/default/files/documents/arkb_directe_toegang_kinesitherapie.pdf)). Whether it is in force is **unverified**.
   - **Convention:** conventioned kinés must apply INAMI tariffs to nomenclature services. Whether a non-nomenclature remote follow-up may be charged freely, and whether Belgian law has its own fee-splitting / "dichotomie" rule, is **unverified**.
4. **VAT:** the physio fee is probably exempt as medical care (EU VAT Directive art. 132(1)(c)); not verified for remote programmes. EasyPhysio: French franchise while under the €10k EU threshold (§1.2).
5. **Data:** GDPR applies on both sides, with no transfer issue. Belgian rules on where patient files may be kept were **not checked**.
6. **Verdict: DISABLED — needs a local lawyer** (prescription/direct access and convention rules).

## 5. Switzerland (CH, chf)

1. **Stripe:** Switzerland is in [stripe.com/global](https://stripe.com/global). French platforms can onboard Express accounts there. Currency `chf`; the physio's fee would be priced in CHF. Caveat §1.1.
2. **ID:** GLN (Global Location Number), attributed by the Refdata foundation, entered in **NAREG** (register of health professionals under LPSan, which covers physiotherapists) and searchable by GLN. Sources: [BAG/OFSP MedReg page](https://www.bag.admin.ch/de/medizinalberuferegister-medreg) (NAREG is the analogous register for health professions), [OFSP LPSan FAQ](https://www.bag.admin.ch/fr/foire-aux-questions-faq-sur-la-loi-federale-sur-les-professions-de-la-sante-lpsan), [HCI: GLN "for swiss health professionals, as assigned by RefData", example 7601003000382](https://index.hcisolutions.ch/datadoc/element/INSURANCE/INS/GLN).
   - **Format:** `^\d{13}$` plus the GS1 mod-10 check digit. In practice Swiss person GLNs start with `7601` (observed, not a published rule; the GS1 Switzerland prefix range is `760`–`769`). Recommended: `^76\d{11}$` + check digit. Accept any `760…` and warn instead of rejecting if it isn't `7601`.
   - **GS1 mod-10:** for digits d1…d12, `sum = Σ d_i × (i even ? 3 : 1)`; `check = (10 − sum mod 10) mod 10`; must equal d13. (Standard GS1 algorithm; the gs1.org page was not opened.)
   - Invoices to insurers also carry the ZSR/RCC number ([Physioswiss FAQ K-Nummern](https://www.physioswiss.ch/media/10189/download/230321_d_FAQ_K-Nummern.pdf?v=1)). Not needed for self-pay.
3. **Legality:** looks legal for self-pay, with conditions.
   - LAMal requires a medical prescription for *insurance-covered* physio, and there is no direct access under LAMal. But Physioswiss states that 80 % of physios already treat patients without a prescription when the patient pays directly ([Physioswiss position paper on direct access, 2026](https://physioswiss.ch/fr/wp-content/uploads/sites/1/260708_fr_positonspapier_dz_final.pdf); this is a professional body, so partisan, but it describes current practice).
   - Independent practice needs a **cantonal practice licence**.
   - LAMal tariff protection only covers LAMal benefits. A non-prescribed remote follow-up is outside LAMal, so the price is free.
   - No rule forcing written prior price acceptance was found, but best practice (and consumer-law price transparency) says keep the written acceptance.
   - Fee-splitting rules for physios: **unverified** (moot at 0 %).
   - Cantonal telehealth rules for physios: **unverified**.
4. **VAT:**
   - Physio fee: Swiss VAT exempts healing treatments by licensed health professionals (art. 21 al. 2 ch. 3 LTVA, not opened). Whether a remote programme qualifies is **unverified**, and most solo physios are under CHF 100k anyway.
   - EasyPhysio: no Swiss registration while worldwide turnover is under CHF 100,000 ([ESTV](https://www.estv.admin.ch/fr/tva-assujettissement-entreprises-etrangeres)). No French VAT either (export of service outside the EU, plus the franchise).
5. **Data:** the Swiss FADP lets data go to countries the Federal Council recognises as adequate, and France/EU states are on that list (Annex 1 of the Data Protection Ordinance; **page not opened, unverified here**). Cantonal health laws on medical-record keeping: **unverified**.
6. **Verdict: ENABLE**, on condition that (a) Stripe confirms direct charges on CH Express accounts from a FR platform, (b) the physio's NAREG/GLN entry and cantonal licence are checked at approval, and (c) a Swiss lawyer reviews the patient-facing texts before real launch. This is the least-certain ENABLE. Downgrade it if the caller prefers strict conservatism.

## 6. Luxembourg (LU, eur)

1. **Stripe:** Luxembourg is in [stripe.com/global](https://stripe.com/global). Currency `eur`.
2. **ID:** ministry authorisation to practise plus an individual **CNS "code prestataire"**, required before providing services covered by health insurance ([CNS–ALK convention 2026](https://cns.public.lu/dam-assets/legislations/convention/cns-alk-convention-01012026.pdf); [CNS registration terms](https://cns.public.lu/en/professionnels-sante/inscription-prestataire/inscription-kinesitherapeutes/modalites-bases.html)). **No public format rule found.**
3. **Legality:** conventioning is **automatic** for every provider authorised to set up practice ([guichet.lu](https://guichet.public.lu/fr/citoyens/sante/remboursement-frais-medicaux/prestations-sante-resident/prise-en-charge-resident.html)). Tariffs come from the CNS–ALK nomenclature. Whether a kiné may bill a non-nomenclature remote follow-up outside the CNS tariff, and whether a prescription is needed, is **unverified**.
4. **VAT:** EasyPhysio: French franchise under the €10k EU threshold. Physio fee: probably exempt (unverified).
5. **Data:** GDPR, no transfer issue.
6. **Verdict: DISABLED — needs a local lawyer** (mandatory convention / nomenclature).

## 7. Monaco (MC, eur)

1. **Stripe:** Monaco is **not** in [stripe.com/global](https://stripe.com/global) and is not a territory that can register as France ([Stripe support](https://support.stripe.com/questions/can-i-use-stripe-if-my-business-is-based-in-an-outlying-territory-of-a-supported-)). A Monegasque physio cannot open a supported Stripe account. A physio could in theory hold a French Stripe account only with a French legal entity and bank account, which does not fit.
2. **ID:** no public format rule found (not researched further).
3. – 5. Not researched (blocked at step 1).
6. **Verdict: DISABLED — Stripe Connect not available in Monaco.**

## 8. Germany (DE, eur)

1. **Stripe:** Germany is in the list. Currency `eur`.
2. **ID:** there is no national public register for physiotherapists. Professional title permission (*Erlaubnis*) is issued by the Länder. GKV billing uses an *Institutionskennzeichen* (IK, 9 digits); its check-digit rule is **unverified**. **No public format rule** to validate a physio as such.
3. **Legality — blocking uncertainty:** Germany has no general direct access. Physio treatment needs a doctor's *Heilmittelverordnung*. Physios treat self-pay patients without a prescription only with a **sectoral Heilpraktiker (Physiotherapie)** licence. Since Nov 2024 the *Blankoverordnung* gives physios more say over treatment, but the doctor still prescribes ([Physitrack summary, secondary](https://www.physitrack.com/insights/direktzugang-blankoverordnung-physiotherapie-deutschland)). A remote follow-up billed privately would need either a prescription or a sectoral Heilpraktiker physio. Private billing may also have to follow a fee schedule (GebüH / private-insurer lists, **unverified**).
4. **VAT:** physio fee: §4 Nr. 14 UStG medical exemption, which requires a medical indication (unverified for remote programmes). EasyPhysio: French franchise under €10k.
5. **Data:** GDPR, no transfer issue. Professional secrecy (§203 StGB) requirements for IT providers: **unverified**.
6. **Verdict: DISABLED — needs a local lawyer** (prescription / Heilpraktiker requirement).

## 9. Netherlands (NL, eur)

1. **Stripe:** yes. Currency `eur`.
2. **ID:** BIG register (*fysiotherapeut* is a BIG profession). The BIG number is unique and personal, searchable by name or number at [english.bigregister.nl](https://english.bigregister.nl/). The **digit count was not confirmed** (commonly said to be 11 digits; unverified). Re-registration is every 5 years.
3. **Legality:** direct access to physios exists, and NZa paramedical prices are free. But the NZa defines *which* services (prestaties) may be charged, including a "telefonische zitting" ([NZa policy rule, PUC_263685](https://puc.overheid.nl/nza/doc/PUC_263685_22/1/); [NZa registration and billing rule 2017](https://zoek.officielebekendmakingen.nl/stcrt-2017-39868.pdf)). Whether a 6 € monthly "programme follow-up" fits a recognised prestatie, or may be billed outside that framework, is **unverified**.
4. **VAT:** physio fee: medical exemption, probably. EasyPhysio: French franchise under €10k.
5. **Data:** GDPR, no transfer issue.
6. **Verdict: DISABLED — needs a local lawyer** (NZa prestatie framework).

## 10. Spain (ES, eur)

1. **Stripe:** yes. Currency `eur`.
2. **ID:** practice requires membership of the regional *Colegio de Fisioterapeutas*. The *número de colegiado* varies by college. A national REPS register exists (no URL verified). **No public format rule.**
3. **Legality:** not researched in depth. Free private practice is common, but regional rules on telehealth and price display and the college codes of ethics (fee-sharing) are **unverified**.
4. **VAT:** the physio fee is likely exempt (medical); EasyPhysio is under the French franchise below €10k.
5. **Data:** GDPR, no transfer issue.
6. **Verdict: DISABLED — needs a local lawyer.**

## 11. Italy (IT, eur)

1. **Stripe:** yes. Currency `eur`.
2. **ID:** registration in the *Albo dei Fisioterapisti*, held by the regional/provincial *Ordini dei Fisioterapisti* (OFI/FNOFI since 2022, previously within TSRM-PSTRP). There is a "ricerca iscritti" search ([TSRM-PSTRP circular 59/2022](https://www.tsrm-pstrp.org/wp-content/uploads/2022/12/Circolare-59-2022-adempimenti-a-seguito-della-pubblicazione-del-DM-Ordini-Fisioterapisti-e-relativa-Federazione-nazionale.pdf)). Registration number is per order. **No public format rule.**
3. **Legality:** not researched in depth. Whether a medical prescription is required, the telehealth rules and the invoicing rules (e-invoicing via SdI and the *Sistema Tessera Sanitaria* for health expenses) are **unverified**. E-invoicing alone could make the "fee note issued by EasyPhysio's system" model non-compliant.
4. **VAT:** the physio fee is likely exempt (art. 10 DPR 633/72, unverified). EasyPhysio is under the French franchise below €10k.
5. **Data:** GDPR, no transfer issue.
6. **Verdict: DISABLED — needs a local lawyer** (e-invoicing / Tessera Sanitaria / prescription).

## 12. Portugal (PT, eur)

1. **Stripe:** yes. Currency `eur`.
2. **ID:** *Ordem dos Fisioterapeutas* (created 2019), *cédula profissional*. **No public format rule found**, and no lookup URL verified.
3. **Legality:** not researched. Portugal also requires certified invoicing software and ATCUD codes on invoices (unverified), which may conflict with fee notes generated by EasyPhysio.
4. **VAT:** the physio fee is probably exempt; EasyPhysio is under the French franchise below €10k.
5. **Data:** GDPR, no transfer issue.
6. **Verdict: DISABLED — needs a local lawyer** (invoicing-software rules, Ordem rules).

## 13. Ireland (IE, eur)

1. **Stripe:** Ireland is in the list. Currency `eur`. Caveat §1.1.
2. **ID:** CORU **Register of Physiotherapists**. Physiotherapists and physical therapists are on one register ([CORU Physiotherapists Registration Board](https://coru.ie/about-us/registration-boards/physiotherapists-registration-board/)). Public lookup: [CORU check the register](https://coru.portaleu.thentiacloud.net/webs/portal/register/) (could not be fetched automatically).
   - **Format: unverified.** Numbers are commonly cited as `PT` + digits (e.g. `PT012345`), but no source confirmed this.
   - Recommended validator: normalise to upper case, accept `^PT\d{4,7}$`, and on failure fall back to manual admin check rather than rejecting.
3. **Legality:** looks legal.
   - Private physiotherapy is a free market with no state tariff for private patients.
   - The Irish Society of Chartered Physiotherapists says physios delivering e-Health to patients in Ireland must be CORU-registered, which implies remote practice is accepted ([ISCP e-Health guidance via World Physiotherapy, 2020](https://world.physio/fi/sites/default/files/2020-06/e-Health-for-PTs-in-PP-March-2020-Ireland.pdf)).
   - A statutory fee-splitting ban for physios was not found (**unverified**; moot at 0 %).
   - No mandatory written price-acceptance rule was found. Keep EasyPhysio's written acceptance anyway (good practice, consumer law).
4. **VAT:**
   - Physio fee: Revenue says physiotherapy services by a physiotherapist are **exempt** ([Revenue: physical therapy](https://www.revenue.ie/en/vat/vat-rates/search-vat-rates/P/physical-therapy-miscellaneous-services-.aspx); VATCA 2010 Sch. 1). Revenue warns some ancillary services are standard-rated. A remote exercise-programme follow-up is most likely "within the profession", but an Irish accountant should confirm.
   - EasyPhysio: under the €10,000 EU-wide threshold, French franchise, no Irish VAT ([Revenue TBE guidance](https://www.revenue.ie/en/vat/vat-on-services/electronic-services/vat-and-electronically-supplied-services/index.aspx)).
5. **Data:** GDPR on both sides, no third-country transfer. HDS hosting in France exceeds Irish requirements.
6. **Verdict: ENABLE** (Stripe OK, model looks legal, no blocking tax registration). The CORU number format still needs confirming before strict validation.

## 14. Austria (AT, eur)

1. **Stripe:** yes. Currency `eur`.
2. **ID:** **Gesundheitsberuferegister (GBR)**. Physiotherapists must be registered; registration is valid 5 years. Public lookup: `https://gbr-public.ehealth.gv.at` (address cited by [USP](https://www.usp.gv.at/themen/brancheninformationen/gesundheitswesen/gesundheitsberuferegister.html); not opened). **Number format unverified.**
3. **Legality:** Austrian physiotherapists (MTD law) traditionally act on medical referral (*ärztliche Anordnung*) except in prevention (**unverified**). Private-fee (*Wahltherapeut*) practice exists.
4. **VAT:** the physio fee is likely exempt; EasyPhysio is under the French franchise below €10k.
5. **Data:** GDPR, no transfer issue.
6. **Verdict: DISABLED — needs a local lawyer** (referral requirement).

## 15. United Kingdom (GB, gbp)

1. **Stripe:** yes. Currency `gbp`. Caveat §1.1.
2. **ID:** HCPC register. Format: profession code + **up to six digits**, no spaces. Physiotherapists = **`PH`**, e.g. `PH123456`. Sources: [HCPC how to check](https://hcpc-uk.org/check-the-register/how-to-check), [HCPC MRS help: "PH – Physiotherapists"](https://hcpc-uk.org/multiple-registrant-search/mrs-help-page). No check digit. Regex: `^PH\d{1,6}$` (after removing spaces, upper-casing).
3. **Legality:** looks legal on the clinical side. Private physio and direct access are normal; HCPC standards apply equally to remote care; there is no tariff for private patients. Fee-splitting: no statutory ban found (unverified).
4. **VAT — blocking:**
   - Physio fee: medical exemption, unverified for remote programmes.
   - **EasyPhysio must register for UK VAT from the first £** of B2C digital sales to UK consumers, because a NETP has no threshold ([VAT Notice 700/1](https://www.gov.uk/government/publications/vat-notice-7001-should-i-be-registered-for-vat/vat-notice-7001-should-i-be-registered-for-vat)). That means charging 20 % UK VAT on the subscription and filing UK returns. This is a real admin and cost step, so the country is disabled until Philippe decides to register.
5. **Data:** the UK has an EU adequacy decision (renewed in 2025, **unverified here**). UK GDPR applies; data in France is fine.
6. **Verdict: DISABLED — UK VAT registration required from the first £ (NETP).** Re-assess once EasyPhysio is willing to register for UK VAT; clinically the model looks fine.

## 16. Canada — rest of Canada (CA, cad)

1. **Stripe:** Canada is in the list. Currency `cad`. Caveat §1.1.
2. **ID:** provincial colleges (e.g. College of Physiotherapists of Ontario, CPTBC…). Number formats differ by province; there is **no national rule**.
3. **Legality:** physio regulation is provincial. Licensure is needed in the patient's province, and telehealth rules and private fees vary (**unverified**).
4. **VAT/GST:** the physio fee is exempt in principle (physiotherapy services, ETA Sch. V, unverified). EasyPhysio does not need to register under simplified GST/HST below C$30,000 over 12 months (secondary source: [Stripe guide](https://stripe.com/en-lu/guides/tax-registration-process-canada)).
5. **Data:** PIPEDA plus provincial health-information laws (Ontario PHIPA etc.). Some provinces restrict storage outside Canada for *public* bodies (unverified).
6. **Verdict: DISABLED — needs a local lawyer** (provincial licensure and health-privacy laws).

## 17. Quebec (CA-QC, cad)

1. **Stripe:** a Canadian Express account, currency `cad`.
2. **ID:** **OPPQ** permit number. Member register: [OPPQ find a professional](https://oppq.qc.ca/en/find-a-professional/). No official format rule. OPPQ documents show 5-digit permit numbers (e.g. `78061`), an inference only. Lenient validator: `^\d{4,6}$` (unverified).
3. **Legality:** practice is regulated by the OPPQ code of ethics (fees, telepractice). **Unverified.**
4. **Tax:** QST simplified registration above about C$30,000 of sales to Quebec consumers (secondary sources only). EasyPhysio is below this.
5. **Data:** Law 25 (private-sector act, s. 17) requires a **privacy impact assessment before personal information leaves Quebec** ([LégisQuébec P-39.1](https://www.legisquebec.gouv.qc.ca/en/document/cs/p-39.1)). Quebec's health-information act (in force July 2024) adds PIA duties for health bodies but does not ban transfers ([Gowling WLG](https://gowlingwlg.com/en/insights-resources/articles/2024/quebec-health-information-act), secondary). Feasible, but needs a written PIA and contract.
6. **Verdict: DISABLED — needs a local lawyer** (Law 25 PIA, OPPQ ethics on fees and telepractice).

## 18. United States (US, usd)

1. **Stripe:** yes. Currency `usd`. Caveat §1.1.
2. **ID:** state physical-therapy licence (format per state, no national rule) **plus** the **NPI** (national, 10 digits).
   - NPI check digit: Luhn computed as if the number were prefixed by `80840`. Equivalently: double every second digit of the first 9 starting from the leftmost, sum all digits of the results plus the undoubled ones, **add 24**, and the check digit = `(10 − sum mod 10) mod 10`. Regex `^\d{10}$` + Luhn(`"80840" + npi`). Sources (secondary): [Stedi NPI](https://stedi.com/docs/healthcare/national-provider-identifier), [John D. Cook on the NPI checksum](https://www.johndcook.com/blog/2024/06/26/npi-number/).
3. **Legality:** the patient's state licence is required, and some states limit direct access. Cash-pay remote exercise programmes are common, but state telehealth and consumer rules vary (**unverified**).
4. **Tax:** the physio fee is generally not subject to sales tax. EasyPhysio's SaaS is taxable in some states, with economic-nexus thresholds per state (**unverified**).
5. **Data:** if the physio is a HIPAA covered entity (bills insurance electronically), EasyPhysio is a **business associate** and must sign a **BAA** and meet the HIPAA Security Rule. Hosting abroad is not forbidden by HIPAA itself (unverified). State health-privacy laws (e.g. Washington My Health My Data) apply too.
6. **Verdict: DISABLED — needs a local lawyer** (state licensure, HIPAA BAA, state sales tax).

## 19. Australia (AU, aud)

1. **Stripe:** Australia is in the list; French platforms can onboard Express accounts in "most" Stripe countries. Currency `aud`. Caveat §1.1 (cross-region direct charge and card cloning to confirm).
2. **ID:** AHPRA registration number = **3 upper-case letters + 10 digits**; physiotherapists use `PHY`, e.g. `PHY0001234567` ([HL7 AU Base FHIR: AHPRA registration number](https://build.fhir.org/ig/hl7au/au-fhir-base/StructureDefinition-au-ahpraregistrationnumber.html), technical standard, not AHPRA itself). Regex: `^PHY\d{10}$`. No check digit is known. Public lookup: AHPRA register of practitioners (URL not opened).
3. **Legality:** looks favourable but not confirmed.
   - Telehealth is accepted, with the same professional obligations as in person ([AHPRA: information for practitioners who provide virtual care](https://www.ahpra.gov.au/Resources/Information-for-practitioners-who-provide-virtual-care.aspx); [AHPRA: good virtual care practices, 2024](https://www.ahpra.gov.au/News/2024-08-01-Good-virtual-care-practices.aspx)).
   - The practitioner must hold Australian registration to treat patients in Australia.
   - Private physio fees are free (no mandatory tariff); Medicare/private-health rebates are separate.
   - Fee-splitting: no ban found (unverified).
   - Australian Consumer Law applies to subscription terms (unverified details).
4. **Tax:**
   - Physio fee: physiotherapy by a recognised professional is **GST-free** under s. 38-10 if "generally accepted in the profession as necessary for appropriate treatment" ([ATO: other health services](https://www.ato.gov.au/businesses-and-organisations/gst-excise-and-indirect-taxes/gst/in-detail/your-industry/gst-and-health/other-health-services)). A remote programme follow-up likely qualifies (unverified).
   - EasyPhysio: no GST registration below A$75,000 ([ATO](https://www.ato.gov.au/businesses-and-organisations/international-tax-for-business/non-resident-businesses-and-gst)).
5. **Data:** every health-service provider is an APP entity. **APP 8** (cross-border disclosure) applies when information leaves the entity's "effective control". Pure cloud *storage* where the entity keeps control is a "use", not a disclosure ([OAIC APP Guidelines ch. 8](https://www.oaic.gov.au/privacy/australian-privacy-principles-guidelines/chapter-8-app-8-cross-border-disclosure-of-personal-information/)). EasyPhysio does more than store data (it processes it and messages patients), so it is probably a disclosure. The physio would then need APP 8.1 "reasonable steps" (a contract) and stays accountable (s. 16C).
6. **Verdict: DISABLED — needs a local lawyer** (APP 8 contract and consumer-law terms). This is the most promising non-EU country after Switzerland.

## 20. New Zealand (NZ, nzd)

1. **Stripe:** yes. Currency `nzd`. Caveat §1.1.
2. **ID:**
   - **HPI Common Person Number (CPN):** format **NNXXXX** (2 digits + 4 letters), one per person ([Health NZ: Health Provider Index](https://www.health.govt.nz/our-work/health-identity/health-provider-index)). Regex `^\d{2}[A-Z]{4}$`. Check-character rule **unverified**.
   - **Physiotherapy Board register number:** a separate identifier ([HL7 NZ naming system](https://build.fhir.org/ig/HL7NZ/nzbase/NamingSystem-physiotherapy-board-id.xml.html)) with **no public format rule found**. Public register: `https://www.physioboard.org.nz/search-register` (cited by the Board; not opened).
3. **Legality:** private physio and direct access are normal in NZ (ACC co-payments are separate). Telehealth and fee rules (Physiotherapy Board standards, Code of Health and Disability Consumers' Rights) are **unverified**.
4. **Tax:** EasyPhysio does not register below NZ$60,000 of NZ supplies ([IRD](https://www.ird.govt.nz/gst-on-remote-services)). The physio fee's GST treatment is a matter for the physio (NZ has no general medical exemption; physios above NZ$60k charge GST, **unverified**).
5. **Data:** Privacy Act 2020 and Health Information Privacy Code 2020. Using an overseas service provider acting as agent may not count as a disclosure (**unverified**).
6. **Verdict: DISABLED — needs a local lawyer** (HIPC, physio GST mention, Code of Rights).

---

## 21. Suggested per-country invoice wording (DRAFT — needs review)

Only for countries marked **ENABLE**. These are the lines on the **physio's fee note** (issued in the physio's name, never EasyPhysio's) and on **EasyPhysio's subscription invoice**.

**France (FR)** — current wording, reference:
- Physio fee note: « Suivi de programme d'exercices à distance — acte hors nomenclature, non remboursable par l'Assurance maladie, tarif accepté par écrit par le patient le JJ/MM/AAAA (art. R.4321-98 CSP). Exonération de TVA, art. 261-4-1° du CGI. »
- EasyPhysio invoice: « TVA non applicable, art. 293 B du CGI. »

**Ireland (IE)** — DRAFT:
- Physio fee note: "Remote exercise-programme follow-up (month MM/YYYY), provided by [name], CORU registration no. [PTxxxxx]. Private fee agreed in writing by the patient on DD/MM/YYYY; not covered by the HSE. VAT: exempt — medical services (VATCA 2010, Schedule 1)."
- EasyPhysio invoice: "VAT not applicable — art. 293 B of the French General Tax Code (French VAT franchise; EU cross-border B2C threshold not exceeded)."

**Switzerland (CH)** — DRAFT (conditional ENABLE):
- Physio fee note (FR/DE/IT per canton): "Suivi à distance d'un programme d'exercices (mois MM/AAAA) — prestation hors LAMal, non prise en charge par l'assurance obligatoire, tarif accepté par écrit le JJ/MM/AAAA. Physiothérapeute : [nom], GLN [76…]. TVA : prestation exclue du champ de l'impôt (art. 21 al. 2 ch. 3 LTVA) / ou « non assujetti à la TVA »."
- EasyPhysio invoice: "TVA non applicable, art. 293 B du CGI (France). Prestataire non immatriculé à la TVA suisse (chiffre d'affaires mondial < CHF 100 000)." Amount in EUR; the patient's bank converts.

## 22. Open questions for a lawyer / accountant

**Cross-cutting**
1. **Stripe (support ticket):** can a French Connect platform make **direct charges** on Express (or Accounts v2) accounts in CH, IE, AU, NZ, GB, CA, US? Can a platform-account PaymentMethod be **cloned** onto a connected account in another region? Should EasyPhysio move from legacy Express to Accounts v2?
2. Is EasyPhysio's own subscription, which the patient must buy to use the programme, ever treated as a **share of the physio's fee** or as **inducement / fee-splitting** under foreign professional codes, even at 0 % commission?
3. **Consumer law:** EU 14-day withdrawal right for the subscription vs the 10-day trial; auto-renewal disclosure (UK, AU, US states); commitment periods (3 or 6 months) on the 3.99 / 2.99 offers in each country.
4. **OSS:** once non-French EU B2C revenue nears €10,000, register for OSS and charge the local VAT rate. What happens to the 293 B franchise then? (French franchise + OSS interplay.)
5. Does a **remote exercise-programme follow-up** count as "medical care" for the VAT exemption in each country (EU art. 132(1)(c), CH LTVA, AU s. 38-10, IE Sch. 1)?
6. The legal, CGU, privacy and health-consent texts must be translated **and adapted** per country (GDPR vs FADP vs UK GDPR vs APP vs HIPC). The current English versions are unvalidated drafts.

**Per country**
7. **BE:** is the royal decree on direct access (art. 43 §6 LEPS) in force? Can a conventioned kiné bill a non-nomenclature remote follow-up? Is there an "acte hors nomenclature" price-acceptance rule like France's?
8. **CH:** do cantonal health laws allow licensed physios to provide remote follow-up without prescription for self-pay patients? Does any canton restrict hosting patient records abroad? Confirm the GLN `7601` prefix with Refdata.
9. **LU:** with automatic CNS conventioning, can a kiné charge any fee outside the CNS nomenclature?
10. **DE:** can a physio without a sectoral Heilpraktiker licence offer a self-pay remote programme follow-up? Which private fee schedule applies?
11. **NL:** which NZa prestatie (if any) covers a monthly remote follow-up, and can it be billed outside the NZa framework?
12. **IT / PT:** can a fee note generated by EasyPhysio satisfy Italian SdI e-invoicing / Tessera Sanitaria and Portuguese certified-software/ATCUD rules, or must the physio issue it in their own software?
13. **IE:** confirm the CORU number format (`PT` + digits?) and whether the CORU code has any rule on fees paid through a third-party platform.
14. **UK:** cost of UK VAT registration (NETP) for EasyPhysio, and whether to price the subscription VAT-inclusive.
15. **AU:** draft the APP 8.1 contract between physio and EasyPhysio; check Australian Consumer Law on subscriptions.
16. **NZ:** HIPC rule 12 / agent analysis for hosting in France; physio GST wording.
17. **QC:** write the Law 25 s. 17 privacy impact assessment; check OPPQ rules on fees and telepractice.
18. **US:** HIPAA BAA readiness (Scalingo would need to sign a BAA too, unverified), state-by-state PT licensure and direct-access rules, SaaS sales-tax nexus.

---

## Appendix A — ID validation rules (for implementation)

| Country | Identifier | Normalise | Regex | Checksum | Confidence |
|---|---|---|---|---|---|
| FR | RPPS | strip spaces | `^\d{11}$` | Luhn over all 11 digits | Common practice; not re-verified here |
| BE | INAMI/RIZIV | strip `-`, `.`, spaces | `^\d{11}$` | digits 7–8 = check on digits 1–6 (modulo 97/89/83/79, exact algorithm **unverified**) | Low: format only |
| CH | GLN | strip spaces | `^76\d{11}$` (warn if not `7601`) | GS1 mod-10: weights 1,3,1,3… on d1…d12 (d12 weight 3); `check=(10−sum%10)%10` = d13 | High for GS1 algorithm; prefix observed |
| GB | HCPC | upper-case, strip spaces | `^PH\d{1,6}$` | none | High (HCPC help pages) |
| IE | CORU | upper-case, strip spaces | `^PT\d{4,7}$` (lenient) | none known | **Unverified**: manual check fallback |
| AU | AHPRA | upper-case | `^PHY\d{10}$` | none known | Medium (HL7 AU standard) |
| NZ | HPI-CPN | upper-case | `^\d{2}[A-Z]{4}$` | unverified | Medium (Health NZ) |
| NZ | Physio Board no. | — | no public rule | — | — |
| US | NPI | strip spaces | `^\d{10}$` | Luhn on `"80840"+npi` (or Luhn on 9 digits + 24) | High (multiple consistent sources) |
| CA-QC | OPPQ permit | strip spaces | `^\d{4,6}$` (lenient) | none | Low (examples only) |
| NL | BIG | strip spaces | `^\d{11}$` (unverified length) | none known | Low |
| AT | GBR | — | no public rule found | — | — |
| DE, ES, IT, PT, LU, MC, CA (other provinces) | various | — | no public format rule | — | — |

---

## Appendix B — What the app does now (branch `feat/international`, 2026-11-18)

**Source of truth in code:** `lib/billing/countries.ts` (which countries are open and why), `lib/billing/patientPlans.ts` (`CURRENCY_PRICES`, `pricingForCountry`, `PLATFORM_INVOICE_FOOTERS`), `lib/instructor/professionalId.ts` (ID rules), `messages/*/billing.json → feeNoteCountry` (fee-note wording), migration `supabase/migrations/0101_instructor_country.sql`.

### Countries open in the code

| Country | Status in code | Currency | Prices (platform 1m / 3m / 6m · physio) | Signup approval |
|---|---|---|---|---|
| France | `enabled` | EUR | 6.99 / 3.99 / 2.99 · 6.00 (unchanged) | automatic, as before (RPPS optional) |
| Switzerland | `enabled` (conditional, see §5) | CHF | 6.90 / 3.90 / 2.90 · 6.00 | GLN format + GS1 check, **then admin review** (NAREG + cantonal licence) |
| Ireland | `enabled` | EUR | same as France | admin review (CORU format not confirmed) |
| United Kingdom | `enabled_conditions` (Philippe's request, 2026-11-18) | GBP | 5.99 / 3.49 / 2.49 · 5.00 | automatic if HCPC `PH` + digits |
| Canada | `enabled_conditions` (Philippe's request) | CAD | 9.99 / 5.99 / 4.49 · 9.00 | admin review |
| United States | `enabled_conditions` (Philippe's request) | USD | 7.49 / 4.49 / 3.49 · 6.50 | admin review |

Non-euro prices are **proposals** to be confirmed by Philippe. Every other country is closed: the signup offers « Autre pays… » → waiting list.

### Conditions to clear BEFORE real patients in the `enabled_conditions` countries
- **UK:** EasyPhysio must register for UK VAT (non-established supplier of digital services — no threshold) and charge 20 % VAT on platform access; the invoice footer currently carries a « [À COMPLÉTER : n° de TVA britannique] » placeholder on purpose.
- **US:** HIPAA business-associate agreements with every processor (Scalingo, Clerk, Stripe, PostHog…), the physio must be licensed in the patient's state, state sales tax on SaaS (economic nexus). Needs US counsel.
- **Canada:** GST/HST (and QST) registration once C$30,000 of Canadian sales; provincial college rules; **Quebec**: Law 25 privacy impact assessment for data hosted in France.
- **All non-French countries:** fee-note and invoice wording are drafts (`_review` flag in the message files) — local lawyer/accountant review.

### Tested on 2026-11-18 (Stripe TEST mode, `scripts/test-international-stripe.mjs`)
For FR, CH, GB, IE, US, CA, every step passed:
1. Standard Connect account created **with the physio's country** + onboarding link (exactly the app's call).
2. Patient platform subscription on EasyPhysio's account **in the local currency** (e.g. 3.90 CHF, 3.49 GBP), country VAT footer on the invoice.
3. Patient card cloned from the platform onto the physio's account in another country (CH, GB, US, CA) — the open question in §1 is answered: **it works in test mode**.
4. Off-session PaymentIntent on the physio's account in the local currency (6.00 CHF, 5.00 GBP, 6.50 USD, 9.00 CAD), **no application fee**.

Still to confirm with Stripe support for live mode: direct charges on Standard accounts outside the EEA from a French platform at scale, and whether any country needs the platform's own business verification first.
