import { test } from "node:test";
import assert from "node:assert/strict";
import { groupByDay } from "./messageDays.ts";

const now = new Date(2026, 8, 4, 15, 0, 0); // 4 septembre 2026, heure locale

test("groupByDay : Aujourd'hui, Hier, puis date longue, ordre conservé", () => {
  const msgs = [
    { id: "a", created_at: new Date(2026, 8, 1, 9, 0).toISOString() },
    { id: "b", created_at: new Date(2026, 8, 3, 9, 0).toISOString() },
    { id: "c", created_at: new Date(2026, 8, 3, 18, 0).toISOString() },
    { id: "d", created_at: new Date(2026, 8, 4, 10, 0).toISOString() },
  ];
  const groups = groupByDay(msgs, now);
  assert.deepEqual(groups.map((g) => g.label), ["Mardi 1 septembre", "Hier", "Aujourd'hui"]);
  assert.deepEqual(groups.map((g) => g.items.map((m) => m.id)), [["a"], ["b", "c"], ["d"]]);
});

test("groupByDay : liste vide", () => {
  assert.deepEqual(groupByDay([], now), []);
});
