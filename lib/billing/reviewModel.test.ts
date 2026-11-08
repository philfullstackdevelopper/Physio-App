import { test } from "node:test";
import assert from "node:assert/strict";
import {
  periodLastDay,
  RECOMMENDED_REVIEW_PRICE_CENTS,
  csvCell,
  effectiveReviewPrice,
  estimateStripeFeeCents,
  feeNoteNumber,
  isValidReviewPrice,
  patientMustAcceptFollowUp,
  nextPeriod,
  periodLabel,
  periodOf,
  previousPeriod,
} from "./reviewModel.ts";

test("tarif du bilan : celui du kiné s'il est valide, sinon le tarif conseillé", () => {
  assert.equal(effectiveReviewPrice(2500), 2500);
  assert.equal(effectiveReviewPrice(null), RECOMMENDED_REVIEW_PRICE_CENTS);
  assert.equal(effectiveReviewPrice(50), RECOMMENDED_REVIEW_PRICE_CENTS);
  assert.equal(effectiveReviewPrice(15000), 15000);
  assert.equal(effectiveReviewPrice(60000), RECOMMENDED_REVIEW_PRICE_CENTS);
  assert.equal(isValidReviewPrice(1000), true);
  assert.equal(isValidReviewPrice(4000), true);
  assert.equal(isValidReviewPrice(0), true);
  assert.equal(isValidReviewPrice(50), false);
  assert.equal(isValidReviewPrice(50000), true);
  assert.equal(isValidReviewPrice(50100), false);
  assert.equal(effectiveReviewPrice(0), 0);
  assert.equal(isValidReviewPrice(1999.5), false);
  assert.equal(isValidReviewPrice("2000"), false);
});

test("mois : heure de Paris, passage d'année", () => {
  // 31 octobre 23 h 30 UTC = 1er novembre 0 h 30 à Paris.
  assert.equal(periodOf(new Date("2026-10-31T23:30:00Z")), "2026-11-01");
  assert.equal(periodOf(new Date("2026-10-15T12:00:00Z")), "2026-10-01");
  assert.equal(nextPeriod("2026-12-01"), "2027-01-01");
  assert.equal(nextPeriod("2026-09-01"), "2026-10-01");
  assert.equal(previousPeriod("2027-01-01"), "2026-12-01");
  assert.equal(periodLabel("2026-10-01"), "octobre 2026");
});

test("numéro de note d'honoraires", () => {
  assert.equal(feeNoteNumber(2026, 7), "2026-0007");
  assert.equal(feeNoteNumber(2027, 1234), "2027-1234");
});

test("période prépayée : dernier jour", () => {
  assert.equal(periodLastDay("2026-11-01", 1), "2026-11-30");
  assert.equal(periodLastDay("2026-11-01", 3), "2027-01-31");
  assert.equal(periodLastDay("2026-12-01", 12), "2027-11-30");
});

test("frais Stripe estimés : 1,5 % + 0,25 €, rien pour 0 €", () => {
  assert.equal(estimateStripeFeeCents(600), 34);
  assert.equal(estimateStripeFeeCents(0), 0);
});

test("CSV : guillemets seulement quand il le faut", () => {
  assert.equal(csvCell("Dupont"), "Dupont");
  assert.equal(csvCell('Bilan ; "ok"'), '"Bilan ; ""ok"""');
  assert.equal(csvCell(null), "");
  assert.equal(csvCell(20), "20");
});

test("accès patient : gratuit à 0 €, suivi à accepter au-dessus (si le kiné encaisse en ligne)", () => {
  assert.equal(patientMustAcceptFollowUp({ kinePriceCents: 0, kineCanCharge: true, followUpStatus: null }), false);
  assert.equal(patientMustAcceptFollowUp({ kinePriceCents: 2000, kineCanCharge: true, followUpStatus: null }), true);
  assert.equal(patientMustAcceptFollowUp({ kinePriceCents: null, kineCanCharge: true, followUpStatus: "pending_card" }), true);
  assert.equal(patientMustAcceptFollowUp({ kinePriceCents: 2000, kineCanCharge: true, followUpStatus: "active" }), false);
  assert.equal(patientMustAcceptFollowUp({ kinePriceCents: 2000, kineCanCharge: false, followUpStatus: null }), false);
});
