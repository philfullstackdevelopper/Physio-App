import { test } from "node:test";
import assert from "node:assert/strict";
import {
  assessSignals,
  careWeek,
  currentStage,
  stageFromWeek,
  stageWithFeedback,
  weeksSince,
  type Rating,
} from "./stageProgress.ts";
import type { InjuryStage } from "./prescription.ts";

// Tests ajoutés à l'audit du 2026-10-08 : c'est la règle de sécurité clinique
// de l'appli — le frein ne peut que RALENTIR la progression, jamais la pousser.

const now = new Date("2026-10-08T12:00:00Z");
const weeksAgo = (w: number) => new Date(now.getTime() - w * 7 * 86_400_000).toISOString();
const r = (value: number, w = 0): Rating => ({ value, at: weeksAgo(w) });
const ORDER: InjuryStage[] = ["acute", "subacute", "recovery", "return_to_sport"];

test("calendrier : la phase avance avec les semaines écoulées", () => {
  assert.equal(stageFromWeek(0), "acute");
  assert.equal(stageFromWeek(1), "subacute");
  assert.equal(stageFromWeek(3), "recovery");
  assert.equal(stageFromWeek(4), "return_to_sport");
  assert.equal(currentStage("acute", weeksAgo(2), now), "recovery");
  assert.equal(careWeek("subacute", weeksAgo(2), now), 3);
  assert.equal(weeksSince(null, now), 0);
  assert.equal(weeksSince("pas une date", now), 0);
});

test("pas assez de ressentis : aucun avis, jamais de pénalité", () => {
  assert.deepEqual(assessSignals({ painScores: [r(9)], difficulties: [] }), { concerning: false, severe: false, cause: "" });
  const d = stageWithFeedback("acute", weeksAgo(5), { painScores: [r(9)], difficulties: [] }, now);
  assert.equal(d.stage, "return_to_sport");
  assert.equal(d.held, false);
});

test("douleur élevée : progression ralentie d'une phase", () => {
  const d = stageWithFeedback("acute", weeksAgo(2), { painScores: [r(6), r(7)], difficulties: [] }, now);
  assert.equal(d.stage, "subacute"); // calendrier : recovery
  assert.equal(d.held, true);
  assert.equal(d.concerning, true);
  assert.match(d.reason, /douleur élevée/);
});

test("douleur sévère : maintien à la phase déclarée", () => {
  const d = stageWithFeedback("acute", weeksAgo(5), { painScores: [r(8), r(9)], difficulties: [] }, now);
  assert.equal(d.stage, "acute");
  assert.match(d.reason, /maintien/);
});

test("déjà à sa phase déclarée : pas de recul, mais le kiné est alerté", () => {
  const d = stageWithFeedback("recovery", weeksAgo(0), { painScores: [r(9), r(9)], difficulties: [] }, now);
  assert.equal(d.stage, "recovery");
  assert.equal(d.held, false);
  assert.equal(d.concerning, true);
});

test("reprise progressive : une phase de plus par semaine depuis le dernier mauvais ressenti", () => {
  const signals = { painScores: [r(9, 2), r(2, 0), r(2, 0), r(2, 0)], difficulties: [] };
  const d = stageWithFeedback("acute", weeksAgo(6), signals, now);
  // Sévère il y a 2 semaines → plafond : phase déclarée + 2 = recovery.
  assert.equal(d.stage, "recovery");
  assert.equal(d.held, true);
  assert.equal(d.concerning, false);
  assert.match(d.reason, /remontée progressive/);
});

test("valeurs hors échelle ignorées (ni 0, ni 11, ni NaN)", () => {
  assert.equal(assessSignals({ painScores: [r(0), r(11), r(Number.NaN)], difficulties: [] }).concerning, false);
});

test("RÈGLE DE SÉCURITÉ : jamais au-delà du calendrier, jamais en deçà de la phase déclarée", () => {
  for (const declared of ORDER) {
    for (const weeks of [0, 1, 2, 3, 4, 8]) {
      for (const pain of [[], [1, 1], [5, 6], [6, 7], [8, 9], [10, 10]]) {
        for (const ageWeeks of [0, 1, 3]) {
          for (const diff of [[], [8, 9], [2, 3]]) {
            const signals = { painScores: pain.map((v) => r(v, ageWeeks)), difficulties: diff.map((v) => r(v, ageWeeks)) };
            const d = stageWithFeedback(declared, weeksAgo(weeks), signals, now);
            const got = ORDER.indexOf(d.stage);
            const calendar = ORDER.indexOf(currentStage(declared, weeksAgo(weeks), now));
            assert.ok(got <= calendar, `poussé au-delà du calendrier : ${declared}, ${weeks} sem., douleur ${pain}`);
            assert.ok(got >= ORDER.indexOf(declared), `renvoyé avant la phase déclarée : ${declared}, douleur ${pain}`);
            assert.equal(d.held, got < calendar);
          }
        }
      }
    }
  }
});
