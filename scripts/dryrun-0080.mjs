// Essai à blanc de 0080 : applique la migration dans une transaction, vérifie,
// puis ANNULE tout (ROLLBACK). Rien ne reste dans la base.
import fs from "node:fs";
import pg from "pg";

const sql = fs.readFileSync(new URL("../supabase/migrations/0080_exercise_results_and_doses.sql", import.meta.url), "utf8");
const client = new pg.Client({ connectionString: process.env.SCALINGO_DATABASE_URL, ssl: { rejectUnauthorized: false } });
await client.connect();
try {
  await client.query("begin");
  await client.query(sql);
  const pol = await client.query(
    "select policyname, cmd, permissive from pg_policies where tablename = 'exercise_results' order by policyname",
  );
  console.table(pol.rows);
  const cols = await client.query(
    "select table_name, column_name, data_type from information_schema.columns where (table_name = 'workout_exercises' and column_name in ('sets','reps','hold_seconds')) or (table_name = 'patients' and column_name = 'feedback_seen_at') order by 1,2",
  );
  console.table(cols.rows);
  const rls = await client.query("select relrowsecurity, relforcerowsecurity from pg_class where relname = 'exercise_results'");
  console.log("RLS activée / forcée :", rls.rows[0]);
  // Re-jouable : une deuxième application ne doit pas échouer.
  await client.query(sql);
  console.log("Deuxième application : OK (migration rejouable)");
} finally {
  await client.query("rollback");
  await client.end();
  console.log("ROLLBACK : rien n'a été gardé.");
}
