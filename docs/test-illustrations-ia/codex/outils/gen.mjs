// Génère, pour chaque dessin de la banque, une planche de 8 images avec Codex
// (abonnement ChatGPT de Philippe, connexion `codex login`), puis la découpe.
//   node gen.mjs <slug> [<slug> ...]      un ou plusieurs dessins
//   node gen.mjs --tous                    les 326 dessins (reprend où il s'est arrêté)
// Les 3 dessins actuels de l'exercice servent de références (début, milieu,
// fin du mouvement) : rien à écrire exercice par exercice.
// Résultat : ../out/<slug>/sheet.png, svg/frame-1..8.svg, apercu.gif.
// Rien n'est copié dans public/ : la mise en ligne se fait après validation.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { REFAIRE } from "./refaire.mjs";
const sharp = createRequire("C:/Users/ASUS/dev/Physio-App/package.json")("sharp");

const HERE = path.dirname(new URL(import.meta.url).pathname).replace(/^\/(\w:)/, "$1");
const BANK = "C:/Users/ASUS/dev/Physio-App/public/exercise-illustrations";
const OUT = path.join(HERE, "..", "out");
const GENERATED = path.join(os.homedir(), ".codex", "generated_images");

const PROMPT = `Use your image generation tool. Images 1, 2 and 3 show one exercise in a flat blue line-art style, in movement order: image 1 = start, image 2 = middle, image 3 = end.
Generate ONE image: a sprite sheet of 8 animation frames of this exact exercise, in a grid of 4 columns x 2 rows, read left to right then top to bottom.
Frame 1 = exactly the pose of image 1, frame 8 = exactly the pose of image 3, image 2 is close to the middle of the movement. Frames 2 to 7 are the in-between poses with EQUAL steps, so the 8 frames play as one smooth animation.
Same man in every frame, same equipment, same camera angle as the references, same flat blue line-art style (#2563eb lines on pure white), same scale in every frame, the body resting on the same horizontal ground line in every cell, figure centered horizontally in its cell.
Thin light grey lines between cells, no numbers, no text, no shadow.
Do not write any file: just generate the image.`;

// Consignes particulières, ajoutées à la fin de la consigne générale.
// - Deux côtés (rotations) : les 3 dessins d'origine ne montrent qu'un côté ;
//   dessin 1 = un côté, milieu = de face, dessin 8 = l'autre côté, pour que
//   l'aller-retour couvre les deux (Philippe, 2026-10-17).
// - Position tenue (gainage) : on reste dans la position de gainage, sans
//   passer à genoux comme le faisaient les dessins d'origine (Philippe,
//   2026-10-17) ; seule une très légère respiration anime le dessin.
const BOTH_SIDES = `
IMPORTANT: ignore the camera angle of the references and the frame order rule above. Draw the man seen from the FRONT, facing the viewer, seated on the floor, knees bent and pointing toward the viewer, heels on the floor, torso leaning back slightly, holding the same equipment with both hands. Frame 1: torso facing the viewer, perfectly symmetrical, hands centered in front of the chest. Frames 2 to 8: the shoulders and torso rotate progressively toward the RIGHT side of the image, the hands moving to the right side of the image, furthest right in frame 8. The legs and hips do not move at all. No ground line.`;
// Ces exercices sont découpés avec --miroir : cut.mjs fabrique l'autre côté.
const HOLD = `
IMPORTANT: this is a static HOLD exercise. Ignore the frame order rule above and ignore any reference image where the knees touch the floor: all 8 frames show the SAME correct plank position (on the forearms and toes, body in one straight line from head to heels, knees off the floor). The only change between frames is a very slight breathing movement of the chest, so the animation looks alive but the position never changes.`;
const EXTRA = {
  "torso-twist-stretch": BOTH_SIDES,
  "russian-twist": BOTH_SIDES,
  "weighted-russian-twist": BOTH_SIDES,
  plank: HOLD,
};

async function refs(slug, dir) {
  const files = [];
  for (const f of [1, 2, 3]) {
    const svg = path.join(BANK, slug, `frame-${f}.svg`);
    if (!fs.existsSync(svg)) continue;
    const png = path.join(dir, `ref-${f}.png`);
    await sharp(svg, { density: 150 }).resize(1024, 1024, { fit: "contain", background: "#fff" }).flatten({ background: "#fff" }).png().toFile(png);
    files.push(png);
  }
  return files;
}

async function one(slug) {
  const dir = path.join(OUT, slug);
  if (fs.existsSync(path.join(dir, "apercu.gif"))) return console.log("déjà fait", slug);
  // Dessins d origine incohérents : refaits sur description (gen-nouveaux.mjs --refaire).
  if (REFAIRE.some((e) => e.slug === slug)) return console.log("à refaire sur description", slug);
  // Plusieurs files en parallèle : chacune réserve l'exercice avant de le faire.
  if (fs.existsSync(path.join(dir, "en-cours"))) return console.log("pris par une autre file", slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "en-cours"), String(process.pid));
  const images = await refs(slug, dir);
  if (images.length < 2) return console.log("pas assez de dessins de référence", slug);
  const args = ["exec", "--skip-git-repo-check", "--ephemeral", ...images.flatMap((p) => ["-i", p]), "-"];
  const t0 = Date.now();
  const run = spawnSync("codex", args, { input: PROMPT + (EXTRA[slug] ?? ""), encoding: "utf8", shell: true, maxBuffer: 1 << 26 });
  const log = (run.stdout ?? "") + (run.stderr ?? "");
  fs.writeFileSync(path.join(dir, "codex.log"), log);
  const session = log.match(/session id:\s*([0-9a-f-]+)/)?.[1];
  const folder = session && path.join(GENERATED, session);
  const pngs = folder && fs.existsSync(folder) ? fs.readdirSync(folder).filter((f) => f.endsWith(".png")) : [];
  if (!pngs.length) {
    // Limite d'usage atteinte ou refus : on s'arrête net pour ne rien gaspiller.
    if (/moderation_blocked/.test(log)) return console.log("refusé par le filtre de sécurité OpenAI", slug, "(reformuler)");
    if (/usage limit|rate limit|quota/i.test(log)) throw new Error("Limite d'usage Codex atteinte : relancer plus tard (" + slug + ")");
    return console.log("échec (pas d'image)", slug, "voir codex.log");
  }
  fs.copyFileSync(path.join(folder, pngs[pngs.length - 1]), path.join(dir, "sheet.png"));
  const cut = spawnSync("node", [path.join(HERE, "cut.mjs"), dir, ...(EXTRA[slug] === BOTH_SIDES ? ["--miroir"] : [])], { encoding: "utf8" });
  if (cut.status !== 0) return console.log("découpe impossible", slug, cut.stderr.slice(0, 200));
  console.log("ok", slug, Math.round((Date.now() - t0) / 1000) + " s");
}

const argv = process.argv.slice(2);
// Libère la réservation, seulement si c est la nôtre.
function release(slug) {
  const lock = path.join(OUT, slug, "en-cours");
  if (fs.existsSync(lock) && fs.readFileSync(lock, "utf8") === String(process.pid)) fs.rmSync(lock);
}
// --inverse : parcourt la banque en partant de la fin (deuxième file en parallèle).
let slugs = argv[0] === "--tous" ? fs.readdirSync(BANK).filter((s) => fs.existsSync(path.join(BANK, s, "frame-1.svg"))) : argv.filter((a) => !a.startsWith("--"));
if (argv.includes("--inverse")) slugs = slugs.reverse();
for (const s of slugs) {
  try {
    await one(s);
  } catch (e) {
    console.log(e.message);
    release(s);
    if (/Limite/.test(e.message)) process.exit(2);
  }
  release(s);
}
