// Page de relecture ciblée : 1) toutes les animations corrigées (passes de
// corrections 1 à 3), rangées par zone ; 2) les exercices proposés au retrait,
// avec l'exercice qui les remplace et la raison.
//   node galerie-revue.mjs   →  ../revue.html (ouvrir avec node serveur.mjs)
import fs from "node:fs";
import path from "node:path";
import { CORRECTIONS } from "./corrections.mjs";
import { CORRECTIONS2 } from "./corrections2.mjs";
import { CORRECTIONS3 } from "./corrections3.mjs";
import { CORRECTIONS4 } from "./corrections4.mjs";

const HERE = path.dirname(new URL(import.meta.url).pathname).replace(/^\/(\w:)/, "$1");
const ROOT = path.join(HERE, "..");
const APP = "C:/Users/ASUS/dev/Physio-App";
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

// Zone de chaque animation : reprise de la galerie complète (même règle).
const galerie = fs.readFileSync(path.join(ROOT, "galerie.html"), "utf8");
const zoneOf = new Map();
for (const part of galerie.split('<h2 id="').slice(1)) {
  const title = part.slice(part.indexOf(">") + 1, part.indexOf(" <span>"));
  for (const m of part.matchAll(/<img src="([^"]+)\/apercu.gif"/g)) zoneOf.set(m[1], title);
}

// 1. Corrigés : la passe la plus récente l'emporte.
const corr = [...CORRECTIONS4, ...CORRECTIONS3, ...CORRECTIONS2, ...CORRECTIONS].filter((e, i, all) => all.findIndex((f) => f.slug === e.slug) === i);
const byZone = new Map();
for (const e of corr) {
  const src = `${e.dir}/${e.slug}`;
  if (!fs.existsSync(path.join(ROOT, src, "apercu.gif"))) continue;
  const z = zoneOf.get(src) ?? "Autres";
  if (z.startsWith("Proposés")) continue; // corrigé puis proposé au retrait : montré en partie 2
  (byZone.get(z) ?? byZone.set(z, []).get(z)).push({ src, name: e.fr });
}
let n1 = 0, part1 = "";
for (const [z, list] of byZone) {
  list.sort((a, b) => a.name.localeCompare(b.name, "fr"));
  n1 += list.length;
  part1 += `<h3>${esc(z)} <span>${list.length}</span></h3><div class="g">`;
  for (const c of list) part1 += `<figure><img src="${c.src}/apercu.gif" loading="lazy" alt=""><figcaption>${esc(c.name)}</figcaption></figure>`;
  part1 += "</div>";
}

// 2. Proposés au retrait (docs/simplification-banque.md).
const md = fs.readFileSync(path.join(APP, "docs/simplification-banque.md"), "utf8");
const map = fs.readFileSync(path.join(APP, "lib/exercise/illustrationMap.ts"), "utf8");
const slugOf = new Map([...map.matchAll(/^\s*"([^"]+)":\s*"([^"]+)"/gm)].map((m) => [m[1], m[2]]));
let n2 = 0, part2 = "";
for (const sec of md.split(/^## /m).slice(1)) {
  const title = sec.slice(0, sec.indexOf("\n"));
  const rows = [...sec.matchAll(/^\| ([^|]+?) \| ([^|]+?) \| ([^|]+?) \|$/gm)].filter((m) => m[1] !== "Retiré");
  n2 += rows.length;
  part2 += `<h3>${esc(title)}</h3><div class="g">`;
  for (const [, drop, keep, why] of rows) {
    const s = slugOf.get(drop);
    const img = s && fs.existsSync(path.join(ROOT, "out", s, "apercu.gif")) ? `<img src="out/${s}/apercu.gif" loading="lazy" alt="">` : `<div class="no">pas de dessin</div>`;
    part2 += `<figure>${img}<figcaption><b>${esc(drop)}</b><small>→ remplacé par ${esc(keep)}</small><small>${esc(why)}</small></figcaption></figure>`;
  }
  part2 += "</div>";
}

fs.writeFileSync(
  path.join(ROOT, "revue.html"),
  `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Corrigés et retraits</title>
<style>body{font:14px system-ui;margin:0;background:#f8fafc;color:#0f172a}
header{background:#fff;border-bottom:1px solid #e2e8f0;padding:10px 16px}h1{font-size:16px;margin:0 0 6px}
nav a{font-size:13px;color:#1d4ed8;margin-right:14px}main{padding:0 16px 40px}
h2{font-size:16px;margin:24px 0 4px;scroll-margin-top:10px}h3{font-size:14px;margin:16px 0 8px}h3 span{color:#64748b;font-weight:400}
.g{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:10px}
figure{margin:0;background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:6px}
img,.no{width:100%;aspect-ratio:1;display:block}.no{display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:12px}
figcaption{font-size:12px;text-align:center;line-height:1.3}small{display:block;color:#64748b;font-size:11px}
#retrait figure{border-color:#fecaca;background:#fff7f7}</style>
<header><h1>Relecture — ${n1} animations corrigées, ${n2} exercices proposés au retrait</h1>
<nav><a href="#corriges">1. Corrigés (${n1})</a><a href="#retrait">2. Proposés au retrait (${n2})</a></nav></header>
<main><h2 id="corriges">1. Animations corrigées (${n1})</h2>${part1}
<h2 id="retrait">2. Proposés au retrait (${n2}) — rien n'est supprimé sans votre accord</h2><div id="retrait">${part2}</div></main>`,
);
console.log("revue.html :", n1, "corrigés,", n2, "proposés au retrait");
