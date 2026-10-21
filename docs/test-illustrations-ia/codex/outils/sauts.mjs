// Détecte les « sauts » dans une animation 8 images : un passage d'une image à
// la suivante beaucoup plus brutal que les autres (le mouvement doit rester
// constant, Philippe 2026-10-18). Mesure : part des pixels du dessin qui
// changent entre deux images consécutives (1→2 … 7→8).
//   node sauts.mjs <dossier> [...]      ou   node sauts.mjs --tous
// Affiche, pour chaque animation suspecte, l'étape la plus brutale et son
// rapport à l'étape médiane.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
const sharp = createRequire("C:/Users/ASUS/dev/Physio-App/package.json")("sharp");

const HERE = path.dirname(new URL(import.meta.url).pathname).replace(/^\/(\w:)/, "$1");
const ROOT = path.join(HERE, "..");
const S = 128;

async function mask(file) {
  const { data } = await sharp(file).resize(S, S).flatten({ background: "#fff" }).greyscale().raw().toBuffer({ resolveWithObject: true });
  return Uint8Array.from(data, (v) => (v < 200 ? 1 : 0));
}

async function check(dir) {
  const m = [];
  for (let i = 1; i <= 8; i++) m.push(await mask(path.join(dir, "svg", `frame-${i}.svg`)));
  const steps = [];
  for (let i = 0; i < 7; i++) {
    let diff = 0, ink = 0;
    for (let p = 0; p < S * S; p++) { diff += m[i][p] ^ m[i + 1][p]; ink += m[i][p] | m[i + 1][p]; }
    steps.push(ink ? diff / ink : 0);
  }
  const sorted = [...steps].sort((a, b) => a - b);
  const med = sorted[3];
  const max = Math.max(...steps);
  const at = steps.indexOf(max) + 1;
  // Amplitude totale : ce qui change entre le premier et le dernier dessin.
  let d18 = 0, i18 = 0;
  for (let p = 0; p < S * S; p++) { d18 += m[0][p] ^ m[7][p]; i18 += m[0][p] | m[7][p]; }
  const amp = i18 ? d18 / i18 : 0;
  // Suspect : une étape > 2,2 fois la médiane et vraiment visible (> 25 % du dessin change).
  return { steps, med, max, at, amp, suspect: max > 0.25 && max > 2.2 * Math.max(med, 0.04) };
}

const argv = process.argv.slice(2);
const dirs = argv[0] === "--tous"
  ? ["out", "out-nouveaux"].flatMap((d) => fs.readdirSync(path.join(ROOT, d)).map((s) => path.join(ROOT, d, s))).filter((d) => fs.existsSync(path.join(d, "svg", "frame-8.svg")))
  : argv;
let n = 0;
const faibles = [];
for (const d of dirs) {
  const r = await check(d);
  faibles.push([r.amp, path.relative(ROOT, d).replace(/\\/g, "/")]);
  if (r.suspect || argv[0] !== "--tous") {
    n += r.suspect ? 1 : 0;
    console.log(`${r.suspect ? "SAUT" : "ok  "} ${path.relative(ROOT, d).replace(/\\/g, "/")}  image ${r.at}→${r.at + 1} : ${(r.max * 100).toFixed(0)} % (médiane ${(r.med * 100).toFixed(0)} %)  [${r.steps.map((s) => (s * 100).toFixed(0)).join(" ")}]`);
  }
}
if (argv[0] === "--tous") {
  console.log(n, "animations suspectes sur", dirs.length);
  // Mouvement presque invisible : moins de 12 % du dessin change entre le début et la fin.
  const f = faibles.filter(([a]) => a < 0.12).sort((a, b) => a[0] - b[0]);
  console.log(`\nMOUVEMENT FAIBLE (${f.length}) :`);
  for (const [a, d] of f) console.log(`  ${(a * 100).toFixed(0)} %  ${d}`);
}
