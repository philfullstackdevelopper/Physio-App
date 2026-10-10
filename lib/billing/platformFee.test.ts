import { test } from "node:test";
import assert from "node:assert/strict";
import {
  estimateMonth,
  estimateMonthlySplit,
  estimateStripeFeeCents,
  platformFeeCentsFor,
  platformFeePercentFor,
} from "./platformFee.ts";

// Règle du 2026-10-10 : commission EasyPhysio + frais Stripe estimés = 15 %.

test("15 % tout compris sur les trois tarifs de lancement", () => {
  for (const price of [1999, 2999, 3999]) {
    const total = platformFeeCentsFor(price) + estimateStripeFeeCents(price);
    assert.equal(total, Math.round(price * 0.15), `tarif ${price}`);
  }
});

test("frais Stripe estimés : 1,5 % + 0,25 €", () => {
  assert.equal(estimateStripeFeeCents(2999), 70); // 44,985 + 25 → 70
  assert.equal(estimateStripeFeeCents(0), 0);
});

test("commission EasyPhysio : ce qui reste des 15 %", () => {
  assert.equal(platformFeeCentsFor(2999), 380); // 450 − 70
  assert.equal(platformFeePercentFor(2999), 12.67);
  assert.equal(platformFeePercentFor(1999), 12.26); // 245 / 1999
  assert.equal(platformFeePercentFor(3999), 12.88); // 515 / 3999
});

test("le pourcentage envoyé à Stripe redonne la commission au centime près", () => {
  for (let price = 1000; price <= 10000; price += 37) {
    const charged = Math.round((price * platformFeePercentFor(price)) / 100);
    assert.ok(Math.abs(charged - platformFeeCentsFor(price)) <= 1, `tarif ${price}`);
  }
});

test("tarif minuscule : jamais de commission négative", () => {
  assert.equal(platformFeeCentsFor(100), 0); // Stripe ≈ 27 c > 15 c
  assert.equal(platformFeePercentFor(100), 0);
  assert.equal(platformFeePercentFor(0), 0);
});

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

test("estimateMonthlySplit : une offre, 10 patients à 29,99 €", () => {
  const s = estimateMonthlySplit([{ priceCents: 2999, count: 10 }]);
  assert.equal(s.totalCents, 29990);
  assert.equal(s.stripeFeeCents, 700);
  assert.equal(s.platformFeeCents, 3800);
  assert.equal(s.netCents, 29990 - 4500);
});

test("estimateMonthlySplit : plusieurs offres se cumulent", () => {
  const s = estimateMonthlySplit([
    { priceCents: 1999, count: 2 },
    { priceCents: 2999, count: 1 },
    { priceCents: 3999, count: 0 },
  ]);
  assert.equal(s.totalCents, 1999 * 2 + 2999);
  assert.equal(s.platformFeeCents + s.stripeFeeCents, 300 * 2 + 450);
  assert.equal(s.netCents, s.totalCents - s.platformFeeCents - s.stripeFeeCents);
});

test("estimateMonthlySplit : aucun patient → tout à zéro", () => {
  const zero = { totalCents: 0, platformFeeCents: 0, stripeFeeCents: 0, netCents: 0 };
  assert.deepEqual(estimateMonthlySplit([{ priceCents: 2999, count: 0 }]), zero);
  assert.deepEqual(estimateMonthlySplit([]), zero);
});
