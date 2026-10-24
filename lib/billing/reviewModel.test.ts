import { test } from "node:test";
import assert from "node:assert/strict";
import {
  RECOMMENDED_REVIEW_PRICE_CENTS,
  csvCell,
  effectiveReviewPrice,
  feeNoteNumber,
  isActivePatient,
  isValidReviewPrice,
  nextPeriod,
  periodLabel,
  periodOf,
  platformFeeForMonth,
  previousPeriod,
} from "./reviewModel.ts";

test("tarif du bilan : celui du kiné s'il est valide, sinon le tarif conseillé", () => {
  assert.equal(effectiveReviewPrice(2500), 2500);
  assert.equal(effectiveReviewPrice(null), RECOMMENDED_REVIEW_PRICE_CENTS);
  assert.equal(effectiveReviewPrice(500), RECOMMENDED_REVIEW_PRICE_CENTS);
  assert.equal(effectiveReviewPrice(5000), RECOMMENDED_REVIEW_PRICE_CENTS);
  assert.equal(isValidReviewPrice(1000), true);
  assert.equal(isValidReviewPrice(4000), true);
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

test("patient actif : invitation acceptée + une activité dans le mois", () => {
  const base = { termsAccepted: true, sessionsThisMonth: 0, feedbackThisMonth: 0, reviewThisMonth: false };
  assert.equal(isActivePatient(base), false);
  assert.equal(isActivePatient({ ...base, sessionsThisMonth: 1 }), true);
  assert.equal(isActivePatient({ ...base, feedbackThisMonth: 2 }), true);
  assert.equal(isActivePatient({ ...base, reviewThisMonth: true }), true);
  assert.equal(isActivePatient({ ...base, termsAccepted: false, sessionsThisMonth: 5 }), false);
});

test("facture EasyPhysio : 3 € HT par patient actif, premier mois offert", () => {
  assert.deepEqual(platformFeeForMonth(3, false), { free: false, htCents: 900, vatCents: 180, ttcCents: 1080 });
  assert.deepEqual(platformFeeForMonth(30, true), { free: true, htCents: 0, vatCents: 0, ttcCents: 0 });
  assert.equal(platformFeeForMonth(0, false).ttcCents, 0);
});

test("CSV : guillemets seulement quand il le faut", () => {
  assert.equal(csvCell("Dupont"), "Dupont");
  assert.equal(csvCell('Bilan ; "ok"'), '"Bilan ; ""ok"""');
  assert.equal(csvCell(null), "");
  assert.equal(csvCell(20), "20");
});
