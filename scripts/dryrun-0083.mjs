// Essai à blanc de 0083 (appli mobile) : applique la migration dans une
// transaction, joue les règles avec de vrais comptes, puis ANNULE tout.
//   node --env-file=.env.local scripts/dryrun-0083.mjs
import fs from "node:fs";
import pg from "pg";

const sql = fs.readFileSync(new URL("../supabase/migrations/0083_mobile_app.sql", import.meta.url), "utf8");
const client = new pg.Client({ connectionString: process.env.SCALINGO_DATABASE_URL, ssl: { rejectUnauthorized: false } });
await client.connect();
let failures = 0;
const ok = (label, cond, detail = "") => {
  console.log(`${cond ? "OK  " : "ÉCHEC"} ${label}${detail ? ` (${detail})` : ""}`);
  if (!cond) failures++;
};
let sp = 0;
async function as(clerkId, text, params = []) {
  const name = `sp${++sp}`;
  await client.query(`savepoint ${name}`);
  try {
    await client.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: clerkId })]);
    const res = await client.query(text, params);
    await client.query(`release savepoint ${name}`);
    return { rows: res.rows };
  } catch (e) {
    await client.query(`rollback to savepoint ${name}`);
    return { error: e.message };
  }
}
try {
  await client.query("begin");
  await client.query(sql);
  console.log("Migration appliquée (dans la transaction).");

  await client.query("select set_config('app.admin_bypass', 'app_users', true)");
  const users = (await client.query("select app_id, clerk_id from public.app_users")).rows;
  const clerk = new Map(users.map((r) => [r.app_id, r.clerk_id]));
  await client.query("select set_config('app.admin_bypass', 'admin_read', true)");
  const pats = (await client.query("select p.id, p.instructor_id from public.patients p join public.instructors i on i.id = p.instructor_id where i.status = 'approved'")).rows.filter((r) => r.id !== r.instructor_id && clerk.get(r.id) && clerk.get(r.instructor_id));
  const kines = (await client.query("select id from public.instructors where status = 'approved'")).rows.filter((r) => clerk.get(r.id));
  await client.query("select set_config('app.admin_bypass', '', true)");
  if (!pats.length) throw new Error("Aucun patient avec compte de connexion pour l'essai.");
  const A = { id: pats[0].instructor_id, clerk: clerk.get(pats[0].instructor_id) };
  const Bid = kines.find((k) => k.id !== A.id && k.id !== pats[0].id).id;
  const B = { id: Bid, clerk: clerk.get(Bid) };
  const P = { id: pats[0].id, clerk: clerk.get(pats[0].id) };

  await client.query("select internal.register_push_token($1, $2, 'ios')", [P.id, "ExponentPushToken[essai-patient-0001]"]);
  await client.query("select internal.register_push_token($1, $2, 'android')", [A.id, "ExponentPushToken[essai-kine-00001]"]);
  const mine = await as(P.clerk, "select token from public.push_tokens");
  ok("Le patient voit son seul téléphone", mine.rows?.length === 1, mine.error);
  const other = await as(B.clerk, "select token from public.push_tokens");
  ok("Un autre kiné ne voit aucun téléphone", other.rows?.length === 0, other.error);
  const forge = await as(B.clerk, "insert into public.push_tokens (token, app_user_id, platform) values ('ExponentPushToken[pirate-0001]', $1, 'ios')", [P.id]);
  ok("Personne n'écrit de téléphone depuis le navigateur", !!forge.error, forge.error);
  await client.query("select internal.register_push_token($1, $2, 'ios')", [B.id, "ExponentPushToken[essai-patient-0001]"]);
  const moved = (await client.query("select * from internal.push_tokens_for($1)", [[P.id, B.id]])).rows;
  ok("Un téléphone qui change de compte passe au nouveau compte", moved.length === 1 && moved[0].app_user_id === B.id);
  await client.query("select internal.unregister_push_token($1, $2)", [P.id, "ExponentPushToken[essai-patient-0001]"]);
  ok("Déconnexion d'un autre compte : le jeton reste à son propriétaire", (await client.query("select * from internal.push_tokens_for($1)", [[B.id]])).rows.length === 1);
  await client.query("select internal.register_push_token($1, $2, 'ios')", [P.id, "ExponentPushToken[essai-patient-0001]"]);
  const targets = (await client.query("select * from internal.push_reminder_targets()")).rows;
  ok("La liste des rappels fonctionne", Array.isArray(targets), `${targets.length} téléphone(s) à rappeler`);
  await client.query("select set_config('app.admin_bypass', 'admin_read', true)");
  const patientIds = new Set((await client.query("select id from public.patients")).rows.map((r) => r.id));
  await client.query("select set_config('app.admin_bypass', '', true)");
  ok("Les rappels ne visent que des patients", targets.every((t) => patientIds.has(t.app_user_id)));
  await client.query("select internal.forget_push_tokens($1)", [["ExponentPushToken[essai-kine-00001]"]]);
  ok("Un jeton refusé est oublié", (await client.query("select * from internal.push_tokens_for($1)", [[A.id]])).rows.length === 0);

  await client.query("select internal.request_account_deletion($1, 'essai')", [A.id]);
  const own = await as(A.clerk, "select instructor_id from public.account_deletion_requests");
  ok("Le kiné voit sa demande de suppression", own.rows?.length === 1, own.error);
  const notOwn = await as(B.clerk, "select instructor_id from public.account_deletion_requests");
  ok("Un autre kiné ne la voit pas", notOwn.rows?.length === 0, notOwn.error);
  const list = (await client.query("select * from internal.admin_list_account_deletions()")).rows;
  ok("/admin voit la demande", list.some((r) => r.instructor_id === A.id));
  await client.query("select internal.cancel_account_deletion($1)", [A.id]);
  ok("La demande peut être annulée", (await client.query("select * from internal.admin_list_account_deletions()")).rows.every((r) => r.instructor_id !== A.id));

  await client.query(sql);
  console.log("Deuxième application : OK (migration rejouable)");
} catch (e) {
  failures++;
  console.error("ERREUR :", e.message);
} finally {
  await client.query("rollback");
  await client.end();
  console.log(`ROLLBACK : rien n'a été gardé. ${failures === 0 ? "Tous les essais passent." : `${failures} essai(s) en échec.`}`);
}
