import { test } from "node:test";
import assert from "node:assert/strict";
import { buildPainSeries } from "./painHistory.ts";

const now = new Date(2026, 8, 3, 12);
const at = (daysAgo: number) => new Date(now.getTime() - daysAgo * 86_400_000).toISOString();

test("points ordonnés dans le temps, x entre 0 et 1, notes nulles ignorées", () => {
  const s = buildPainSeries([
    { pain_score: 7, created_at: at(2) },
    { pain_score: null, created_at: at(1) },
    { pain_score: 4, created_at: at(10) },
    { pain_score: 9, created_at: at(40) }, // hors fenêtre
  ], now);
  assert.deepEqual(s.points.map((p) => p.score), [4, 7]);
  assert.ok(s.points[0].x < s.points[1].x);
  assert.ok(s.points.every((p) => p.x >= 0 && p.x <= 1));
  assert.equal(s.latest, 7);
  assert.equal(s.previous, 4);
});

test("fenêtre de 0 jour → pas de division par zéro, x fini", () => {
  const s = buildPainSeries([{ pain_score: 5, created_at: now.toISOString() }], now, 0);
  assert.equal(s.points.length, 1);
  assert.ok(Number.isFinite(s.points[0].x));
  assert.ok(s.points[0].x >= 0 && s.points[0].x <= 1);
});

test("sans note → série vide et latest/previous null", () => {
  const s = buildPainSeries([], now);
  assert.deepEqual(s.points, []);
  assert.equal(s.latest, null);
  assert.equal(s.previous, null);
  assert.equal(s.ticks.length, 6);
});
