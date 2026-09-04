import { test } from "node:test";
import assert from "node:assert/strict";
import { estimateMonth } from "./platformFee.ts";

test("estimateMonth : 18 patients à 40 € → 720 / 108 / 612", () => {
  const e = estimateMonth(4000, 18);
  assert.equal(e.totalCents, 72000);
  assert.equal(e.feeCents, 10800);
  assert.equal(e.netCents, 61200);
  assert.equal(e.feeShare, 0.15);
});

test("estimateMonth : zéro patient ou tarif nul → tout à zéro", () => {
  assert.deepEqual(estimateMonth(4000, 0), { totalCents: 0, feeCents: 0, netCents: 0, feeShare: 0.15 });
  assert.deepEqual(estimateMonth(0, 5), { totalCents: 0, feeCents: 0, netCents: 0, feeShare: 0.15 });
});

test("estimateMonth : arrondi au centime", () => {
  const e = estimateMonth(3333, 1);
  assert.equal(e.feeCents, 500); // 499.95 → 500
  assert.equal(e.netCents, 2833);
});
