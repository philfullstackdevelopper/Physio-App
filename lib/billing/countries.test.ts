import { test } from "node:test";
import assert from "node:assert/strict";
import { COUNTRIES, ENABLED_COUNTRY_CODES, instructorCountry, isCountryEnabled } from "./countries.ts";
import {
  CURRENCY_PRICES,
  FRANCE_PRICING,
  KINE_FOLLOW_UP_CENTS,
  PLATFORM_INVOICE_FOOTER,
  PLATFORM_OFFERS,
  formatMoney,
  monthlyTotalCents,
  monthlyTotalIn,
  platformInvoiceFooter,
  platformOffersIn,
  pricingForCountry,
  savingsPercent,
  savingsPercentIn,
} from "./patientPlans.ts";
import { checkProfessionalId, gs1CheckDigitOk, professionalIdAutoApproves } from "../instructor/professionalId.ts";
import { parsePendingCabinet } from "../cabinet/pendingCabinet.ts";

test("France : mêmes montants, même monnaie, même mention TVA qu'avant", () => {
  const fr = pricingForCountry("FR")!;
  assert.equal(fr.currency, "eur");
  assert.equal(fr.kineFollowUp, KINE_FOLLOW_UP_CENTS);
  assert.deepEqual(platformOffersIn(fr), PLATFORM_OFFERS.map((o) => ({ ...o })));
  for (const o of PLATFORM_OFFERS) {
    assert.equal(monthlyTotalIn(o, fr), monthlyTotalCents(o));
    assert.equal(savingsPercentIn(o, fr), savingsPercent(o));
  }
  assert.deepEqual(pricingForCountry(null), FRANCE_PRICING);
  assert.equal(platformInvoiceFooter("FR"), PLATFORM_INVOICE_FOOTER);
  assert.equal(instructorCountry(null), "FR");
});

test("chaque pays ouvert a une monnaie avec des montants", () => {
  for (const code of ENABLED_COUNTRY_CODES) {
    const p = pricingForCountry(code);
    assert.ok(p, code);
    assert.ok(p!.kineFollowUp >= 100, code);
    for (const v of Object.values(p!.platform)) assert.ok(v >= 100, code);
  }
});

test("Suisse en CHF, pays fermés refusés", () => {
  assert.equal(pricingForCountry("CH")?.currency, "chf");
  assert.equal(pricingForCountry("GB")?.currency, "gbp");
  assert.equal(pricingForCountry("DE"), null);
  assert.equal(pricingForCountry("XX"), null);
  assert.equal(isCountryEnabled("BE"), false);
  assert.ok(COUNTRIES.every((c) => /^[A-Z]{2}$/.test(c.code)));
  assert.ok(CURRENCY_PRICES.chf);
  assert.match(formatMoney(690, "chf", "en"), /CHF\s?6\.90/);
});

test("GLN suisse : chiffre de contrôle GS1", () => {
  assert.equal(gs1CheckDigitOk("7601003000382"), true); // exemple publié par Refdata
  assert.equal(gs1CheckDigitOk("7601003000383"), false);
  const ok = checkProfessionalId("CH", "7601 0030 0038 2");
  assert.deepEqual(ok, { ok: true, value: "7601003000382", formatChecked: true });
  assert.deepEqual(checkProfessionalId("CH", "123"), { ok: false, reason: "format" });
  assert.deepEqual(checkProfessionalId("CH", ""), { ok: false, reason: "required" });
  // Suisse : format vérifié, mais validation par l'admin (NAREG + autorisation cantonale).
  assert.equal(professionalIdAutoApproves("CH", "7601003000382"), false);
});

test("France : RPPS facultatif, validation d'office comme avant", () => {
  assert.deepEqual(checkProfessionalId("FR", ""), { ok: true, value: null, formatChecked: false });
  assert.equal(professionalIdAutoApproves("FR", null), true);
});

test("Royaume-Uni HCPC (règle publique) ; Irlande sans règle sûre → revue admin", () => {
  assert.equal(professionalIdAutoApproves("GB", "PH123456"), true);
  assert.deepEqual(checkProfessionalId("GB", "AB123"), { ok: false, reason: "format" });
  assert.deepEqual(checkProfessionalId("IE", "PT012345"), { ok: true, value: "PT012345", formatChecked: false });
  assert.equal(professionalIdAutoApproves("IE", "PT012345"), false);
});

test("cookie d'inscription : pays et numéro", () => {
  const base = { mode: "create", cabinetName: "Physio Lac", cabinetAddress: "1 rue du Lac, 1200 Genève", phone: "+41 22 000 00 00" };
  // Ancien cookie sans pays = France, RPPS gardé.
  assert.equal(parsePendingCabinet({ ...base, rppsNumber: "10001234567" })?.country, "FR");
  assert.equal(parsePendingCabinet({ ...base, rppsNumber: "10001234567" })?.rppsNumber, "10001234567");
  const ch = parsePendingCabinet({ ...base, country: "CH", professionalId: "7601003000382", rppsNumber: "10001234567", siret: "12345678901234" });
  assert.equal(ch?.country, "CH");
  assert.equal(ch?.professionalId, "7601003000382");
  assert.equal(ch?.rppsNumber, null);
  assert.equal(ch?.siret, null);
  // Pays fermé, ou numéro manquant hors France : refusé.
  assert.equal(parsePendingCabinet({ ...base, country: "DE", professionalId: "123456" }), null);
  assert.equal(parsePendingCabinet({ ...base, country: "CH" }), null);
});

// Cohérence (2026-11-18) : pour un patient donné, TOUT découle du pays de son
// kiné. Chaque pays ouvert doit donc avoir sa monnaie, ses montants, sa mention
// de facture, son numéro professionnel et ses mentions de note, dans les deux
// langues — sinon un patient verrait un mélange de France et de son pays.
import { readFileSync } from "node:fs";
import { PLATFORM_INVOICE_FOOTERS } from "./patientPlans.ts";
import { countryConfig } from "./countries.ts";
import { professionalIdRule } from "../instructor/professionalId.ts";

const json = (p: string) => JSON.parse(readFileSync(new URL(`../../messages/${p}`, import.meta.url), "utf8"));
const msgs = { fr: { auth: json("fr/auth.json"), billing: json("fr/billing.json") }, en: { auth: json("en/auth.json"), billing: json("en/billing.json") } };

test("chaque pays ouvert est complet (monnaie, montants, facture, numéro, note) en FR et EN", () => {
  for (const code of ENABLED_COUNTRY_CODES) {
    const p = pricingForCountry(code)!;
    assert.equal(p.currency, countryConfig(code)!.currency, code);
    assert.ok(PLATFORM_INVOICE_FOOTERS[code], `${code} : mention de facture`);
    if (code === "FR") continue;
    const key = professionalIdRule(code).key;
    for (const lang of ["fr", "en"] as const) {
      assert.ok(msgs[lang].auth.cabinet.proId[key]?.label, `${code}/${lang} : libellé du numéro`);
      const note = msgs[lang].billing.feeNoteCountry[code];
      assert.ok(note?.line && note?.legal && note?.id, `${code}/${lang} : mentions de la note`);
    }
  }
});

test("les montants d'un patient suivent le pays de son kiné, jamais un mélange", () => {
  const ch = pricingForCountry("CH")!;
  const gb = pricingForCountry("GB")!;
  // Les trois offres et le programme du kiné sont tous dans la même monnaie.
  for (const o of platformOffersIn(ch)) assert.equal(o.platformCents, ch.platform[o.key]);
  assert.notDeepEqual(ch.platform, gb.platform);
  assert.equal(platformInvoiceFooter("CH"), PLATFORM_INVOICE_FOOTERS.CH);
  assert.equal(platformInvoiceFooter("GB"), PLATFORM_INVOICE_FOOTERS.GB);
  // Kiné sans pays enregistré (anciennes fiches) : France, exactement comme avant.
  assert.equal(platformInvoiceFooter(null), PLATFORM_INVOICE_FOOTER);
});

// Tarif libre du kiné (2026-11-19).
import { chargeableKineCents, kinePriceCents, kinePriceRaisePending, kinePriceValid, parseKinePrice, withKinePrice } from "./patientPlans.ts";

test("tarif du kiné : 0 ou de 1,00 à 500,00, saisie souple", () => {
  assert.equal(parseKinePrice("0"), 0);
  assert.equal(parseKinePrice("12"), 1200);
  assert.equal(parseKinePrice("12,5"), 1250);
  assert.equal(parseKinePrice(" 7.90 "), 790);
  assert.equal(parseKinePrice("500"), 50_000);
  assert.equal(parseKinePrice("500,01"), null);
  assert.equal(parseKinePrice("0,50"), null); // sous 1,00 : refusé (frais de carte)
  assert.equal(parseKinePrice("-3"), null);
  assert.equal(parseKinePrice("abc"), null);
  assert.equal(kinePriceValid(0), true);
  assert.equal(kinePriceValid(99), false);
});

test("tarif du kiné : par défaut celui du pays, sinon le sien, dans la monnaie du pays", () => {
  const ch = pricingForCountry("CH")!;
  assert.equal(kinePriceCents(null, ch), 600);
  assert.equal(withKinePrice(ch, 2500).kineFollowUp, 2500);
  assert.equal(withKinePrice(ch, 0).kineFollowUp, 0);
  assert.equal(withKinePrice(ch, 2500).currency, "chf");
  assert.equal(withKinePrice(FRANCE_PRICING, null).kineFollowUp, KINE_FOLLOW_UP_CENTS); // France inchangée
});

test("prélèvement : jamais plus que le montant accepté par le patient", () => {
  assert.equal(chargeableKineCents(600, 1200), 600); // hausse non acceptée : ancien prix
  assert.equal(chargeableKineCents(1200, 800), 800); // baisse : tout de suite
  assert.equal(chargeableKineCents(600, 0), 0); // passé à « offert » : rien
  assert.equal(chargeableKineCents(null, 900), 900); // abonné avant les accords enregistrés
  assert.equal(kinePriceRaisePending(600, 1200), true);
  assert.equal(kinePriceRaisePending(1200, 800), false);
  assert.equal(kinePriceRaisePending(null, 1200), false);
});
