import { test } from "node:test";
import assert from "node:assert/strict";
import {
  KINE_PLANS,
  KINE_SUBSCRIPTION_TTC_CENTS,
  cabinetFactor,
  periodCovered,
  periodLastDay,
  planMonthsOf,
  platformFeeForPeriod,
  subscriptionPrice,
  RECOMMENDED_REVIEW_PRICE_CENTS,
  csvCell,
  effectiveReviewPrice,
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

test("abonnement EasyPhysio : grille par durée, mois offert sur la formule mensuelle seulement", () => {
  const after = "2027-01-15"; // offre fondateur terminée
  assert.equal(KINE_SUBSCRIPTION_TTC_CENTS, 3999);
  assert.equal(subscriptionPrice(1, 1, after).ttcCents, 3999);
  assert.equal(subscriptionPrice(3, 1, after).ttcCents, 9999);
  assert.equal(subscriptionPrice(6, 1, after).ttcCents, 18999);
  assert.equal(subscriptionPrice(12, 1, after).ttcCents, 34999);
  // Plus c'est long, moins c'est cher par mois.
  const perMonth = KINE_PLANS.map((p) => subscriptionPrice(p.months, 1, after).perKinePerMonthCents);
  assert.deepEqual([...perMonth].sort((a, b) => b - a), perMonth);
  // Mois offert : formule mensuelle seulement.
  assert.equal(platformFeeForPeriod({ months: 1, kines: 1, isFirstBilledMonth: true }).free, true);
  assert.equal(platformFeeForPeriod({ months: 6, kines: 3, isFirstBilledMonth: true, day: after }).free, false);
  const paid = platformFeeForPeriod({ months: 3, kines: 1, isFirstBilledMonth: false, day: after });
  assert.equal(paid.ttcCents, 9999);
  assert.equal(paid.htCents + paid.vatCents, 9999);
});

test("offre fondateur : 12 mois à 299,99 € jusqu'au 31/12/2026", () => {
  const during = subscriptionPrice(12, 1, "2026-12-01");
  assert.equal(during.ttcCents, 29999);
  assert.equal(during.founder, true);
  assert.equal(during.regularTtcCents, 34999);
  assert.equal(subscriptionPrice(12, 1, "2026-12-31").founder, true);
  assert.equal(subscriptionPrice(12, 1, "2027-01-01").ttcCents, 34999);
  assert.equal(subscriptionPrice(6, 1, "2026-12-01").founder, false);
  assert.equal(platformFeeForPeriod({ months: 12, kines: 1, isFirstBilledMonth: false, day: "2026-12-01" }).ttcCents, 29999);
});

test("cabinet : chaque kiné en plus coûte moins cher (2e −15 %, 3e et suivants −25 %)", () => {
  const after = "2027-01-15";
  const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-9, `${a} ≠ ${b}`);
  near(cabinetFactor(1), 1);
  near(cabinetFactor(2), 1.85);
  near(cabinetFactor(3), 2.6);
  near(cabinetFactor(5), 4.1);
  const c = subscriptionPrice(6, 3, after);
  assert.equal(c.ttcCents, 49397);
  assert.equal(c.perKinePerMonthCents, 2744);
  assert.equal(c.savingCents, 3999 * 6 * 3 - 49397);
  // Le prix par kiné et par mois baisse avec le nombre de kinés ET la durée.
  assert.ok(subscriptionPrice(6, 4, after).perKinePerMonthCents < c.perKinePerMonthCents);
  assert.ok(subscriptionPrice(12, 3, after).perKinePerMonthCents < c.perKinePerMonthCents);
  assert.equal(planMonthsOf(6), 6);
  assert.equal(planMonthsOf(4), 1);
});

test("période prépayée : dernier jour et mois couverts", () => {
  assert.equal(periodLastDay("2026-11-01", 1), "2026-11-30");
  assert.equal(periodLastDay("2026-11-01", 3), "2027-01-31");
  assert.equal(periodLastDay("2026-12-01", 12), "2027-11-30");
  assert.equal(periodCovered("2027-01-01", "2026-11-01", "2027-01-31"), true);
  assert.equal(periodCovered("2027-02-01", "2026-11-01", "2027-01-31"), false);
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
