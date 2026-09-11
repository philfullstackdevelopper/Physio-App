import { test } from "node:test";
import assert from "node:assert/strict";
import { estimateMonth, estimateMonthlySplit } from "./platformFee.ts";

test("estimateMonth : 18 patients à 40 € → 720 / 115,20 / 604,80", () => {
  const e = estimateMonth(4000, 18);
  assert.equal(e.totalCents, 72000);
  assert.equal(e.feeCents, 11520);
  assert.equal(e.netCents, 60480);
  assert.equal(e.feeShare, 0.16);
});

test("estimateMonth : zéro patient ou tarif nul → tout à zéro", () => {
  assert.deepEqual(estimateMonth(4000, 0), { totalCents: 0, feeCents: 0, netCents: 0, feeShare: 0.16 });
  assert.deepEqual(estimateMonth(0, 5), { totalCents: 0, feeCents: 0, netCents: 0, feeShare: 0.16 });
});

test("estimateMonth : arrondi au centime", () => {
  const e = estimateMonth(3333, 1);
  assert.equal(e.feeCents, 533); // 533.28 → 533
  assert.equal(e.netCents, 2800);
});

test("estimateMonthlySplit : une offre, 10 patients à 29,99 €", () => {
  const s = estimateMonthlySplit([{ priceCents: 2999, count: 10 }]);
  assert.equal(s.totalCents, 29990);
  assert.equal(s.platformFeeCents, 4798); // 16 % de 299,90 €, arrondi
  // Stripe : (2999 * 1.5 % + 25) arrondi = 70, × 10 patients = 700
  assert.equal(s.stripeFeeCents, 700);
  assert.equal(s.netCents, 29990 - 4798 - 700);
});

test("estimateMonthlySplit : plusieurs offres se cumulent", () => {
  const s = estimateMonthlySplit([
    { priceCents: 1999, count: 2 },
    { priceCents: 2999, count: 1 },
    { priceCents: 3999, count: 0 },
  ]);
  assert.equal(s.totalCents, 1999 * 2 + 2999);
  assert.ok(s.stripeFeeCents > 0);
  assert.equal(s.netCents, s.totalCents - s.platformFeeCents - s.stripeFeeCents);
});

test("estimateMonthlySplit : aucun patient → tout à zéro", () => {
  assert.deepEqual(estimateMonthlySplit([{ priceCents: 2999, count: 0 }]), {
    totalCents: 0,
    platformFeeCents: 0,
    stripeFeeCents: 0,
    netCents: 0,
  });
  assert.deepEqual(estimateMonthlySplit([]), {
    totalCents: 0,
    platformFeeCents: 0,
    stripeFeeCents: 0,
    netCents: 0,
  });
});
