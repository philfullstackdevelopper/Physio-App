import { test } from "node:test";
import assert from "node:assert/strict";
import { localizeDbJson, localizingFetch } from "./dbContent.ts";

const FR_INSTR = "Assis bien droit. Tournez lentement la tête d'un côté le plus loin possible sans douleur, en gardant les épaules immobiles, revenez au centre, puis tournez de l'autre côté.";

test("anglais : consigne, pathologie et séance traduites ; nom d'exercice et texte du kiné intacts", async () => {
  type Row = { name: string; instructions?: string; workouts?: { name: string; description: string }[] };
  const rows: Row[] = [
    { name: "Active Cervical Rotation", instructions: FR_INSTR },
    { name: "Cervicalgie", workouts: [{ name: "Séance complète", description: "Ma consigne perso." }] },
  ];
  const out = (await localizeDbJson(structuredClone(rows), "en")) as Required<Row>[];
  assert.equal(out[0].name, "Active Cervical Rotation");
  assert.notEqual(out[0].instructions, FR_INSTR);
  assert.match(out[0].instructions, /head/i);
  assert.notEqual(out[1].name, "Cervicalgie");
  assert.notEqual(out[1].workouts[0].name, "Séance complète");
  assert.equal(out[1].workouts[0].description, "Ma consigne perso.");
});

test("français : un texte de la plateforme enregistré en anglais redevient français", async () => {
  const en = await localizeDbJson([{ name: "Séance complète" }], "en");
  const back = await localizeDbJson(structuredClone(en), "fr");
  assert.equal(back[0].name, "Séance complète");
});

test("fetch : seules les lectures (GET) sont traduites", async () => {
  const body = JSON.stringify([{ name: "Séance complète" }]);
  const base = (async () => new Response(body, { headers: { "content-type": "application/json" } })) as typeof fetch;
  const f = localizingFetch(() => "en", { base });
  const get = await (await f("http://x/rest/v1/workouts", { method: "GET" })).json();
  const post = await (await f("http://x/rest/v1/workouts", { method: "POST" })).json();
  assert.notEqual(get[0].name, "Séance complète");
  assert.equal(post[0].name, "Séance complète");
  const frBrowser = localizingFetch(() => "fr", { base, reverseInFrench: false });
  assert.equal((await (await frBrowser("http://x", {})).json())[0].name, "Séance complète");
});
