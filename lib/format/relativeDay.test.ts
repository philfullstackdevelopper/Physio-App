import { test } from "node:test";
import assert from "node:assert/strict";
import { relativeDay, daysBetween } from "./relativeDay.ts";

const now = new Date(2026, 8, 3, 15, 0); // mercredi 3 septembre 2026, 15h

test("aujourd'hui, même à minuit passé", () => {
  assert.equal(relativeDay(new Date(2026, 8, 3, 0, 5).toISOString(), now), "Aujourd'hui");
});

test("hier, même tard le soir", () => {
  assert.equal(relativeDay(new Date(2026, 8, 2, 23, 50).toISOString(), now), "Hier");
});

test("il y a N jours de 2 à 6", () => {
  assert.equal(relativeDay(new Date(2026, 8, 1).toISOString(), now), "Il y a 2 jours");
  assert.equal(relativeDay(new Date(2026, 7, 28).toISOString(), now), "Il y a 6 jours");
});

test("date courte au-delà de 6 jours", () => {
  assert.equal(relativeDay(new Date(2026, 7, 27).toISOString(), now), "Jeu. 27 août");
});

test("date courte : le point du mois abrégé est conservé (janv., sept., ...)", () => {
  assert.equal(relativeDay(new Date(2026, 0, 15).toISOString(), now), "Jeu. 15 janv.");
});

test("jamais quand null", () => {
  assert.equal(relativeDay(null, now), "Jamais");
  assert.equal(relativeDay(undefined, now), "Jamais");
});

test("daysBetween compte des jours calendaires locaux", () => {
  assert.equal(daysBetween(new Date(2026, 8, 3, 0, 1).toISOString(), now), 0);
  assert.equal(daysBetween(new Date(2026, 8, 2, 23, 59).toISOString(), now), 1);
  assert.equal(daysBetween(new Date(2026, 7, 27, 12).toISOString(), now), 7);
});
