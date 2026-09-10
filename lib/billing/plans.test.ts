import { test } from "node:test";
import assert from "node:assert/strict";
import { TIERS, TIER_KEYS, isTierKey, resolveTierPrices } from "./plans.ts";

test("TIERS : trois offres, prix croissants, plafonds du spec", () => {
  assert.deepEqual(TIER_KEYS, ["essentiel", "standard", "premium"]);
  assert.equal(TIERS.essentiel.amount, 1999);
  assert.equal(TIERS.standard.amount, 3499);
  assert.equal(TIERS.premium.amount, 4999);
  assert.equal(TIERS.essentiel.weeklyCap, 1);
  assert.equal(TIERS.standard.weeklyCap, 3);
  assert.equal(TIERS.premium.weeklyCap, null);
  assert.equal(TIERS.premium.videoLibrary, true);
  assert.equal(TIERS.standard.videoLibrary, false);
  for (const k of TIER_KEYS) assert.equal(TIERS[k].key, k);
});

test("isTierKey : accepte les trois clés, refuse le reste", () => {
  assert.equal(isTierKey("essentiel"), true);
  assert.equal(isTierKey("premium"), true);
  assert.equal(isTierKey("patient_monthly"), false);
  assert.equal(isTierKey(""), false);
  assert.equal(isTierKey(null), false);
  assert.equal(isTierKey(42), false);
});

test("resolveTierPrices : défauts quand le kiné n'a rien fixé", () => {
  assert.deepEqual(resolveTierPrices(null), { essentiel: 1999, standard: 3499, premium: 4999 });
  assert.deepEqual(
    resolveTierPrices({ tier_essentiel_cents: null, tier_standard_cents: null, tier_premium_cents: null }),
    { essentiel: 1999, standard: 3499, premium: 4999 },
  );
});

test("resolveTierPrices : un prix kiné remplace le défaut, offre par offre", () => {
  assert.deepEqual(
    resolveTierPrices({ tier_essentiel_cents: null, tier_standard_cents: 2900, tier_premium_cents: 6000 }),
    { essentiel: 1999, standard: 2900, premium: 6000 },
  );
});
