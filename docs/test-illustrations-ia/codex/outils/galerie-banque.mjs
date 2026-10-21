// La nouvelle banque d'exercices, telle qu'elle sera après la simplification
// (docs/simplification-banque.md) : chaque exercice gardé avec son animation
// 8 images, rangé par partie du corps, plus les nouveaux exercices.
//   node galerie-banque.mjs   →  ../banque.html (ouvrir avec node serveur.mjs)
import fs from "node:fs";
import path from "node:path";
import { NOUVEAUX } from "./nouveaux.mjs";

const HERE = path.dirname(new URL(import.meta.url).pathname).replace(/^\/(\w:)/, "$1");
const ROOT = path.join(HERE, "..");
const APP = "C:/Users/ASUS/dev/Physio-App";
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const ZONES = ["Cheville & pied", "Genou & jambe", "Hanche & fessiers", "Dos & lombaires", "Cervicales & cou", "Épaule", "Poignet, main & coude", "Tronc, gainage & abdominaux", "Équilibre & général"];

// Exercices de la banque : nom, zones (CSV de relecture + P1 de la migration 0068).
const csv = fs.readFileSync(path.join(APP, "docs/relecture-materiel-exercices.csv"), "utf8").replace(/^\uFEFF/, "");
const ex = new Map();
for (const line of csv.split(/\r?\n/).slice(1)) {
  const m = line.match(/^"([^"]*)";"([^"]*)";"([^"]*)"/);
  if (m) ex.set(m[1], { zones: ZONES.filter((z) => m[2].includes(z)), equip: m[3] });
}
const map = fs.readFileSync(path.join(APP, "lib/exercise/illustrationMap.ts"), "utf8");
const slugOf = new Map([...map.matchAll(/^\s*"([^"]+)":\s*"([^"]+)"/gm)].map((m) => [m[1], m[2]]));
const P1 = {
  "Cheville & pied": ["ankle-dorsiflexion-band", "ankle-plantar-flexion-band", "ankle-inversion-band", "ankle-eversion-band", "knee-to-wall", "single-leg-stance"],
  "Genou & jambe": ["quad-set", "heel-slide", "straight-leg-raise", "terminal-knee-extension", "passive-knee-extension", "y-balance", "hop-and-stick", "sit-to-stand", "ball-squeeze"],
  "Dos & lombaires": ["prone-press-up", "pelvic-tilt", "knee-to-chest"],
  "Cervicales & cou": ["chin-tuck", "cervical-isometrics"],
  "Épaule": ["band-shoulder-external-rotation", "band-shoulder-internal-rotation", "codman-pendulum", "supine-stick-shoulder-flexion"],
};
const p1Zone = new Map(Object.entries(P1).flatMap(([z, l]) => l.map((s) => [s, z])));
for (const [name, slug] of slugOf) if (!ex.has(name) && p1Zone.has(slug)) ex.set(name, { zones: [p1Zone.get(slug)], equip: "" });

// Retirés (proposition de simplification).
const md = fs.readFileSync(path.join(APP, "docs/simplification-banque.md"), "utf8");
const retires = new Set([...md.matchAll(/^\| ([^|]+?) \| [^|]+ \| [^|]+ \|$/gm)].map((m) => m[1]));

// Où se trouve l'animation de chaque dessin (comme installer.mjs).
const PREFERER_NOUVEAUX = new Set(["knee-to-wall", "codman-pendulum"]);
const gif = (slug) => {
  for (const d of PREFERER_NOUVEAUX.has(slug) ? ["out-nouveaux", "out"] : ["out", "out-nouveaux"])
    if (fs.existsSync(path.join(ROOT, d, slug, "apercu.gif"))) return `${d}/${slug}/apercu.gif`;
  return null;
};

const cards = new Map(ZONES.map((z) => [z, []]));
let sans = 0;
for (const [name, info] of ex) {
  if (retires.has(name)) continue;
  const slug = slugOf.get(name);
  const zone = info.zones[0] ?? "Équilibre & général";
  cards.get(zone).push({ name, src: slug ? gif(slug) : null, tag: "" });
  if (!slug || !gif(slug)) sans++;
}
const ZN = {
  "Cheville & pied": ["ankle-alphabet", "plantar-fascia-stretch", "short-foot", "toe-pick-up", "towel-curl"],
  "Genou & jambe": ["lateral-jump-two-feet", "single-leg-hop-lateral", "single-leg-hop-forward", "sit-to-jump", "patella-mobilization", "prone-quad-stretch", "seated-knee-flexion", "spanish-squat", "standing-hamstring-curl", "sciatic-nerve-glide"],
  "Hanche & fessiers": ["walking-lunge-rotation", "dowel-hip-hinge", "figure-four-stretch", "it-band-stretch", "prone-hip-extension", "quadruped-hip-circles", "seated-hip-rotation", "side-lying-hip-adduction"],
  "Dos & lombaires": ["standing-side-bend-stretch", "thoracic-extension-chair", "thread-the-needle"],
  "Cervicales & cou": ["cervical-flexion-extension", "cervical-rotation", "cervical-side-bend", "levator-scapulae-stretch", "mckenzie-cervical", "scalene-stretch", "supine-chin-nod", "upper-trap-stretch"],
  "Épaule": ["external-rotation-90", "shoulder-isometrics-wall", "shoulder-pulley", "side-lying-external-rotation", "sleeper-stretch", "towel-internal-rotation", "wall-slides"],
  "Poignet, main & coude": ["finger-extension-band", "foam-ball-grip", "forearm-hammer-rotation", "tendon-glides", "thumb-opposition", "wrist-deviation", "wrist-flexor-stretch"],
  "Tronc, gainage & abdominaux": ["lunge-band-woodchop"],
  "Équilibre & général": ["diaphragmatic-breathing", "floor-to-stand", "heel-toe-walk", "lateral-weight-shift", "obstacle-step-over", "pursed-lip-breathing", "tandem-walk"],
};
const frOf = new Map(NOUVEAUX.map((e) => [e.slug, e.fr]));
let nNew = 0;
for (const [z, slugs] of Object.entries(ZN))
  for (const s of slugs) {
    if ([...ex.keys()].some((n) => slugOf.get(n) === s)) continue; // déjà utilisé par un exercice existant
    cards.get(z).push({ name: frOf.get(s) ?? s, src: gif(s), tag: "nouveau" });
    nNew++;
  }

let total = 0, nav = "", body = "";
for (const [zone, list] of cards) {
  list.sort((a, b) => a.name.localeCompare(b.name, "fr"));
  total += list.length;
  const id = zone.normalize("NFD").replace(/[^a-zA-Z]/g, "");
  nav += `<a href="#${id}">${esc(zone)} <b>${list.length}</b></a>`;
  body += `<h2 id="${id}">${esc(zone)} <span>${list.length}</span></h2><div class="g">`;
  for (const c of list)
    body += `<figure>${c.src ? `<img src="${c.src}" loading="lazy" alt="">` : `<div class="no">pas d'animation</div>`}<figcaption>${esc(c.name)}${c.tag ? ` <em>${c.tag}</em>` : ""}</figcaption></figure>`;
  body += "</div>";
}
fs.writeFileSync(
  path.join(ROOT, "banque.html"),
  `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Nouvelle banque d'exercices</title>
<style>body{font:14px system-ui;margin:0;background:#f8fafc;color:#0f172a}
header{background:#fff;border-bottom:1px solid #e2e8f0;padding:10px 16px}h1{font-size:16px;margin:0 0 4px}p{margin:0 0 8px;color:#475569;font-size:13px}
nav{display:flex;flex-wrap:wrap;gap:6px}nav a{font-size:12px;text-decoration:none;color:#1d4ed8;background:#eff6ff;border-radius:999px;padding:3px 10px}
main{padding:0 16px 40px}h2{font-size:15px;margin:22px 0 8px}h2 span{color:#64748b;font-weight:400}
.g{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px}
figure{margin:0;background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:6px}
img,.no{width:100%;aspect-ratio:1;display:block}.no{display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:12px}
figcaption{font-size:12px;text-align:center;line-height:1.3}em{font-style:normal;font-size:10px;border-radius:4px;padding:0 4px;background:#dcfce7;color:#166534}</style>
<header><h1>Nouvelle banque d'exercices — ${total} exercices</h1>
<p>${total - nNew} exercices gardés de la banque actuelle + ${nNew} nouveaux (à faire trier par le kiné avant mise en base). Animations en 8 images, pas encore en ligne.</p><nav>${nav}</nav></header><main>${body}</main>`,
);
console.log("banque.html :", total, "exercices (", nNew, "nouveaux ),", sans, "sans animation");
