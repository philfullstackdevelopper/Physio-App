#!/usr/bin/env node
// Applique les fichiers supabase/migrations/*.sql, dans l'ordre, sur la base
// Postgres (Scalingo : SCALINGO_DATABASE_URL, via `scalingo db-tunnel` en
// local ; ou DATABASE_URL). Chaque fichier appliqué est noté dans la table
// schema_migrations, pour ne jamais le rejouer.
//
// PRUDENCE (audit du 2026-10-08) : sur Scalingo, schema_migrations ne liste
// que les fichiers jusqu'à 0028, alors que la base contient déjà tout
// jusqu'à 0062 (appliqués à la main). Lancé tel quel, l'ancien script
// rejouait 0029 → 0062 — dont des fichiers non rejouables (insertions avec
// identifiants fixes, fusions, changements de clés étrangères). Désormais :
//
//   node scripts/migrate.mjs                         → n'applique RIEN : liste ce qui serait fait
//   node scripts/migrate.mjs --baseline 0062_xxx.sql → note 0001…0062 comme déjà appliqués, sans les exécuter
//   node scripts/migrate.mjs --only 0063_xxx.sql     → applique ce seul fichier
//   node scripts/migrate.mjs --apply                 → applique tous les fichiers en attente
//
// Sur Scalingo, la première fois : --baseline sur le dernier fichier déjà
// présent en base, PUIS --only (ou --apply) pour les nouveaux.

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";

const MIGRATIONS_DIR = path.join(import.meta.dirname, "..", "supabase", "migrations");

function argValue(flag) {
  const i = process.argv.indexOf(flag);
  return i === -1 ? null : (process.argv[i + 1] ?? "");
}

async function main() {
  const connectionString = process.env.SCALINGO_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("Ni SCALINGO_DATABASE_URL ni DATABASE_URL ne sont définis.");
    process.exit(1);
  }

  const baseline = argValue("--baseline");
  const only = argValue("--only");
  const apply = process.argv.includes("--apply");
  if ([baseline, only, apply || null].filter(Boolean).length > 1) {
    console.error("Une seule option à la fois : --baseline, --only ou --apply.");
    process.exit(1);
  }

  const files = (await readdir(MIGRATIONS_DIR))
    .filter((f) => f.endsWith(".sql"))
    .sort(); // noms numérotés (0001_…, 0002_…) : l'ordre alphabétique est l'ordre d'exécution

  for (const name of [baseline, only].filter(Boolean)) {
    if (!files.includes(name)) {
      console.error(`Fichier inconnu : ${name}`);
      process.exit(1);
    }
  }

  const client = new pg.Client({ connectionString });
  await client.connect();

  try {
    await client.query(`
      create table if not exists public.schema_migrations (
        filename    text primary key,
        applied_at  timestamptz not null default now()
      );
    `);
    const { rows } = await client.query("select filename from public.schema_migrations");
    const done = new Set(rows.map((r) => r.filename));
    const pending = files.filter((f) => !done.has(f));

    if (baseline) {
      const upTo = files.slice(0, files.indexOf(baseline) + 1).filter((f) => !done.has(f));
      for (const f of upTo) {
        await client.query("insert into public.schema_migrations (filename) values ($1) on conflict do nothing", [f]);
        console.log(`noté  ${f} (déjà présent en base, non exécuté)`);
      }
      console.log(`Terminé : ${upTo.length} fichier(s) noté(s).`);
      return;
    }

    const toRun = only ? (done.has(only) ? [] : [only]) : apply ? pending : [];

    if (!only && !apply) {
      console.log(`Fichiers en attente (${pending.length}) :`);
      for (const f of pending) console.log(`  ${f}`);
      console.log("\nRien n'a été appliqué. Relancez avec --only <fichier> ou --apply (voir l'en-tête de ce script).");
      return;
    }
    if (only && done.has(only)) {
      console.log(`${only} est déjà noté comme appliqué : rien à faire.`);
      return;
    }

    for (const file of toRun) {
      const sql = await readFile(path.join(MIGRATIONS_DIR, file), "utf8");
      console.log(`application  ${file}`);
      try {
        await client.query("begin");
        await client.query(sql);
        await client.query("insert into public.schema_migrations (filename) values ($1)", [file]);
        await client.query("commit");
      } catch (err) {
        await client.query("rollback");
        console.error(`ÉCHEC ${file} (annulé, rien n'a changé pour ce fichier) :`, err.message);
        process.exit(1);
      }
    }
    console.log("Terminé.");
  } finally {
    await client.end();
  }
}

main();
