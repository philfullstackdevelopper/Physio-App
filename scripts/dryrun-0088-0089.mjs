// Essai à blanc des migrations 0088 (sécurité, audit du 2026-11-10) et 0089
// (facturation) : appliquées deux fois dans une transaction, contrôles avec
// des comptes d'essai fictifs créés pour l'occasion, puis TOUT EST ANNULÉ.
// Rien n'est enregistré, aucune donnée réelle n'est modifiée.
//   node --env-file=<chemin>/.env.local scripts/dryrun-0088-0089.mjs
import fs from "node:fs";
import pg from "pg";

// AVEC_0087=1 : rejoue aussi 0087 (encore en attente sur Scalingo) avant, dans l'ordre réel de mise en ligne.
const files = [...(process.env.AVEC_0087 ? ["0087_join_link_safety.sql"] : []), "0088_security_audit.sql", "0089_billing_audit.sql"];
const client = new pg.Client({ connectionString: process.env.SCALINGO_DATABASE_URL, ssl: { rejectUnauthorized: false } });
await client.connect();
const notices = [];
client.on("notice", (n) => notices.push(n.message));

let failures = 0;
const ok = (label, cond, detail = "") => {
  console.log(`${cond ? "OK   " : "ÉCHEC"} ${label}${detail ? ` (${detail})` : ""}`);
  if (!cond) failures++;
};
async function q(sql, params = []) {
  await client.query("savepoint t");
  try {
    const r = await client.query(sql, params);
    await client.query("release savepoint t");
    return { rows: r.rows, count: r.rowCount };
  } catch (e) {
    await client.query("rollback to savepoint t");
    return { error: e.message };
  }
}
const pass = (v) => client.query("select set_config('app.admin_bypass', $1, true)", [v]);
const as = (clerkId) =>
  client.query("select set_config('request.jwt.claims', $1, true)", [clerkId ? JSON.stringify({ sub: clerkId }) : ""]);
const one = async (sql, params = []) => {
  const r = await q(sql, params);
  if (r.error) throw new Error(`${sql} → ${r.error}`);
  return r.rows[0];
};

try {
  await client.query("begin");

  // Comptes réels avant (pour vérifier que rien ne disparaît).
  await pass("admin_read");
  const before = await one(
    "select (select count(*) from public.patients)::int p, (select count(*) from public.instructors)::int k, (select count(*) from public.monthly_reviews)::int r",
  );
  await pass("");

  for (const round of [1, 2]) {
    for (const f of files) {
      const sql = fs.readFileSync(new URL(`../supabase/migrations/${f}`, import.meta.url), "utf8");
      const r = await q(sql);
      ok(`${f} appliquée (passage ${round})`, !r.error, r.error);
    }
  }
  const unprotected = notices.filter((n) => n.startsWith("ATTENTION"));
  const forced = [...new Set(notices.filter((n) => n.startsWith("RLS forcé")))];
  console.log(`      RLS forcé posé par 0088 sur : ${forced.length ? forced.map((n) => n.replace("RLS forcé posé sur ", "")).join(", ") : "aucune table (déjà toutes forcées)"}`);
  if (unprotected.length) console.log(`      ${[...new Set(unprotected)].join("\n      ")}`);

  await pass("admin_read");
  const after = await one(
    "select (select count(*) from public.patients)::int p, (select count(*) from public.instructors)::int k, (select count(*) from public.monthly_reviews)::int r",
  );
  await pass("");
  ok("aucune fiche réelle perdue", JSON.stringify(before) === JSON.stringify(after), `${JSON.stringify(before)} → ${JSON.stringify(after)}`);

  // --- Comptes d'essai fictifs (annulés à la fin) ---------------------------
  const kA = (await one("select internal.admin_create_test_instructor('essai-a-0088@exemple.invalid', 'Essai A') as id")).id;
  const kB = (await one("select internal.admin_create_test_instructor('essai-b-0088@exemple.invalid', 'Essai B') as id")).id;
  await pass("app_users");
  await client.query("update public.app_users set clerk_id = 'essai_clerk_a' where app_id = $1", [kA]);
  await client.query("update public.app_users set clerk_id = 'essai_clerk_b' where app_id = $1", [kB]);
  await pass("");

  await as("essai_clerk_a");
  const me = await one("select public.current_app_user_id() as id");
  ok("session simulée du kiné A", me.id === kA);

  // B1 : fiche « patient » portant l'identifiant d'un autre kiné.
  const b1 = await q("insert into public.patients (id, instructor_id, email, full_name) values ($1, $2, 'essai-b-0088@exemple.invalid', 'x')", [kB, kA]);
  ok("B1 : un kiné ne peut pas créer une fiche patient avec l'identifiant d'un autre kiné", !!b1.error, b1.error);
  const b1self = await q("insert into public.patients (id, instructor_id, email, full_name) values ($1, $1, 'essai-a-0088@exemple.invalid', 'x')", [kA]);
  ok("B1 : ni avec son propre identifiant", !!b1self.error);

  // B2 : création normale (comme « Ajouter un patient ») avec champs forcés.
  await as(null);
  const pid = (await one("select app_id from internal.precreate_app_user('essai-p-0088@exemple.invalid')")).app_id;
  const other = (await one("select app_id from internal.precreate_app_user('essai-q-0088@exemple.invalid')")).app_id;
  await as("essai_clerk_a");
  const add = await q(
    "insert into public.patients (id, instructor_id, email, full_name, trial_ends_at, terms_accepted_at) values ($1, $2, 'essai-p-0088@exemple.invalid', 'Patient essai', '2099-01-01', now())",
    [pid, kA],
  );
  ok("ajout normal d'un patient invité par le kiné : toujours possible", !add.error, add.error);
  const row = await one("select trial_ends_at, terms_accepted_at from public.patients where id = $1", [pid]);
  ok("B2 : essai gratuit et CGU forcés à vide", row && row.trial_ends_at === null && row.terms_accepted_at === null, JSON.stringify(row));
  const mism = await q("insert into public.patients (id, instructor_id, email, full_name) values ($1, $2, 'autre@exemple.invalid', 'x')", [other, kA]);
  ok("une fiche avec un e-mail différent de l'invitation est refusée", !!mism.error);

  // Suppression : jamais un kiné.
  await as(null);
  const delK = await q("select internal.delete_app_user_by_id($1)", [kB]);
  ok("la suppression de compte refuse un kiné (par identifiant)", !!delK.error && delK.error.includes("IS_KINE"), delK.error);
  const delKe = await q("select internal.delete_app_user_by_email('essai-b-0088@exemple.invalid')");
  ok("la suppression de compte refuse un kiné (par e-mail)", !!delKe.error && delKe.error.includes("IS_KINE"), delKe.error);
  const delOther = await q("select internal.delete_app_user_by_id($1)", [other]);
  ok("la suppression d'un compte réservé sans fiche marche toujours", !delOther.error, delOther.error);

  // Bibliothèque : anonyme vs connecté.
  await as(null);
  const anon = await one(
    "select (select count(*) from public.conditions)::int c, (select count(*) from public.workouts)::int w, (select count(*) from public.workout_exercises)::int we, (select count(*) from public.body_parts)::int bp",
  );
  ok("S2 : sans connexion, bibliothèque illisible", anon.c === 0 && anon.w === 0 && anon.we === 0 && anon.bp === 0, JSON.stringify(anon));
  await as("essai_clerk_a");
  const logged = await one(
    "select (select count(*) from public.conditions)::int c, (select count(*) from public.workouts)::int w, (select count(*) from public.workout_exercises)::int we, (select count(*) from public.body_parts)::int bp, (select count(*) from public.exercises)::int e",
  );
  ok("S2 : connecté (kiné), bibliothèque lisible", logged.c > 0 && logged.w > 0 && logged.we > 0 && logged.bp > 0 && logged.e > 0, JSON.stringify(logged));
  const mine = await one("select count(*)::int n from public.patients");
  ok("le kiné A ne voit que son patient d'essai", mine.n === 1, `${mine.n}`);

  // Patient : session, lecture, pas de fiche kiné.
  await as(null);
  await pass("app_users");
  await client.query("update public.app_users set clerk_id = 'essai_clerk_p' where app_id = $1", [pid]);
  await pass("");
  await as("essai_clerk_p");
  const pLib = await one("select (select count(*) from public.workouts)::int w, (select count(*) from public.exercises)::int e");
  ok("connecté (patient), bibliothèque lisible", pLib.w > 0 && pLib.e > 0, JSON.stringify(pLib));
  const prof = await q("insert into public.patient_profiles (id) values ($1)", [pid]);
  ok("le patient peut créer son profil de santé", !prof.error, prof.error);
  const selfKine = await q("insert into public.instructors (id, full_name, email, status) values ($1, 'x', 'essai-p-0088@exemple.invalid', 'pending')", [pid]);
  ok("C5 : un patient ne peut pas se créer une fiche kiné", !!selfKine.error);

  await as(null);
  const nid = (await one("select app_id from internal.precreate_app_user('essai-n-0088@exemple.invalid')")).app_id;
  await pass("app_users");
  await client.query("update public.app_users set clerk_id = 'essai_clerk_n' where app_id = $1", [nid]);
  await pass("");
  await as("essai_clerk_n");
  const newKine = await q("insert into public.instructors (id, full_name, email, status) values ($1, 'Nouveau', 'essai-n-0088@exemple.invalid', 'pending')", [nid]);
  ok("inscription d'un nouveau kiné : toujours possible", !newKine.error, newKine.error);

  await as("essai_clerk_a");
  const delProf = await q("delete from public.patient_profiles where id = $1", [pid]);
  ok("le kiné ne peut plus supprimer le profil de santé", !delProf.error && delProf.count === 0, delProf.error ?? `${delProf.count} ligne(s)`);
  const readProf = await one("select count(*)::int n from public.patient_profiles where id = $1", [pid]);
  ok("le kiné lit toujours le profil de son patient", readProf.n === 1);

  // Séances : rattacher sa séance au patient d'un autre kiné.
  const w = await q("insert into public.workouts (name, created_by, condition_id) values ('Séance essai 0088', $1, (select id from public.conditions limit 1)) returning id", [kA]);
  if (w.error) {
    ok("création d'une séance par le kiné", false, w.error);
  } else {
    await as(null);
    const pB = (await one("select app_id from internal.precreate_app_user('essai-pb-0088@exemple.invalid')")).app_id;
    await as("essai_clerk_b");
    const addB = await q("insert into public.patients (id, instructor_id, email, full_name) values ($1, $2, 'essai-pb-0088@exemple.invalid', 'Patient B')", [pB, kB]);
    ok("le kiné B ajoute son patient", !addB.error, addB.error);
    await as("essai_clerk_a");
    const steal = await q("update public.workouts set patient_id = $1 where id = $2", [pB, w.rows[0].id]);
    ok("une séance ne peut pas être rattachée au patient d'un autre kiné", !!steal.error || steal.count === 0, steal.error ?? `${steal.count} ligne(s)`);
    const okUpd = await q("update public.workouts set patient_id = $1 where id = $2", [pid, w.rows[0].id]);
    ok("rattacher sa séance à son propre patient : toujours possible", !okUpd.error && okUpd.count === 1, okUpd.error);
  }

  // Kiné suspendu : plus rien sur les séances.
  await as(null);
  await pass("set_instructor_status");
  const susp = await q("update public.instructors set status = 'suspended' where id = $1", [kA]);
  await pass("");
  if (susp.error) {
    console.log(`      (contrôle « kiné suspendu » sauté : ${susp.error})`);
  } else {
    await as("essai_clerk_a");
    const blocked = await one("select (select count(*) from public.workouts)::int w, (select count(*) from public.patients)::int p");
    ok("kiné suspendu : ni séances ni patients lisibles", blocked.w === 0 && blocked.p === 0, JSON.stringify(blocked));
    await as(null);
    await pass("set_instructor_status");
    await q("update public.instructors set status = 'approved' where id = $1", [kA]);
    await pass("");
  }

  // Première connexion : e-mail vérifié obligatoire pour un compte réservé.
  await as(null);
  const rid = (await one("select app_id from internal.precreate_app_user('essai-r-0088@exemple.invalid')")).app_id;
  const unv = await q("select internal.resolve_app_user('essai_clerk_r', 'essai-r-0088@exemple.invalid', false) as id");
  ok("S3 : compte réservé refusé si l'e-mail n'est pas vérifié", !!unv.error && unv.error.includes("EMAIL_NOT_VERIFIED"), unv.error);
  const ver = await q("select internal.resolve_app_user('essai_clerk_r', 'essai-r-0088@exemple.invalid', true) as id");
  ok("S3 : compte réservé relié si l'e-mail est vérifié", !ver.error && ver.rows[0].id === rid, ver.error);
  const fresh = await q("select internal.resolve_app_user('essai_clerk_s', 'essai-s-0088@exemple.invalid', false) as id");
  ok("première connexion d'une adresse inconnue : toujours possible", !fresh.error && !!fresh.rows[0].id, fresh.error);

  // Créations par le serveur : QR code et comptes de test.
  const jid = (await one("select app_id from internal.precreate_app_user('essai-j-0088@exemple.invalid')")).app_id;
  const join = await q("select internal.join_patient_by_link($1, $2, 'essai-j-0088@exemple.invalid', 'Essai QR') as r", [kA, jid]);
  ok("inscription par QR code : toujours possible", !join.error && join.rows[0].r === "OK", join.error ?? join.rows?.[0]?.r);
  const tp = await q("select internal.admin_create_test_patient('essai-t-0088@exemple.invalid', 'Essai T', $1, true) as id", [kA]);
  ok("patient de test créé par l'admin : toujours possible", !tp.error, tp.error);
  if (!tp.error) {
    await pass("admin_read");
    const tRow = await one("select trial_ends_at from public.patients where id = $1", [tp.rows[0].id]);
    await pass("");
    ok("patient de test : l'accès gratuit est conservé", !!tRow.trial_ends_at);
  }

  // 0089 : notes d'honoraires, essai gratuit, accord écrit.
  const r1 = await q("select * from internal.record_monthly_review($1, $2, date '2026-11-01', 'Essai', 600)", [pid, kA]);
  ok("0089 : note d'honoraires enregistrée", !r1.error, r1.error);
  const r2 = await q("select * from internal.record_monthly_review($1, $2, date '2026-11-01', 'Essai', 600)", [jid, kA]);
  ok("0089 : deuxième note, numéro suivant", !r2.error && r2.rows[0].fee_note_seq === r1.rows?.[0]?.fee_note_seq + 1, r2.error ?? JSON.stringify(r2.rows?.[0]));
  const dup = await q("select * from internal.record_monthly_review($1, $2, date '2026-11-01', 'Essai', 600)", [jid, kA]);
  ok("0089 : pas deux notes pour le même patient le même mois", !!dup.error);

  const trial0 = await one("select internal.trial_already_used($1, 'essai-j-0088@exemple.invalid') as u", [jid]);
  const mark = await q("select internal.mark_trial_used($1)", [jid]);
  ok("0089 : essai gratuit marqué comme consommé", !mark.error, mark.error);
  const acc = await q("select internal.record_billing_acceptance($1, 'plan_1m', 699, 600, 10, 'fr', '2026-11-08') as id", [pid]);
  ok("0089 : accord écrit du patient enregistré", !acc.error, acc.error);
  const fees = await q("select internal.kine_fees_acceptance($1, $2) as v, internal.kine_fees_acceptance($1, $3) as w", [pid, kA, kB]);
  ok("0089 : l'accord nomme le bon kiné", !fees.error && fees.rows[0].v === "yes" && fees.rows[0].w === "other", fees.error ?? JSON.stringify(fees.rows?.[0]));

  // Suppression du patient : la note reste, le numéro n'est pas réutilisé,
  // l'essai reste consommé.
  const delJ = await q("select internal.delete_app_user_by_id($1)", [jid]);
  ok("suppression d'un patient : toujours possible", !delJ.error, delJ.error);
  await pass("admin_read");
  const kept = await one("select patient_id, patient_name from public.monthly_reviews where id = $1", [r2.rows?.[0]?.review_id]);
  await pass("");
  ok("B5 : la note d'honoraires survit à la suppression du patient", !!kept && kept.patient_id === null && !!kept.patient_name, JSON.stringify(kept));
  const kid = (await one("select app_id from internal.precreate_app_user('essai-k-0088@exemple.invalid')")).app_id;
  await as("essai_clerk_a");
  await q("insert into public.patients (id, instructor_id, email, full_name) values ($1, $2, 'essai-k-0088@exemple.invalid', 'Essai K')", [kid, kA]);
  await as(null);
  const r3 = await q("select * from internal.record_monthly_review($1, $2, date '2026-11-01', 'Essai', 600)", [kid, kA]);
  ok("B5 : le numéro d'une note supprimée n'est pas réutilisé", !r3.error && r3.rows[0].fee_note_seq === r2.rows?.[0]?.fee_note_seq + 1, r3.error ?? JSON.stringify(r3.rows?.[0]));
  const rejoin = (await one("select app_id from internal.precreate_app_user('essai-j-0088@exemple.invalid')")).app_id;
  const trial1 = await one("select internal.trial_already_used($1, 'essai-j-0088@exemple.invalid') as u", [rejoin]);
  ok("M1 : après suppression et retour, l'essai gratuit est reconnu comme déjà pris", trial0.u === false && trial1.u === true, `${trial0.u} → ${trial1.u}`);
} catch (e) {
  failures++;
  console.log("ERREUR", e.message);
} finally {
  await client.query("rollback");
  await client.end();
  console.log(failures ? `${failures} échec(s) — rien n'a été enregistré (annulé).` : "Tout est OK — rien n'a été enregistré (annulé).");
}
