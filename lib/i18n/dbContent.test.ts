import { test } from "node:test";
import assert from "node:assert/strict";
import { localizeDbJson, localizeDbText, localizingFetch } from "./dbContent.ts";

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

test("français : rien n'est transformé (même un nom de kiné qui ressemble à une traduction)", async () => {
  const [en] = await localizeDbJson([{ name: "Séance complète" }], "en");
  const back = await localizeDbJson([{ name: en.name }], "fr");
  assert.equal(back[0].name, en.name);
});

test("localizeDbText : français ↔ anglais dans les deux sens", async () => {
  const en = await localizeDbText("Séance complète", "en");
  assert.notEqual(en, "Séance complète");
  assert.equal(await localizeDbText(en, "fr"), "Séance complète");
  assert.equal(await localizeDbText("Séance complète", "fr"), "Séance complète");
  assert.equal(await localizeDbText("Ma séance perso", "en"), "Ma séance perso");
});

test("fetch anglais : lecture traduite, écriture remise en français", async () => {
  const [enRow] = await localizeDbJson([{ name: "Séance complète" }], "en");
  let sentBody = "";
  const base = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    sentBody = typeof init?.body === "string" ? init.body : "";
    return new Response(JSON.stringify([{ name: "Séance complète" }]), { headers: { "content-type": "application/json" } });
  }) as typeof fetch;
  const f = localizingFetch(() => "en", { base });
  const get = await (await f("http://x/rest/v1/workouts", { method: "GET" })).json();
  assert.equal(get[0].name, enRow.name);
  await f("http://x/rest/v1/workouts", { method: "POST", body: JSON.stringify({ name: enRow.name, description: "Mine" }) });
  assert.deepEqual(JSON.parse(sentBody), { name: "Séance complète", description: "Mine" });
});

test("fetch français : ni lecture ni écriture transformées", async () => {
  let sentBody = "";
  const base = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    sentBody = typeof init?.body === "string" ? init.body : "";
    return new Response(JSON.stringify([{ name: "Full session" }]), { headers: { "content-type": "application/json" } });
  }) as typeof fetch;
  const f = localizingFetch(() => "fr", { base });
  assert.equal((await (await f("http://x", {})).json())[0].name, "Full session");
  await f("http://x", { method: "PATCH", body: JSON.stringify({ name: "Full session" }) });
  assert.equal(JSON.parse(sentBody).name, "Full session");
});
