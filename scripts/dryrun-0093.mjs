// Essai à blanc de 0093 (vue « Activité » de /admin) : applique la migration
// dans une transaction, appelle les deux fonctions, vérifie qu'aucune règle
// d'accès n'a changé, puis ANNULE tout.
//   Local :    node --env-file=.env.local scripts/dryrun-0093.mjs
//   Scalingo : scalingo --region osc-fr1 --app easyphysio run \
//                --file scripts/dryrun-0093.mjs --file supabase/migrations/0093_admin_activity.sql \
//                node /tmp/uploads/dryrun-0093.mjs /tmp/uploads/0093_admin_activity.sql
import fs from "node:fs";
import { createRequire } from "node:module";

// Dans un conteneur Scalingo, le script est hors de /app : on charge « pg »
// depuis l'appli.
const require = createRequire(fs.existsSync("/app/package.json") ? "/app/package.json" : import.meta.url);
const pg = require("pg");

const sqlPath = process.argv[2] ?? new URL("../supabase/migrations/0093_admin_activity.sql", import.meta.url);
const sql = fs.readFileSync(sqlPath, "utf8");
const url = process.env.SCALINGO_DATABASE_URL ?? process.env.SCALINGO_POSTGRESQL_URL;
const client = new pg.Client({ connectionString: url, ssl: url?.includes("127.0.0.1") ? { rejectUnauthorized: false } : undefined });
await client.connect();
let failures = 0;
const ok = (label, cond, detail = "") => {
  console.log(`${cond ? "OK  " : "ÉCHEC"} ${label}${detail ? ` (${detail})` : ""}`);
  if (!cond) failures++;
};
const policies = async () =>
  (await client.query("select schemaname, tablename, policyname, qual, with_check from pg_policies order by 1, 2, 3")).rows
    .map((r) => JSON.stringify(r))
    .join("\n");

try {
  await client.query("begin");
  const before = await policies();
  await client.query(sql);
  console.log("Migration appliquée (dans la transaction).");
  ok("aucune règle d'accès ajoutée ni modifiée", (await policies()) === before);

  const pats = (await client.query("select * from internal.admin_activity_patients()")).rows;
  const kines = (await client.query("select * from internal.admin_activity_instructors()")).rows;
  ok("laissez-passer remis à zéro après lecture", (await client.query("select current_setting('app.admin_bypass', true) as v")).rows[0].v === "");

  await client.query("select set_config('app.admin_bypass', 'admin_read', true)");
  const nPat = (await client.query("select count(*)::int as n from public.patients")).rows[0].n;
  const nKine = (await client.query("select count(*)::int as n from public.instructors")).rows[0].n;
  const nLogs = (await client.query("select count(*)::int as n from public.workout_logs")).rows[0].n;
  await client.query("select set_config('app.admin_bypass', '', true)");
  ok("un rang par patient", pats.length === nPat, `${pats.length} / ${nPat}`);
  ok("un rang par kiné", kines.length === nKine, `${kines.length} / ${nKine}`);
  ok(
    "toutes les séances faites sont comptées",
    pats.reduce((s, r) => s + r.sessions_total, 0) === nLogs,
    `${pats.reduce((s, r) => s + r.sessions_total, 0)} / ${nLogs}`,
  );
  ok("7 j ≤ 30 j ≤ total pour chaque patient", pats.every((r) => r.sessions_7d <= r.sessions_30d && r.sessions_30d <= r.sessions_total));

  // Résumé anonyme (aucun nom, aucun e-mail affiché).
  const real = pats.filter((r) => !r.is_test);
  console.log(
    `\nRésumé : ${kines.filter((k) => !k.is_test).length} kinés réels, ${real.length} patients réels, ` +
      `${real.filter((r) => r.sessions_total > 0).length} ont fait au moins une séance, ` +
      `${real.filter((r) => r.sessions_7d > 0).length} cette semaine, ` +
      `${real.filter((r) => r.push_platforms.length > 0).length} joignables par notification ; ` +
      `${pats.length - real.length} patients et ${kines.filter((k) => k.is_test).length} kinés de test.`,
  );

  // Sans laissez-passer, une connexion ordinaire ne voit rien des patients.
  const { rows: plain } = await client.query("select count(*)::int as n from public.patients");
  ok("sans laissez-passer, les tables restent fermées", plain[0].n === 0, `${plain[0].n} rang(s) visibles`);
} catch (e) {
  failures++;
  console.error("ERREUR :", e.message);
} finally {
  await client.query("rollback");
  await client.end();
  console.log(`\nTout est annulé (rollback). ${failures === 0 ? "Aucun échec." : `${failures} échec(s).`}`);
  process.exitCode = failures ? 1 : 0;
}
