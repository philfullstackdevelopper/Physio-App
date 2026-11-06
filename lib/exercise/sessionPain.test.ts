import { test } from "node:test";
import assert from "node:assert/strict";
import { sessionPainScore } from "./sessionPain.ts";

test("aucune douleur notée → null", () => {
  assert.equal(sessionPainScore([]), null);
  assert.equal(sessionPainScore([null, undefined, null]), null);
});

test("la plus forte douleur de la séance l'emporte", () => {
  assert.equal(sessionPainScore([2, null, 7, 4]), 7);
});

test("0 (aucune) devient 1 sur l'échelle 1–10", () => {
  assert.equal(sessionPainScore([0, 0]), 1);
  assert.equal(sessionPainScore([0, null]), 1);
});

test("10 reste 10", () => {
  assert.equal(sessionPainScore([10, 3]), 10);
});
