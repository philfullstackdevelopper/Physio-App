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
