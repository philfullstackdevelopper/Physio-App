import { test } from "node:test";
import assert from "node:assert/strict";
import {
  canonicalExerciseNamesJson,
  frenchExerciseNamesJson,
  localizeDbJson,
  localizeDbText,
  localizingFetch,
  restTable,
} from "./dbContent.ts";

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

// ── Noms d'exercices en français (2026-11-08) ──────────────────────────────

const json = (body: unknown) => new Response(JSON.stringify(body), { headers: { "content-type": "application/json" } });

test("restTable : table d'une URL PostgREST", () => {
  assert.equal(restTable("http://x/rest/v1/exercises?select=id,name&order=name.asc"), "exercises");
  assert.equal(restTable("https://h/rest/v1/workouts?select=*,workout_exercises(exercises(name))"), "workouts");
  assert.equal(restTable("http://x/autre"), null);
});

test("français : lignes de la table exercises renommées, exercice d'un kiné intact, re-tri par nom", () => {
  const rows = [
    { id: "1", name: "Glute Bridge", created_by: null },
    { id: "2", name: "Quad Set" },
    { id: "3", name: "Glute Bridge", created_by: "kine-1" },
    { id: "4", name: "Mon exercice", created_by: "kine-1" },
  ];
  const out = frenchExerciseNamesJson(structuredClone(rows), "http://x/rest/v1/exercises?select=id,name&order=name.asc");
  assert.deepEqual(
    out.map((r) => r.name),
    ["Contraction du quadriceps", "Glute Bridge", "Mon exercice", "Pont fessier"],
  );
  // Sans order=name : l'ordre reçu est gardé.
  const kept = frenchExerciseNamesJson(structuredClone(rows), "http://x/rest/v1/exercises?select=id,name");
  assert.deepEqual(kept.map((r) => r.id), ["1", "2", "3", "4"]);
});

test("français : seuls les exercices imbriqués sont renommés, pas la séance ni la pathologie", () => {
  const rows = [
    {
      name: "Plank", // une séance qui s'appellerait comme un exercice
      conditions: { name: "Plank" },
      workout_exercises: [
        { position: 1, exercises: { name: "Plank" } },
        { position: 2, exercise: { id: "e", name: "Terminal Knee Extension (Band)" } },
      ],
    },
  ];
  const [w] = frenchExerciseNamesJson(structuredClone(rows), "http://x/rest/v1/workouts?select=name,conditions(name),workout_exercises(exercises(name))");
  assert.equal(w.name, "Plank");
  assert.equal(w.conditions.name, "Plank");
  assert.equal(w.workout_exercises[0].exercises!.name, "Planche");
  assert.equal(w.workout_exercises[1].exercise!.name, "Extension du genou à l'élastique");
});

test("français : exercise_results traduit à la lecture, remis en anglais à l'écriture", () => {
  const [r] = frenchExerciseNamesJson([{ exercise_name: "Heel Slide", status: "done" }], "http://x/rest/v1/exercise_results?select=*");
  assert.equal(r.exercise_name, "Glissement du talon");
  const sent = canonicalExerciseNamesJson([{ exercise_name: "Glissement du talon" }, { exercise_name: "Exercice perso" }], "http://x/rest/v1/exercise_results");
  assert.deepEqual(sent.map((x) => x.exercise_name), ["Heel Slide", "Exercice perso"]);
  // Autre table : rien ne change.
  assert.equal(canonicalExerciseNamesJson({ exercise_name: "Pont fessier" }, "http://x/rest/v1/patient_messages").exercise_name, "Pont fessier");
});

test("fetch français : noms d'exercices en français ; anglais : noms anglais conservés", async () => {
  let sentBody = "";
  const base = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    sentBody = typeof init?.body === "string" ? init.body : "";
    return json([{ name: "Glute Bridge", workout_exercises: [{ exercises: { name: "Bodyweight Squat" } }] }]);
  }) as typeof fetch;
  const url = "http://x/rest/v1/exercises?select=name";
  const fr = await (await localizingFetch(() => "fr", { base })(url, {})).json();
  assert.equal(fr[0].name, "Pont fessier");
  assert.equal(fr[0].workout_exercises[0].exercises.name, "Squat au poids du corps");
  const en = await (await localizingFetch(() => "en", { base })(url, {})).json();
  assert.equal(en[0].name, "Glute Bridge");
  assert.equal(en[0].workout_exercises[0].exercises.name, "Bodyweight Squat");
  // Requête sans rapport avec les exercices : réponse intacte.
  const other = await (await localizingFetch(() => "fr", { base })("http://x/rest/v1/patients?select=name", {})).json();
  assert.equal(other[0].name, "Glute Bridge");
  // Écriture française d'un résultat de séance : nom remis en anglais.
  await localizingFetch(() => "fr", { base })("http://x/rest/v1/exercise_results", {
    method: "POST",
    body: JSON.stringify([{ exercise_name: "Pont fessier", status: "done" }]),
  });
  assert.equal(JSON.parse(sentBody)[0].exercise_name, "Glute Bridge");
});
