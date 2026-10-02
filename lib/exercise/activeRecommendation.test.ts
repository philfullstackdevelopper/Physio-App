import { test } from "node:test";
import assert from "node:assert/strict";
import { addWeeksToKey, resolveWorkoutForWeek } from "./activeRecommendation.ts";

// Lundis consécutifs.
const W1 = "2026-09-07";
const W2 = "2026-09-14";
const W3 = "2026-09-21";
const W4 = "2026-09-28";
const W5 = "2026-10-05";

test("addWeeksToKey traverse le changement d'heure d'octobre sans dériver", () => {
  assert.equal(addWeeksToKey("2026-10-19", 1), "2026-10-26");
  assert.equal(addWeeksToKey(W1, 3), W4);
});

test("sans durée : la séance reste en place jusqu'à la suivante (comportement d'avant)", () => {
  const a = [{ workoutId: "A", weekStartDate: W1 }];
  assert.equal(resolveWorkoutForWeek(a, W5), "A");
});

test("pendant 3 semaines : semaines 1 à 3, puis plus rien", () => {
  const a = [{ workoutId: "A", weekStartDate: W1, weekCount: 3 }];
  assert.equal(resolveWorkoutForWeek(a, W1), "A");
  assert.equal(resolveWorkoutForWeek(a, W3), "A");
  assert.equal(resolveWorkoutForWeek(a, W4), null);
});

test("une séance attribuée plus tard prend le relais, même avant la fin de la précédente", () => {
  const a = [
    { workoutId: "A", weekStartDate: W1, weekCount: 4 },
    { workoutId: "B", weekStartDate: W2, weekCount: 1 },
  ];
  assert.equal(resolveWorkoutForWeek(a, W2), "B");
  // B est finie : on ne « ressuscite » pas A, la dernière attribution décide.
  assert.equal(resolveWorkoutForWeek(a, W3), null);
});

test("avant toute attribution → rien", () => {
  assert.equal(resolveWorkoutForWeek([{ workoutId: "A", weekStartDate: W2, weekCount: 2 }], W1), null);
});
