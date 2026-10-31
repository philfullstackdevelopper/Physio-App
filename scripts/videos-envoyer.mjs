#!/usr/bin/env node
// Envoie les vidéos légères (videos-tournage/web/, préparées par
// scripts/videos-preparer.mjs) chez Outscale, puis écrit la migration qui
// relie chaque vidéo à ses exercices de la plateforme.
//
//   node --env-file=.env.local scripts/videos-envoyer.mjs
//
// Pré-requis : clés Outscale dans .env.local et bucket préparé
// (scripts/outscale-preparer.mjs, voir docs/outscale-mise-en-place.md).
//
// 1. Envoie chaque <slug>.mp4 sous « plateforme/<slug>.mp4 » (déjà présent et
//    de même taille → sauté ; on peut relancer sans risque).
// 2. Écrit supabase/migrations/0074_exercise_videos.sql : pour chaque vidéo,
//    met son adresse dans exercises.media_url des exercices de la PLATEFORME
//    dont le nom est relié à ce dessin (lib/exercise/illustrationMap.ts).
//    Rien n'est appliqué : la migration s'applique ensuite avec
//    scripts/migrate.mjs --only, après explication à Philippe.

import fs from "node:fs";
import path from "node:path";
import { S3Client, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, "$1")), "..");
const WEB = path.join(ROOT, "videos-tournage", "web");
const endpoint = (process.env.S3_ENDPOINT ?? "").replace(/\/$/, "");
const region = process.env.S3_REGION ?? "eu-west-2";
const bucket = process.env.S3_BUCKET_EXERCISE_MEDIA ?? "";
const { S3_ACCESS_KEY_ID: accessKeyId, S3_SECRET_ACCESS_KEY: secretAccessKey } = process.env;
if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
  console.error("Clés Outscale absentes de .env.local — voir docs/outscale-mise-en-place.md.");
  process.exit(1);
}
const plan = JSON.parse(fs.readFileSync(path.join(WEB, "correspondance.json"), "utf8"));
const s3 = new S3Client({ endpoint, region, credentials: { accessKeyId, secretAccessKey }, forcePathStyle: true });

// Noms d'exercices reliés à chaque dessin.
const mapSrc = fs.readFileSync(path.join(ROOT, "lib", "exercise", "illustrationMap.ts"), "utf8");
const namesBySlug = new Map();
for (const m of mapSrc.matchAll(/^\s*"((?:[^"\\]|\\.)+)":\s*"([a-z0-9-]+)"/gm)) {
  if (!namesBySlug.has(m[2])) namesBySlug.set(m[2], []);
  namesBySlug.get(m[2]).push(m[1]);
}

const rows = [];
for (const [i, p] of plan.entries()) {
  const file = path.join(WEB, `${p.slug}.mp4`);
  const key = `plateforme/${p.slug}.mp4`;
  const size = fs.statSync(file).size;
  let skip = false;
  try {
    const head = await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    skip = head.ContentLength === size;
  } catch {}
  if (!skip) {
    await s3.send(new PutObjectCommand({
      Bucket: bucket, Key: key, Body: fs.readFileSync(file), ContentType: "video/mp4",
      CacheControl: "public, max-age=31536000, immutable",
    }));
  }
  console.log(`  [${i + 1}/${plan.length}] ${key} ${skip ? "(déjà en ligne)" : "envoyée"}`);
  rows.push({ slug: p.slug, url: `${endpoint}/${bucket}/${key}`, names: namesBySlug.get(p.slug) ?? [] });
}

const q = (s) => `'${s.replace(/'/g, "''")}'`;
const sql = `-- Physio-App — Migration 0074 : vidéos de démonstration des exercices
-- Générée par scripts/videos-envoyer.mjs le ${new Date().toISOString().slice(0, 10)}. Safe to re-run.
--
-- Ce que fait cette migration : renseigne exercises.media_url (l'adresse de
-- la vidéo) pour les exercices de la PLATEFORME filmés avec Jules le
-- 2026-10-30. Les vidéos sont chez Outscale (${endpoint}, bucket ${bucket}).
-- Rien d'autre : aucune règle d'accès (RLS), aucun patient, aucune séance,
-- aucun exercice créé par un kiné n'est touché. Une vidéo qui ne se charge pas
-- s'efface d'elle-même au profit du dessin (components/WorkoutSession.tsx).
--
-- Même méthode que 0060 / 0065 : sur Scalingo les tables sont en FORCE ROW
-- LEVEL SECURITY et les exercices de la plateforme ne sont modifiables par
-- personne via l'appli ; on lève FORCE le temps des UPDATE puis on le remet,
-- dans la transaction du script de migration.

alter table public.exercises no force row level security;

update public.exercises as e set media_url = v.url, media_start_seconds = 0
from (values
${rows.filter((r) => r.names.length).flatMap((r) => r.names.map((n) => `  (${q(n)}, ${q(r.url)})`)).join(",\n")}
) as v(name, url)
where e.name = v.name and e.created_by is null;

alter table public.exercises force row level security;
`;
const out = path.join(ROOT, "supabase", "migrations", "0074_exercise_videos.sql");
fs.writeFileSync(out, sql);
console.log(`\n${rows.length} vidéos en ligne. Migration écrite : supabase/migrations/0074_exercise_videos.sql (non appliquée).`);
