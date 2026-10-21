// Seulement les nouveaux exercices (pas encore en base), tirés de banque.html.
//   node galerie-banque.mjs && node galerie-nouveaux.mjs   →  ../nouveaux.html
import fs from "node:fs";
import path from "node:path";

const HERE = path.dirname(new URL(import.meta.url).pathname).replace(/^\/(\w:)/, "$1");
const ROOT = path.join(HERE, "..");
const html = fs.readFileSync(path.join(ROOT, "banque.html"), "utf8");
const head = html.slice(0, html.indexOf("<header>"));
let total = 0, nav = "", body = "";
for (const part of html.split('<h2 id="').slice(1)) {
  const id = part.slice(0, part.indexOf('"'));
  const zone = part.slice(part.indexOf(">") + 1, part.indexOf(" <span>"));
  const figs = [...part.matchAll(/<figure>.*?<\/figure>/gs)].map((m) => m[0]).filter((f) => f.includes("<em>nouveau</em>"));
  if (!figs.length) continue;
  total += figs.length;
  nav += `<a href="#${id}">${zone} <b>${figs.length}</b></a>`;
  body += `<h2 id="${id}">${zone} <span>${figs.length}</span></h2><div class="g">${figs.join("")}</div>`;
}
fs.writeFileSync(
  path.join(ROOT, "nouveaux.html"),
  `${head.replace(/<title>[^<]*<\/title>/, "<title>Nouveaux exercices</title>")}<header><h1>Nouveaux exercices — ${total}</h1><p>Pas encore dans la base : à faire trier par le kiné avant de les ajouter.</p><nav>${nav}</nav></header><main>${body}</main>`,
);
console.log("nouveaux.html :", total);
