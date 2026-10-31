// Met en service des animations 8 images validées dans l'appli.
//   node installer.mjs <slug> [<slug> ...]   ces dessins-là
//   node installer.mjs --tous                 les 326 dessins de la banque
//   node installer.mjs --retirer <slug> ...   revient aux 3 dessins d'origine
// Copie svg/frame-1..8.svg vers public/exercise-illustrations/<slug>/anim-1..8.svg
// (les dessins d'origine frame-1..3.svg ne sont pas touchés) et réécrit la
// liste EIGHT_FRAME_SLUGS de lib/exercise/illustrationFrames.ts.
// À lancer seulement pour des dessins validés par Philippe et le kiné partenaire.
import fs from "node:fs";
import path from "node:path";

const HERE = path.dirname(new URL(import.meta.url).pathname).replace(/^\/(\w:)/, "$1");
const ROOT = "C:/Users/ASUS/dev/Physio-App";
const BANK = path.join(ROOT, "public/exercise-illustrations");
const LIST = path.join(ROOT, "lib/exercise/illustrationFrames.ts");
// Pour ces exercices, la version refaite sur description (out-nouveaux) est
// meilleure que celle tirée des 3 dessins d'origine (le mouvement s'y voyait à peine).
const PREFERER_NOUVEAUX = new Set(["knee-to-wall", "codman-pendulum"]);

function source(slug) {
  const dirs = PREFERER_NOUVEAUX.has(slug) ? ["out-nouveaux", "out"] : ["out", "out-nouveaux", "out-jules"];
  for (const d of dirs) {
    const p = path.join(HERE, "..", d, slug, "svg");
    if (fs.existsSync(path.join(p, "frame-8.svg"))) return p;
  }
  return null;
}

const src = fs.readFileSync(LIST, "utf8");
const current = new Set([...src.matchAll(/"([a-z0-9-]+)"/g)].map((m) => m[1]));
const argv = process.argv.slice(2);
const retirer = argv[0] === "--retirer";
// --banque : les dessins utilisés par les exercices de la banque après la
// simplification (illustrationMap.ts moins les exercices retirés de
// docs/simplification-banque.md), nouveaux exercices compris.
function banque() {
  const map = fs.readFileSync(path.join(ROOT, "lib/exercise/illustrationMap.ts"), "utf8");
  const md = fs.readFileSync(path.join(ROOT, "docs/simplification-banque.md"), "utf8");
  const retires = new Set([...md.matchAll(/^\| ([^|]+?) \| [^|]+ \| [^|]+ \|$/gm)].map((m) => m[1]));
  return [...new Set([...map.matchAll(/^\s*"([^"]+)":\s*"([^"]+)"/gm)].filter((m) => !retires.has(m[1])).map((m) => m[2]))];
}
const slugs = argv[0] === "--tous" ? fs.readdirSync(BANK).filter((s) => fs.existsSync(path.join(BANK, s, "frame-1.svg")))
  : argv[0] === "--banque" ? banque()
  : argv.filter((a) => !a.startsWith("--"));

for (const slug of slugs) {
  const dest = path.join(BANK, slug);
  if (retirer) {
    current.delete(slug);
    for (let i = 1; i <= 8; i++) fs.rmSync(path.join(dest, `anim-${i}.svg`), { force: true });
    console.log("retiré", slug);
    continue;
  }
  const from = source(slug);
  if (!from) { console.log("pas d'animation", slug); continue; }
  // Copie allégée : coordonnées arrondies à l'unité (dessin tracé en 1024 px,
  // affiché en 512 : un demi-pixel de précision, invisible) et espaces
  // superflus retirés — environ deux fois plus léger à télécharger.
  const copy = (src, dst) => {
    const svg = fs.readFileSync(src, "utf8").replace(/ d="([^"]+)"/, (_, d) =>
      ` d="${d.replace(/-?\d+\.\d+/g, (n) => String(Math.round(Number(n)))).replace(/,\s*/g, " ").replace(/\s+/g, " ").replace(/ ?([MCLZz]) ?/g, "$1")}"`);
    fs.writeFileSync(dst, svg);
  };
  // Nouvel exercice : pas encore de dessins fixes. frame-1 sert d'image fixe
  // (vignettes) ; frame-1..3 = début, milieu, fin de l'animation.
  if (!fs.existsSync(path.join(dest, "frame-1.svg"))) {
    fs.mkdirSync(dest, { recursive: true });
    [1, 5, 8].forEach((f, i) => copy(path.join(from, `frame-${f}.svg`), path.join(dest, `frame-${i + 1}.svg`)));
  }
  for (let i = 1; i <= 8; i++) copy(path.join(from, `frame-${i}.svg`), path.join(dest, `anim-${i}.svg`));
  current.add(slug);
  console.log("installé", slug);
}

const list = [...current].sort().map((s) => `  "${s}",`).join("\n");
fs.writeFileSync(LIST, src.replace(/new Set<string>\(\[[\s\S]*?\]\)/, `new Set<string>([${list ? `\n${list}\n` : ""}])`));
console.log(current.size, "dessins en 8 images");
