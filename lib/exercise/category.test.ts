import { test } from "node:test";
import assert from "node:assert/strict";
import { mainBodyPartId } from "./category.ts";

const parts = [
  { id: "genou", position: 2 },
  { id: "cheville", position: 1 },
  { id: "equilibre", position: 9 },
];

test("zone la plus fréquente parmi les exercices de la condition", () => {
  assert.equal(mainBodyPartId([["genou"], ["genou", "equilibre"], ["cheville"]], parts), "genou");
});

test("à égalité, la première dans l'ordre des zones", () => {
  assert.equal(mainBodyPartId([["genou"], ["cheville"]], parts), "cheville");
});

test("une zone répétée sur le même exercice ne compte qu'une fois", () => {
  assert.equal(mainBodyPartId([["equilibre", "equilibre"], ["genou"]], parts), "genou");
});

test("aucun exercice ou zones inconnues : pas de zone", () => {
  assert.equal(mainBodyPartId([], parts), null);
  assert.equal(mainBodyPartId([["inconnue"]], parts), null);
});
