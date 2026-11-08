// Essai à blanc des migrations 0085 (cabinets), 0086 (Stripe) et 0087 (QR code) :
// appliquées ensemble deux fois dans une transaction, quelques contrôles,
// puis TOUT EST ANNULÉ.
//   node --env-file=.env.local scripts/dryrun-0085-0087.mjs
import fs from "node:fs";
import pg from "pg";

const files = ["0085_cabinets.sql", "0086_stripe_audit.sql", "0087_join_link_safety.sql"];
const client = new pg.Client({ connectionString: process.env.SCALINGO_DATABASE_URL, ssl: { rejectUnauthorized: false } });
await client.connect();
let failures = 0;
const ok = (label, cond, detail = "") => {
  console.log(`${cond ? "OK  " : "ÉCHEC"} ${label}${detail ? ` (${detail})` : ""}`);
  if (!cond) failures++;
};
async function tryQ(sql, params = []) {
  await client.query("savepoint t");
  try {
    const r = await client.query(sql, params);
    await client.query("release savepoint t");
    return { rows: r.rows };
  } catch (e) {
    await client.query("rollback to savepoint t");
    return { error: e.message };
  }
}
try {
  await client.query("begin");
  for (const round of [1, 2]) {
    for (const f of files) {
      const sql = fs.readFileSync(new URL(`../supabase/migrations/${f}`, import.meta.url), "utf8");
      const r = await tryQ(sql);
      ok(`${f} appliquée (passage ${round})`, !r.error, r.error);
    }
  }
  const status = await tryQ("insert into public.monthly_reviews (payment_status) values ('nimporte')");
  ok("0086 : un état d'honoraires inconnu est refusé", !!status.error);
  const deauth = await tryQ("select internal.connect_account_deauthorized('acct_inexistant_essai')");
  ok("0086 : déconnexion Stripe d'un compte inconnu sans erreur", !deauth.error, deauth.error);
  await client.query("select set_config('app.admin_bypass', 'admin_read', true)");
  const k = (await client.query("select id from public.instructors limit 1")).rows[0];
  await client.query("select set_config('app.admin_bypass', '', true)");
  const name = await tryQ("select internal.join_link_pending_patient_name($1, 'personne@exemple.invalid') as n", [k.id]);
  ok("0087 : nom d'un patient en attente (aucun) → vide", !name.error && !name.rows[0].n, name.error);
  const undo = await tryQ("select internal.join_link_undo($1, gen_random_uuid())", [k.id]);
  ok("0087 : annulation sur un patient inexistant sans effet", !undo.error, undo.error);
  const join = await tryQ("select internal.join_patient_by_link($1, gen_random_uuid(), 'essai-0087@exemple.invalid', 'Essai')", [k.id]);
  ok("0087 : inscription par QR code toujours possible", !join.error, join.error ?? JSON.stringify(join.rows?.[0]));
} catch (e) {
  failures++;
  console.log("ERREUR", e.message);
} finally {
  await client.query("rollback");
  await client.end();
  console.log(failures ? `${failures} échec(s) — rien n'a été enregistré.` : "Tout est OK — rien n'a été enregistré (annulé).");
}
