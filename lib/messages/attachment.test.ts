import { test } from "node:test";
import assert from "node:assert/strict";
import { attachmentPath, isAttachmentPathFor } from "./attachment.ts";

test("attachmentPath : sous le dossier du patient, nom nettoyé", () => {
  const p = attachmentPath("p1", "mon fichier (1).pdf");
  assert.ok(p.startsWith("p1/"));
  assert.ok(p.endsWith("-mon_fichier_1_.pdf"));
});

test("isAttachmentPathFor : refuse un autre patient ou une traversée", () => {
  assert.equal(isAttachmentPathFor("p1/abc-x.pdf", "p1"), true);
  assert.equal(isAttachmentPathFor("p2/abc-x.pdf", "p1"), false);
  assert.equal(isAttachmentPathFor("p1/../p2/x.pdf", "p1"), false);
  assert.equal(isAttachmentPathFor("p1/", "p1"), false);
});
