#!/usr/bin/env node
// Prépare les vidéos du tournage avec Jules (2026-10-30) pour l'appli :
// une version de chaque vidéo finale prête à héberger, en qualité maximale, nommée d'après
// le dessin de l'exercice (slug de lib/exercise/illustrationMap.ts).
//
//   node scripts/videos-preparer.mjs            → encode dans videos-tournage/web/
//   node scripts/videos-preparer.mjs --liste    → affiche seulement la correspondance
//
// Entrée  : videos-tournage/final/IMG_xxxx-n_<nom>.mp4 (masters 1080×1920, ~1,4 Go)
// Sortie  : videos-tournage/web/<slug>.mp4 (QUALITÉ MAXIMALE validée par Philippe le
//           2026-10-31 : 1080×1920 comme l'iPhone, H.264 quasi sans perte (CRF 16,
//           veryslow), léger débruitage + netteté, SANS SON — Philippe,
//           2026-10-31 : « for now, I don't want any sound » —, lecture
//           immédiate « faststart »), + videos-tournage/web/correspondance.json
// Ces fichiers restent hors de git (videos-tournage/ est exclu).
// ffmpeg : variable FFMPEG, sinon C:/Users/ASUS/dev/outils-video (ffmpeg-static).

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, "$1")), "..");
const SRC = path.join(ROOT, "videos-tournage", "final");
const OUT = path.join(ROOT, "videos-tournage", "web");

// Vidéos dont le nom de fichier est une description en français (exercices
// ajoutés après le tournage) → slug du dessin. null = pas encore de dessin
// ni d'exercice dans la banque (vidéo gardée de côté).
const RENOMMAGE = {
  "etirement-du-mollet-et-des-flechisseurs-de-hanche-a-genou-co": "kneeling-calf-hip-flexor-wall-stretch",
  "etirement-des-flechisseurs-de-hanche-en-fente-contre-le-mur": "wall-lunge-hip-flexor-stretch",
  "enchainement-posture-de-l-enfant-extension-sur-les-mains-pro": "childs-pose-to-press-up",
  "etirement-des-ischios-une-jambe-pliee-sur-la-table-buste-ram": "standing-bent-leg-hamstring-stretch-table",
  "mouvement-leger-de-hanche-pas-l-appui-unipodal": "standing-lateral-pelvic-shift",
  "reeducation-de-l-epaule-a-plat-ventre-bras-tendus-sur-les-co": "prone-arm-raise-t",
  "sauts-ecartes-autour-du-step": "step-straddle-jump",
  "saut-du-step-avec-reception-stabilisee-deux-jambes": "step-drop-landing",
  "saut-du-step-avec-reception-stabilisee-sur-une-jambe": "step-drop-single-leg-landing",
  "seated-dumbbell-external-rotation-elbow-on-knee": "seated-external-rotation-elbow-on-knee",
  "prone-press-up-mckenzie": "prone-press-up",
  "upper-trapezius-stretch": "upper-trap-stretch",
  "active-cervical-rotation": "cervical-rotation",
  "ankle-circles": "ankle-alphabet",
  "terminal-knee-extension-band": "terminal-knee-extension",
  "y-balance-reach": "y-balance",
  "fente-arriere-enchainee-avec-montee-sur-step": null,
  "montee-sur-step-avec-rotation-pied-gauche-sur-le-step-puis-r": null,
};

// Slugs connus de l'appli (dessins reliés à au moins un exercice).
const mapSrc = fs.readFileSync(path.join(ROOT, "lib", "exercise", "illustrationMap.ts"), "utf8");
const knownSlugs = new Set([...mapSrc.matchAll(/":\s*"([a-z0-9-]+)"/g)].map((m) => m[1]));

const files = fs.readdirSync(SRC).filter((f) => f.endsWith(".mp4")).sort();
const plan = [];
const ecartees = [];
for (const f of files) {
  const m = /^IMG_(\d+)-\d+_(.+)\.mp4$/.exec(f);
  if (!m) { ecartees.push([f, "nom de fichier inattendu"]); continue; }
  const raw = m[2];
  const slug = raw in RENOMMAGE ? RENOMMAGE[raw] : raw;
  if (!slug) { ecartees.push([f, "exercice pas encore dans la banque"]); continue; }
  if (!knownSlugs.has(slug)) { ecartees.push([f, `dessin « ${slug} » inconnu de l'appli`]); continue; }
  if (plan.some((p) => p.slug === slug)) { ecartees.push([f, `doublon de « ${slug} » (on garde la première prise)`]); continue; }
  plan.push({ file: f, slug, clip: `IMG_${m[1]}` });
}

console.log(`${plan.length} vidéos à préparer, ${ecartees.length} mises de côté :`);
for (const [f, why] of ecartees) console.log(`  - ${f} : ${why}`);
if (process.argv.includes("--liste")) {
  for (const p of plan) console.log(`  ${p.clip}  →  ${p.slug}`);
  process.exit(0);
}

const ffmpeg = process.env.FFMPEG || createRequire("C:/Users/ASUS/dev/outils-video/package.json")("ffmpeg-static");
fs.mkdirSync(OUT, { recursive: true });
let total = 0;
for (const [i, p] of plan.entries()) {
  const dst = path.join(OUT, `${p.slug}.mp4`);
  if (!fs.existsSync(dst)) {
    execFileSync(ffmpeg, [
      "-y", "-loglevel", "error", "-i", path.join(SRC, p.file),
      "-vf", "hqdn3d=1.5:1.5:4:4,unsharp=5:5:0.45:5:5:0", "-c:v", "libx264", "-preset", "veryslow", "-tune", "film", "-crf", "16", "-profile:v", "high", "-pix_fmt", "yuv420p",
      "-an", "-movflags", "+faststart", dst,
    ]);
  }
  const size = fs.statSync(dst).size;
  total += size;
  console.log(`  [${i + 1}/${plan.length}] ${p.slug}.mp4  ${(size / 1e6).toFixed(1)} Mo`);
}
fs.writeFileSync(path.join(OUT, "correspondance.json"), JSON.stringify(plan, null, 2));
console.log(`\nTerminé : ${plan.length} vidéos, ${(total / 1e6).toFixed(0)} Mo au total, dans videos-tournage/web/.`);
