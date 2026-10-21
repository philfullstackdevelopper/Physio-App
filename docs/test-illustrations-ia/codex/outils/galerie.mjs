// Page de relecture : toutes les animations 8 images, rangées par partie du
// corps (même règle que les listes de l'appli : chaque exercice une seule
// fois, sous sa zone de plus petite position dans body_parts).
//   node galerie.mjs   →  ../galerie.html   (à ouvrir avec node serveur.mjs)
import fs from "node:fs";
import path from "node:path";
import { NOUVEAUX } from "./nouveaux.mjs";
import { REFAIRE } from "./refaire.mjs";
import { CORRECTIONS } from "./corrections.mjs";
import { CORRECTIONS2 } from "./corrections2.mjs";

const HERE = path.dirname(new URL(import.meta.url).pathname).replace(/^\/(\w:)/, "$1");
const ROOT = path.join(HERE, "..");
const APP = "C:/Users/ASUS/dev/Physio-App";

// Ordre des zones = body_parts.position (supabase/migrations/0032).
const ZONES = [
  "Cheville & pied",
  "Genou & jambe",
  "Hanche & fessiers",
  "Dos & lombaires",
  "Cervicales & cou",
  "Épaule",
  "Poignet, main & coude",
  "Tronc, gainage & abdominaux",
  "Équilibre & général",
];

// Exercices de la banque : nom → dessin (illustrationMap.ts), nom → zones (relecture CSV).
const map = fs.readFileSync(path.join(APP, "lib/exercise/illustrationMap.ts"), "utf8");
const nameToSlug = [...map.matchAll(/^\s*"([^"]+)":\s*"([^"]+)"/gm)].map((m) => [m[1], m[2]]);
const csv = fs.readFileSync(path.join(APP, "docs/relecture-materiel-exercices.csv"), "utf8").replace(/^\uFEFF/, "");
const zonesOf = new Map();
for (const line of csv.split(/\r?\n/).slice(1)) {
  const m = line.match(/^"([^"]*)";"([^"]*)"/);
  if (m) zonesOf.set(m[1], ZONES.filter((z) => m[2].includes(z)));
}
const slugZones = new Map();
const slugNames = new Map();
for (const [name, slug] of nameToSlug) {
  for (const z of zonesOf.get(name) ?? []) (slugZones.get(slug) ?? slugZones.set(slug, new Set()).get(slug)).add(z);
  (slugNames.get(slug) ?? slugNames.set(slug, []).get(slug)).push(name);
}

// Nouveaux exercices (pas encore en base) : zone choisie d'après la liste
// docs/exercices-a-illustrer.md.
const ZONE_NOUVEAUX = {
  "Cheville & pied": ["ankle-alphabet", "plantar-fascia-stretch", "short-foot", "toe-pick-up", "towel-curl"],
  "Genou & jambe": ["patella-mobilization", "prone-quad-stretch", "seated-knee-flexion", "spanish-squat", "standing-hamstring-curl", "sciatic-nerve-glide"],
  "Hanche & fessiers": ["dowel-hip-hinge", "figure-four-stretch", "it-band-stretch", "prone-hip-extension", "quadruped-hip-circles", "seated-hip-rotation", "side-lying-hip-adduction"],
  "Dos & lombaires": ["standing-side-bend-stretch", "thoracic-extension-chair", "thread-the-needle"],
  "Cervicales & cou": ["cervical-flexion-extension", "cervical-rotation", "cervical-side-bend", "levator-scapulae-stretch", "mckenzie-cervical", "scalene-stretch", "supine-chin-nod", "upper-trap-stretch"],
  "Épaule": ["external-rotation-90", "shoulder-isometrics-wall", "shoulder-pulley", "side-lying-external-rotation", "sleeper-stretch", "towel-internal-rotation", "wall-slides"],
  "Poignet, main & coude": ["finger-extension-band", "foam-ball-grip", "forearm-hammer-rotation", "tendon-glides", "thumb-opposition", "wrist-deviation", "wrist-flexor-stretch"],
  "Équilibre & général": ["diaphragmatic-breathing", "floor-to-stand", "heel-toe-walk", "lateral-weight-shift", "obstacle-step-over", "pursed-lip-breathing", "tandem-walk"],
};
// Les 24 exercices P1 (migration 0068) ne sont pas dans le CSV de relecture :
// leur zone principale vient de cette migration.
const ZONE_P1 = {
  "Cheville & pied": ["ankle-dorsiflexion-band", "ankle-plantar-flexion-band", "ankle-inversion-band", "ankle-eversion-band", "knee-to-wall", "single-leg-stance"],
  "Genou & jambe": ["quad-set", "heel-slide", "straight-leg-raise", "terminal-knee-extension", "passive-knee-extension", "y-balance", "hop-and-stick", "sit-to-stand", "ball-squeeze"],
  "Dos & lombaires": ["prone-press-up", "pelvic-tilt", "knee-to-chest"],
  "Cervicales & cou": ["chin-tuck", "cervical-isometrics"],
  "Épaule": ["band-shoulder-external-rotation", "band-shoulder-internal-rotation", "codman-pendulum", "supine-stick-shoulder-flexion"],
};
for (const [z, slugs] of Object.entries(ZONE_P1))
  for (const s of slugs) if (!slugZones.has(s)) slugZones.set(s, new Set([z]));
const nouveauZone = new Map(Object.entries(ZONE_NOUVEAUX).flatMap(([z, s]) => s.map((x) => [x, z])));
const fr = new Map([...NOUVEAUX, ...REFAIRE, ...CORRECTIONS, ...CORRECTIONS2].map((e) => [e.slug, e.fr]));
const corriges = new Set([...CORRECTIONS, ...CORRECTIONS2].map((e) => e.slug));
const refaits = new Set(REFAIRE.map((e) => e.slug));
const PREFERER_NOUVEAUX = new Set(["knee-to-wall", "codman-pendulum"]); // comme installer.mjs

// Exercices proposés au retrait (docs/simplification-banque.md) : un dessin
// part en bas de page seulement si TOUS les exercices qui l'utilisent sont retirés.
const md = fs.readFileSync(path.join(APP, "docs/simplification-banque.md"), "utf8");
const retires = new Set([...md.matchAll(/^\| ([^|]+?) \| [^|]+ \| [^|]+ \|$/gm)].map((m) => m[1]).filter((n) => n !== "Retiré"));
const RETRAIT = "Proposés au retrait (simplification de la banque)";
const slugRetire = (slug) => (slugNames.get(slug) ?? []).length > 0 && slugNames.get(slug).every((n) => retires.has(n));
const cards = new Map([...ZONES, RETRAIT].map((z) => [z, []]));
const sansZone = [];
const bank = fs.readdirSync(path.join(APP, "public/exercise-illustrations"));
for (const slug of bank) {
  const dir = PREFERER_NOUVEAUX.has(slug) ? "out-nouveaux" : "out";
  if (!fs.existsSync(path.join(ROOT, dir, slug, "apercu.gif"))) continue;
  const zone = ZONES.find((z) => slugZones.get(slug)?.has(z));
  const card = { slug, dir, name: fr.get(slug) ?? slugNames.get(slug)?.[0] ?? slug, tag: corriges.has(slug) ? "corrigé" : refaits.has(slug) ? "refait" : PREFERER_NOUVEAUX.has(slug) ? "refait" : "" };
  (slugRetire(slug) ? cards.get(RETRAIT) : zone ? cards.get(zone) : sansZone).push(card);
}
for (const e of NOUVEAUX) {
  if (bank.includes(e.slug) || !fs.existsSync(path.join(ROOT, "out-nouveaux", e.slug, "apercu.gif"))) continue;
  const card = { slug: e.slug, dir: "out-nouveaux", name: fr.get(e.slug) ?? e.fr, tag: corriges.has(e.slug) ? "corrigé" : "nouveau" };
  const zone = nouveauZone.get(e.slug);
  (zone ? cards.get(zone) : sansZone).push(card);
}
if (sansZone.length) cards.set("Sans zone", sansZone);

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
let total = 0, nav = "", body = "";
for (const [zone, list] of cards) {
  if (!list.length) continue;
  list.sort((a, b) => a.name.localeCompare(b.name, "fr"));
  total += list.length;
  const id = zone.normalize("NFD").replace(/[^a-zA-Z]/g, "");
  nav += `<a href="#${id}">${esc(zone)} <b>${list.length}</b></a>`;
  body += `<h2 id="${id}">${esc(zone)} <span>${list.length}</span></h2><div class="g">`;
  for (const c of list)
    body += `<figure><img src="${c.dir}/${c.slug}/apercu.gif" loading="lazy" alt=""><figcaption>${esc(c.name)}${c.tag ? ` <em class="${c.tag}">${c.tag}</em>` : ""}<small>${c.slug}</small></figcaption></figure>`;
  body += "</div>";
}
fs.writeFileSync(
  path.join(ROOT, "galerie.html"),
  `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Animations par zone</title>
<style>body{font:14px system-ui;margin:0;background:#f8fafc;color:#0f172a}
header{background:#fff;border-bottom:1px solid #e2e8f0;padding:10px 16px;z-index:1}
h1{font-size:16px;margin:0 0 6px}nav{display:flex;flex-wrap:wrap;gap:6px}
nav a{font-size:12px;text-decoration:none;color:#1d4ed8;background:#eff6ff;border-radius:999px;padding:3px 10px}
main{padding:0 16px 40px}h2{font-size:15px;margin:22px 0 8px;scroll-margin-top:10px}h2 span{color:#64748b;font-weight:400}
.g{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:10px}
figure{margin:0;background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:6px}
img{width:100%;aspect-ratio:1;display:block}figcaption{font-size:12px;text-align:center;line-height:1.3}
small{display:block;color:#94a3b8;font-size:10px}em{font-style:normal;font-size:10px;border-radius:4px;padding:0 4px}
em.nouveau{background:#dcfce7;color:#166534}em.refait{background:#fef3c7;color:#92400e}em.corrigé{background:#dbeafe;color:#1e40af}</style>
<header><h1>Animations 8 images — ${total} exercices, par partie du corps</h1><nav>${nav}</nav></header><main>${body}</main>`,
);
console.log("galerie.html :", total, "exercices", [...cards].map(([z, l]) => `${z} ${l.length}`).join(" · "));
