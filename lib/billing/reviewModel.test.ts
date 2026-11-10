import { test } from "node:test";
import assert from "node:assert/strict";
import {
  periodLastDay,
  csvCell,
  estimateStripeFeeCents,
  feeNoteNumber,
  feeNotePatientName,
  nextPeriod,
  periodLabel,
  periodOf,
  previousPeriod,
} from "./reviewModel.ts";

test("note d'honoraires : nom actuel du patient, sinon le nom recopié sur la note (patient supprimé)", () => {
  assert.equal(feeNotePatientName({ currentName: "Claire Dupont", nameOnNote: "Claire Dupond", fallback: "Patient" }), "Claire Dupont");
  assert.equal(feeNotePatientName({ currentName: null, nameOnNote: "Claire Dupont", fallback: "Patient" }), "Claire Dupont");
  assert.equal(feeNotePatientName({ currentName: null, nameOnNote: null, fallback: "Patient" }), "Patient");
  assert.equal(feeNotePatientName({ currentName: "  ", nameOnNote: "", fallback: "Patient" }), "Patient");
});

test("mois : heure de Paris, passage d'année", () => {
  // 31 octobre 23 h 30 UTC = 1er novembre 0 h 30 à Paris.
  assert.equal(periodOf(new Date("2026-10-31T23:30:00Z")), "2026-11-01");
  assert.equal(periodOf(new Date("2026-10-15T12:00:00Z")), "2026-10-01");
  assert.equal(nextPeriod("2026-12-01"), "2027-01-01");
  assert.equal(nextPeriod("2026-09-01"), "2026-10-01");
  assert.equal(previousPeriod("2027-01-01"), "2026-12-01");
  assert.equal(periodLabel("2026-10-01"), "octobre 2026");
});

test("numéro de note d'honoraires", () => {
  assert.equal(feeNoteNumber(2026, 7), "2026-0007");
  assert.equal(feeNoteNumber(2027, 1234), "2027-1234");
});

test("période prépayée : dernier jour", () => {
  assert.equal(periodLastDay("2026-11-01", 1), "2026-11-30");
  assert.equal(periodLastDay("2026-11-01", 3), "2027-01-31");
  assert.equal(periodLastDay("2026-12-01", 12), "2027-11-30");
});

test("frais Stripe estimés : 1,5 % + 0,25 €, rien pour 0 €", () => {
  assert.equal(estimateStripeFeeCents(600), 34);
  assert.equal(estimateStripeFeeCents(0), 0);
});

test("CSV : guillemets seulement quand il le faut", () => {
  assert.equal(csvCell("Dupont"), "Dupont");
  assert.equal(csvCell('Bilan ; "ok"'), '"Bilan ; ""ok"""');
  assert.equal(csvCell(null), "");
  assert.equal(csvCell(20), "20");
});
