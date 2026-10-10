import { test } from "node:test";
import assert from "node:assert/strict";
import { signedSubscriptionMetadata, hasValidSubscriptionSignature } from "./subscriptionSignature.ts";

process.env.STRIPE_SECRET_KEY = "sk_test_cle_de_test";

test("une signature EasyPhysio est acceptée sur le bon compte", () => {
  const md = signedSubscriptionMetadata("patient-1", "premium", "acct_kine_a");
  assert.equal(hasValidSubscriptionSignature(md, "acct_kine_a"), true);
});

test("refusée si le kiné change l'offre, le patient ou le compte", () => {
  const md = signedSubscriptionMetadata("patient-1", "essentiel", "acct_kine_a");
  assert.equal(hasValidSubscriptionSignature({ ...md, plan: "premium" }, "acct_kine_a"), false);
  assert.equal(hasValidSubscriptionSignature({ ...md, user_id: "patient-2" }, "acct_kine_a"), false);
  assert.equal(hasValidSubscriptionSignature(md, "acct_kine_b"), false);
});

test("refusée sans signature ou avec une signature bidon", () => {
  assert.equal(hasValidSubscriptionSignature({ user_id: "patient-1", plan: "premium" }, "acct_kine_a"), false);
  assert.equal(hasValidSubscriptionSignature({ user_id: "patient-1", plan: "premium", sub_sig: "zz" }, "acct_kine_a"), false);
  assert.equal(hasValidSubscriptionSignature(null, "acct_kine_a"), false);
});
