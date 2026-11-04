// Essai à blanc de 0081 (exercices créés par les kinés) : applique la
// migration dans une transaction, joue les règles d'accès avec de vrais
// comptes (kiné A, un de ses patients, un autre kiné B), puis ANNULE tout
// (ROLLBACK). Rien ne reste dans la base.
//
//   node --env-file=.env.local scripts/dryrun-0081.mjs
import fs from "node:fs";
import pg from "pg";

const sql = fs.readFileSync(new URL("../supabase/migrations/0081_kine_exercises.sql", import.meta.url), "utf8");
const client = new pg.Client({ connectionString: process.env.SCALINGO_DATABASE_URL, ssl: { rejectUnauthorized: false } });
await client.connect();

let failures = 0;
const ok = (label, cond, detail = "") => {
  console.log(`${cond ? "OK  " : "ÉCHEC"} ${label}${detail ? ` (${detail})` : ""}`);
  if (!cond) failures++;
};

let savepoint = 0;
// Exécute une requête en tant que `clerkId` ; renvoie { rows } ou { error }.
async function as(clerkId, text, params = []) {
  const sp = `sp${++savepoint}`;
  await client.query(`savepoint ${sp}`);
  try {
    await client.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: clerkId })]);
    if (useRole) await client.query("set local role authenticated");
    const res = await client.query(text, params);
    if (useRole) await client.query("reset role");
    await client.query(`release savepoint ${sp}`);
    return { rows: res.rows };
  } catch (e) {
    await client.query(`rollback to savepoint ${sp}`);
    return { error: e.message };
  }
}

let useRole = false;
try {
  await client.query("begin");
  const roles = await client.query("select rolname from pg_roles where rolname = 'authenticated'");
  const me = await client.query("select current_user");
  useRole = roles.rowCount > 0;
  console.log(`Rôle de connexion : ${me.rows[0].current_user} ; rôle « authenticated » : ${useRole ? "oui" : "non"}`);

  await client.query(sql);
  console.log("Migration appliquée (dans la transaction).");

  // Lecture « admin » le temps de choisir les comptes (comme /admin), puis on la retire.
  await client.query("select set_config('app.admin_bypass', 'admin_read', true)");
  // Comptes réels pour l'essai : un kiné validé avec au moins un patient, et un autre kiné.
  const kines = await client.query(`
    select i.id,
           (select array_agg(p.id order by p.created_at) from public.patients p where p.instructor_id = i.id) as patients
    from public.instructors i
    where i.status = 'approved'
    order by (select count(*) from public.patients p where p.instructor_id = i.id) desc
    limit 2`);
  const [A, B] = kines.rows;
  if (!A || !B || !A.patients?.length) throw new Error("Pas assez de comptes pour l'essai (2 kinés validés, dont un avec un patient).");
  const otherPatient = await client.query("select id from public.patients where instructor_id <> $1 limit 1", [A.id]);
  // Identifiants de connexion (Clerk) : table app_users, lue par son propre passe.
  await client.query("select set_config('app.admin_bypass', 'app_users', true)");
  const ids0 = [A.id, B.id, ...A.patients];
  const users = await client.query("select app_id, clerk_id from public.app_users where app_id = any($1)", [ids0]);
  const clerk = new Map(users.rows.map((r) => [r.app_id, r.clerk_id]));
  A.clerk_id = clerk.get(A.id);
  B.clerk_id = clerk.get(B.id);
  const pats = A.patients.filter((id) => clerk.get(id)).map((id) => ({ id, clerk_id: clerk.get(id) }));
  const P1 = pats[0];
  const P2 = pats[1];
  await client.query("select set_config('app.admin_bypass', '', true)");
  if (!A.clerk_id || !B.clerk_id || !P1) throw new Error("Comptes de connexion introuvables pour l'essai.");
  console.log(`Kiné A : ${A.patients.length} patient(s) ; kiné B trouvé ; patient P2 : ${P2 ? "oui" : "non"}`);

  const platformBefore = await as(B.clerk_id, "select count(*)::int as n from public.exercises where created_by is null");

  // --- Kiné A crée ses exercices ---
  const ins = (status, patientId) =>
    as(A.clerk_id,
      "insert into public.exercises (name, created_by, publication_status, patient_id) values ($1, $2, $3, $4) returning id, submitted_at",
      [`Essai ${status} ${patientId ? "patient" : "banque"}`, A.id, status, patientId]);
  const X = await ins("private", null);
  ok("A crée un exercice pour sa banque", !!X.rows, X.error);
  const Y = await ins("private", P1.id);
  ok("A crée un exercice réservé à son patient P1", !!Y.rows, Y.error);
  const Z = await ins("pending", null);
  ok("A propose un exercice à tous (en vérification)", !!Z.rows && Z.rows[0].submitted_at !== null, Z.error);
  const bad = await ins("published", null);
  ok("A ne peut pas se publier lui-même", !!bad.error, bad.error);
  if (otherPatient.rowCount) {
    const stolen = await ins("private", otherPatient.rows[0].id);
    ok("A ne peut pas réserver un exercice au patient d'un autre kiné", !!stolen.error, stolen.error);
  }
  const ids = [X.rows?.[0]?.id, Y.rows?.[0]?.id, Z.rows?.[0]?.id];

  const visible = async (who) => {
    const r = await as(who, "select id from public.exercises where id = any($1)", [ids]);
    return new Set((r.rows ?? []).map((x) => x.id));
  };

  const seenB = await visible(B.clerk_id);
  ok("B ne voit aucun des 3 exercices de A", seenB.size === 0, `${seenB.size} vu(s)`);
  const seenP1 = await visible(P1.clerk_id);
  ok("P1 voit les 3 exercices de son kiné (dont celui qui lui est réservé)", seenP1.size === 3, `${seenP1.size} vu(s)`);
  if (P2) {
    const seenP2 = await visible(P2.clerk_id);
    ok("P2 (autre patient de A) ne voit pas l'exercice réservé à P1", seenP2.size === 2 && !seenP2.has(ids[1]), `${seenP2.size} vu(s)`);
  }
  const seenA = await visible(A.clerk_id);
  ok("A voit ses 3 exercices", seenA.size === 3, `${seenA.size} vu(s)`);

  const platformAfter = await as(B.clerk_id, "select count(*)::int as n from public.exercises where created_by is null");
  ok("Les exercices de la plateforme restent visibles par B", platformAfter.rows?.[0]?.n === platformBefore.rows?.[0]?.n && platformAfter.rows[0].n > 0,
    `${platformBefore.rows?.[0]?.n} avant, ${platformAfter.rows?.[0]?.n} après`);

  const selfPublish = await as(A.clerk_id, "update public.exercises set publication_status = 'published' where id = $1 returning id", [ids[2]]);
  ok("A ne peut pas passer son exercice en « publié »", !!selfPublish.error, selfPublish.error);
  const fakeLabel = await as(A.clerk_id, "update public.exercises set author_label = 'Moi', review_note = 'ok' where id = $1 returning author_label, review_note", [ids[0]]);
  ok("A ne peut pas écrire les champs de vérification", !fakeLabel.error && fakeLabel.rows?.[0]?.author_label === null && fakeLabel.rows?.[0]?.review_note === null, fakeLabel.error);
  const patientPublic = await as(A.clerk_id, "update public.exercises set publication_status = 'pending' where id = $1 returning id", [ids[1]]);
  ok("Un exercice réservé à un patient ne peut pas être proposé à tous", !!patientPublic.error, patientPublic.error);

  // --- /admin ---
  const list = await client.query("select * from internal.admin_list_kine_exercises()");
  ok("La liste /admin contient les 3 exercices de A", ids.every((id) => list.rows.some((r) => r.id === id)), `${list.rowCount} ligne(s)`);
  const noNote = await client.query("savepoint adm1").then(() =>
    client.query("select * from internal.admin_review_exercise($1, 'changes', '', 5, 3)", [ids[2]]).then(() => null, (e) => e.message));
  await client.query("rollback to savepoint adm1");
  ok("Demander une modification sans message est refusé", !!noNote, noNote ?? "");
  const review = await client.query("select * from internal.admin_review_exercise($1, 'publish', '', 5, 3)", [ids[2]]);
  ok("Philippe publie l'exercice proposé", review.rows[0]?.published_count >= 1, `publiés : ${review.rows[0]?.published_count}`);
  const afterPub = await client.query("select publication_status, author_label, reviewed_at from public.exercises where id = $1", [ids[2]]).catch(() => null);
  const seenB2 = await visible(B.clerk_id);
  ok("Après publication, B voit l'exercice publié (et seulement lui)", seenB2.size === 1 && seenB2.has(ids[2]), `${seenB2.size} vu(s)`);
  if (afterPub?.rows?.[0]) console.log("     Auteur affiché :", afterPub.rows[0].author_label ?? "(aucun nom)");

  const editPublished = await as(A.clerk_id, "update public.exercises set name = 'Changé' where id = $1 returning id", [ids[2]]);
  ok("A ne peut plus modifier l'exercice publié", !!editPublished.error, editPublished.error);
  const delPublished = await as(A.clerk_id, "delete from public.exercises where id = $1 returning id", [ids[2]]);
  ok("A ne peut plus supprimer l'exercice publié", !!delPublished.error, delPublished.error);
  const delPrivate = await as(A.clerk_id, "delete from public.exercises where id = $1 returning id", [ids[0]]);
  ok("A peut supprimer son exercice privé", !delPrivate.error && delPrivate.rows?.length === 1, delPrivate.error);

  const media = await as(A.clerk_id, "select public.set_exercise_media($1, 'r2:kines/essai.mp4', 0)", [ids[1]]);
  ok("A peut mettre une vidéo sur son exercice", !media.error, media.error);

  await client.query("select internal.admin_mark_exercise_seen($1, true)", [ids[1]]);
  const seen = await client.query("select admin_seen_at from internal.admin_list_kine_exercises() where id = $1", [ids[1]]);
  ok("Philippe peut marquer un exercice « dessin fait »", seen.rows[0]?.admin_seen_at !== null);

  const waiver = await as(A.clerk_id, "insert into public.instructor_fee_waivers (instructor_id, waived_until) values ($1, '2030-01-01') returning 1", [A.id]);
  ok("A ne peut pas s'accorder lui-même la remise", !!waiver.error, waiver.error);

  // Récompense : avec un seuil de 2, la 2e publication accorde la remise.
  const W = await ins("pending", null);
  const reward = await client.query("select * from internal.admin_review_exercise($1, 'publish', '', 2, 3)", [W.rows?.[0]?.id]);
  ok("La remise est accordée quand le seuil est atteint", reward.rows[0]?.published_count === 2 && reward.rows[0]?.waived_until !== null,
    `publiés : ${reward.rows[0]?.published_count}, remise jusqu'au ${reward.rows[0]?.waived_until?.toISOString?.().slice(0, 10)}`);
  const seeWaiver = await as(A.clerk_id, "select waived_until from public.instructor_fee_waivers");
  ok("A voit sa remise", seeWaiver.rows?.length === 1, seeWaiver.error);
  const seeWaiverB = await as(B.clerk_id, "select waived_until from public.instructor_fee_waivers");
  ok("B ne voit pas la remise de A", seeWaiverB.rows?.length === 0, seeWaiverB.error);

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
