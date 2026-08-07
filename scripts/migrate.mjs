#!/usr/bin/env node
// Applies supabase/migrations/*.sql, in order, against DATABASE_URL.
//
// NOT YET USABLE (Scalingo migration, Phase 5) — DATABASE_URL doesn't point
// anywhere real yet. Replaces the "copy the file into Supabase's SQL editor
// and click Run" habit every migration file's header comment describes —
// Scalingo's Postgres addon has no such editor.
//
// Tracks what's already been applied in a schema_migrations table, so
// re-running this is always safe: already-applied files are skipped.
//
// Usage: DATABASE_URL=postgres://... node scripts/migrate.mjs

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";

const MIGRATIONS_DIR = path.join(import.meta.dirname, "..", "supabase", "migrations");

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }

  const files = (await readdir(MIGRATIONS_DIR))
    .filter((f) => f.endsWith(".sql"))
    .sort(); // filenames are zero-padded (0001_..., 0002_...), so lexical sort = execution order

  const client = new pg.Client({ connectionString });
  await client.connect();

  try {
    await client.query(`
      create table if not exists public.schema_migrations (
        filename    text primary key,
        applied_at  timestamptz not null default now()
      );
    `);

    const { rows: alreadyApplied } = await client.query(
      "select filename from public.schema_migrations",
    );
    const done = new Set(alreadyApplied.map((r) => r.filename));

    for (const file of files) {
      if (done.has(file)) {
        console.log(`skip   ${file} (already applied)`);
        continue;
      }
      const sql = await readFile(path.join(MIGRATIONS_DIR, file), "utf8");
      console.log(`apply  ${file}`);
      try {
        await client.query("begin");
        await client.query(sql);
        await client.query("insert into public.schema_migrations (filename) values ($1)", [file]);
        await client.query("commit");
      } catch (err) {
        await client.query("rollback");
        console.error(`FAILED ${file}:`, err.message);
        process.exit(1);
      }
    }

    console.log("Done.");
  } finally {
    await client.end();
  }
}

main();
