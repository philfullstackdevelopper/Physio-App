// Essai à blanc de 0085 (cabinets) : applique la migration dans une
// transaction, joue les règles avec de vrais comptes, puis ANNULE tout.
//   node --env-file=.env.local scripts/dryrun-0085.mjs
import fs from "node:fs";
import pg from "pg";

const sql = fs.readFileSync(new URL("../supabase/migrations/0085_cabinets.sql", import.meta.url), "utf8");
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
    await client.query("select set_config('request.jwt.claims', '', true)");
    await client.query(`release savepoint ${name}`);
    return { rows: res.rows };
  } catch (e) {
    await client.query(`rollback to savepoint ${name}`);
    return { error: e.message };
  }
}
async function server(text, params = []) {
  const name = `sp${++sp}`;
  await client.query(`savepoint ${name}`);
  try {
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
  // Deux fois : la migration doit pouvoir être rejouée.
  await client.query(sql);
  console.log("Migration rejouée sans erreur.");

  await client.query("select set_config('app.admin_bypass', 'app_users', true)");
  const users = (await client.query("select app_id, clerk_id from public.app_users")).rows;
  const clerk = new Map(users.map((r) => [r.app_id, r.clerk_id]));
  await client.query("select set_config('app.admin_bypass', 'admin_read', true)");
  const kines = (await client.query("select id from public.instructors where status = 'approved'")).rows.map((r) => r.id).filter((id) => clerk.get(id));
  const pats = (await client.query("select id, instructor_id from public.patients")).rows.filter((r) => r.id !== r.instructor_id && clerk.get(r.id));
  await client.query("select set_config('app.admin_bypass', '', true)");
  if (kines.length < 2) throw new Error("Il faut 2 kinés avec compte pour l'essai.");
  // B = un kiné qui a des patients (pour tester le côté patient), A = l'autre.
  const withPats = kines.filter((k) => pats.some((p) => p.instructor_id === k));
  const bId = withPats[0] ?? kines[1];
  const aId = kines.find((k) => k !== bId);
  const [A, B] = [aId, bId].map((id) => ({ id, clerk: clerk.get(id) }));
  // « Extérieur » : un 3e kiné s'il existe, sinon un compte patient d'un autre kiné.
  const outsiderId = kines.find((k) => k !== A.id && k !== B.id) ?? pats.find((p) => p.instructor_id !== A.id && p.instructor_id !== B.id)?.id;
  const C = outsiderId ? { id: outsiderId, clerk: clerk.get(outsiderId) } : null;
  console.log("Comptes : kinés", kines.length, "· patients avec compte", pats.length);
  const patOfB = pats.find((p) => p.instructor_id === B.id);
  const patOfC = pats.find((p) => p.instructor_id !== A.id && p.instructor_id !== B.id);

  // 1. Création et demande
  const cab = await server("select internal.cabinet_create($1, 'Cabinet Essai', '1 rue Test', 'Lyon', '69001') as id", [A.id]);
  ok("A crée un cabinet", !!cab.rows?.[0]?.id, cab.error);
  const cabId = cab.rows?.[0]?.id;
  const dup = await server("select internal.cabinet_create($1, 'Autre', null, null, null)", [A.id]);
  ok("Impossible d'être dans deux cabinets", !!dup.error, dup.error);
  const search = await server("select * from internal.cabinet_search('ess')");
  ok("Recherche par nom à l'inscription", search.rows?.some((r) => r.id === cabId && r.members === 1), search.error);
  const searchCity = await server("select * from internal.cabinet_search('lyo')");
  ok("Recherche par ville", searchCity.rows?.some((r) => r.id === cabId), searchCity.error);
  const req = await server("select internal.cabinet_request_join($1, $2)", [B.id, cabId]);
  ok("B demande à rejoindre", !req.error, req.error);

  // 2. Avant acceptation
  const bSeesPending = await as(B.clerk, "select public.my_cabinet_id() as c");
  ok("B en attente n'est pas encore membre", bSeesPending.rows?.[0]?.c === null, bSeesPending.error);
  const bCab = await as(B.clerk, "select name from public.cabinets");
  ok("B en attente voit le nom du cabinet demandé", bCab.rows?.length === 1, bCab.error);
  const bMembers = await as(B.clerk, "select instructor_id from public.cabinet_members");
  ok("B en attente ne voit que sa propre demande", bMembers.rows?.length === 1 && bMembers.rows[0].instructor_id === B.id, bMembers.error);
  const cSees = C ? await as(C.clerk, "select * from public.cabinets") : { rows: [] };
  ok("Un compte extérieur ne voit aucun cabinet", cSees.rows?.length === 0, cSees.error);
  const forge = await as((C ?? A).clerk, "insert into public.cabinet_members (instructor_id, cabinet_id, status) values ($1, $2, 'active')", [(C ?? A).id, cabId]);
  ok("Personne ne s'ajoute à un cabinet depuis le navigateur", !!forge.error, forge.error);
  const badDecide = await server("select internal.cabinet_decide($1, $2, true)", [B.id, B.id]);
  ok("Un kiné en attente ne peut pas s'accepter lui-même", !!badDecide.error, badDecide.error);

  // 3. Acceptation
  const decide = await server("select internal.cabinet_decide($1, $2, true)", [A.id, B.id]);
  ok("A accepte B", !decide.error, decide.error);
  const aMembers = await as(A.clerk, "select instructor_id, status from public.cabinet_members order by status");
  ok("A voit les deux membres", aMembers.rows?.length === 2, aMembers.error);
  const view = await server("select internal.cabinet_team_view($1) as v", [B.id]);
  ok("Vue « Mon cabinet » de B avec les noms", view.rows?.[0]?.v?.members?.length === 2, view.error);

  // 4. Exercice partagé
  const ins = await as(A.clerk, "insert into public.exercises (name, instructions, created_by, publication_status, visibility) values ('Essai partagé 0085', 'test', $1, 'private', 'cabinet') returning id", [A.id]);
  ok("A crée un exercice partagé avec son cabinet", !!ins.rows?.[0]?.id, ins.error);
  const exId = ins.rows?.[0]?.id;
  const insPriv = await as(A.clerk, "insert into public.exercises (name, instructions, created_by, publication_status, visibility) values ('Essai privé 0085', 'test', $1, 'private', 'private') returning id", [A.id]);
  const privId = insPriv.rows?.[0]?.id;
  const badPatient = await as(A.clerk, "insert into public.exercises (name, instructions, created_by, publication_status, visibility, patient_id) values ('x', 'y', $1, 'private', 'cabinet', $1)", [A.id]);
  ok("Un exercice réservé à un patient ne peut pas être partagé", !!badPatient.error, badPatient.error);
  const bSeesShared = await as(B.clerk, "select id from public.exercises where id = $1", [exId]);
  ok("B (collègue) voit l'exercice partagé", bSeesShared.rows?.length === 1, bSeesShared.error);
  const bSeesPriv = await as(B.clerk, "select id from public.exercises where id = $1", [privId]);
  ok("B ne voit pas l'exercice privé de A", bSeesPriv.rows?.length === 0, bSeesPriv.error);
  if (C) { const cSeesShared = await as(C.clerk, "select id from public.exercises where id = $1", [exId]);
  ok("Un compte extérieur ne voit pas l'exercice partagé", cSeesShared.rows?.length === 0, cSeesShared.error); }
  const bEdit = await as(B.clerk, "update public.exercises set name = 'piraté' where id = $1 returning id", [exId]);
  ok("B ne peut pas modifier l'exercice de A", (bEdit.rows?.length ?? 0) === 0, bEdit.error);
  const total = await as(B.clerk, "select count(*)::int n from public.exercises");
  ok("La bibliothèque de B se lit sans erreur", total.rows?.[0]?.n > 0, total.error);

  // 5. Patient d'un collègue : voit l'exercice seulement s'il est dans SA séance
  if (patOfB) {
    const P = { id: patOfB.id, clerk: clerk.get(patOfB.id) };
    const before = await as(P.clerk, "select id from public.exercises where id = $1", [exId]);
    ok("Le patient de B ne voit pas l'exercice tant qu'il n'est pas dans sa séance", before.rows?.length === 0, before.error);
    await client.query("select set_config('app.admin_bypass', 'admin_read', true)");
    const condId = (await client.query("select id from public.conditions limit 1")).rows[0]?.id;
    await client.query("select set_config('app.admin_bypass', '', true)");
    const w = await as(B.clerk, "insert into public.workouts (name, created_by, condition_id) values ('Séance essai 0085', $1, $2) returning id", [B.id, condId]);
    const wId = w.rows?.[0]?.id;
    const we = await as(B.clerk, "insert into public.workout_exercises (workout_id, exercise_id, position) values ($1, $2, 1) returning workout_id", [wId, exId]);
    ok("B met l'exercice partagé dans une séance", !!we.rows?.length, we.error || w.error);
    const rec = await as(B.clerk, "insert into public.patient_recommended_workouts (patient_id, workout_id, week_start_date) values ($1, $2, current_date) returning id", [P.id, wId]);
    ok("B attribue la séance à son patient", !!rec.rows?.length, rec.error);
    const after = await as(P.clerk, "select id from public.exercises where id = $1", [exId]);
    ok("Le patient voit l'exercice de sa séance", after.rows?.length === 1, after.error);
    const privP = await as(P.clerk, "select id from public.exercises where id = $1", [privId]);
    ok("Le patient ne voit pas l'exercice privé de A", privP.rows?.length === 0, privP.error);
  } else console.log("(pas de patient de B : contrôle patient sauté)");
  if (patOfC) {
    const Q = { id: patOfC.id, clerk: clerk.get(patOfC.id) };
    const q = await as(Q.clerk, "select id from public.exercises where id = $1", [exId]);
    ok("Le patient d'un kiné extérieur ne voit pas l'exercice", q.rows?.length === 0, q.error);
  }

  // 6. Départs
  const leave = await server("select internal.cabinet_leave($1)", [A.id]);
  ok("A (fondateur) quitte le cabinet", !leave.error, leave.error);
  const owner = await server("select role from public.cabinet_members where instructor_id = $1", [B.id]);
  await client.query("select set_config('app.admin_bypass', 'admin_read', true)");
  const ownerRow = (await client.query("select role from public.cabinet_members where instructor_id = $1", [B.id])).rows[0];
  await client.query("select set_config('app.admin_bypass', '', true)");
  ok("B devient fondateur", ownerRow?.role === "owner", owner.error);
  const bAfter = await as(B.clerk, "select id from public.exercises where id = $1", [exId]);
  ok("A parti : B ne voit plus son exercice partagé", bAfter.rows?.length === 0, bAfter.error);
  const leave2 = await server("select internal.cabinet_leave($1)", [B.id]);
  await client.query("select set_config('app.admin_bypass', 'admin_read', true)");
  const gone = (await client.query("select count(*)::int n from public.cabinets where id = $1", [cabId])).rows[0].n;
  const idx = (await client.query("select count(*)::int n from public.cabinet_active_index")).rows[0].n;
  await client.query("select set_config('app.admin_bypass', '', true)");
  ok("Dernier membre parti : le cabinet est supprimé", gone === 0 && !leave2.error, leave2.error);
  ok("L'index des cabinets actifs est vide", idx === 0);
  const adminList = await server("select * from internal.admin_list_cabinets()");
  ok("Liste /admin lisible", !adminList.error, adminList.error);
} catch (e) {
  failures++;
  console.log("ERREUR", e.message);
} finally {
  await client.query("rollback");
  await client.end();
  console.log(failures ? `${failures} échec(s) — rien n'a été enregistré.` : "Tout est OK — rien n'a été enregistré (annulé).");
}
