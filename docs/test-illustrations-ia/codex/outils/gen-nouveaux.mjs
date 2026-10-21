// Génère les planches de 8 dessins des exercices SANS vrais dessins
// (outils/nouveaux.mjs), à partir d'une description du mouvement et d'un
// dessin existant comme modèle de style.
//   node gen-nouveaux.mjs              tous ceux qui ne sont pas encore faits
//   node gen-nouveaux.mjs <slug> ...   seulement ceux-là
// Résultat : ../out-nouveaux/<slug>/sheet.png, svg/frame-1..8.svg, apercu.gif.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { NOUVEAUX } from "./nouveaux.mjs";
import { REFAIRE } from "./refaire.mjs";
import { CORRECTIONS as C1 } from "./corrections.mjs";
import { CORRECTIONS2 } from "./corrections2.mjs";
import { CORRECTIONS3 } from "./corrections3.mjs";
import { CORRECTIONS4 } from "./corrections4.mjs";
// Une entrée d'une passe plus récente remplace celle de même slug.
const CORRECTIONS = [...CORRECTIONS4, ...CORRECTIONS3, ...CORRECTIONS2, ...C1].filter((e, i, all) => all.findIndex((f) => f.slug === e.slug) === i);
const sharp = createRequire("C:/Users/ASUS/dev/Physio-App/package.json")("sharp");

const HERE = path.dirname(new URL(import.meta.url).pathname).replace(/^\/(\w:)/, "$1");
const BANK = "C:/Users/ASUS/dev/Physio-App/public/exercise-illustrations";
let OUT = path.join(HERE, "..", "out-nouveaux");
const GENERATED = path.join(os.homedir(), ".codex", "generated_images");

function prompt(e) {
  const order = e.hold
    ? `This is a static HOLD: frame 1 = ${e.start}, frames 2 to 8 = ${e.end}, the position held with only a very slight breathing movement.`
    : e.bothSides
      ? `Frame 1 = the neutral centered position, perfectly symmetrical, facing the viewer. Frame 8 = ${e.end}. Frames 2 to 7 are the in-between positions with EQUAL steps. The movement goes to ONE side only (the right side of the image).`
      : `Frame 1 = ${e.start}. Frame 8 = ${e.end}. Frames 2 to 7 are the in-between positions with EQUAL steps, so the 8 frames play as one smooth animation.`;
  return `Use your image generation tool. Image 1 is a STYLE reference from an exercise illustration library: copy exactly its drawing style (flat blue line art, #2563eb lines on pure white, same line thickness, same anatomical muscle details, same faceless head, same shorts), but NOT necessarily its pose or equipment.
Draw the exercise "${e.fr}". View: ${e.view}.
Generate ONE image: a sprite sheet of 8 animation frames of this exercise, in a grid of 4 columns x 2 rows, read left to right then top to bottom.
${order}
Same man in every frame, same camera angle, same scale in every frame, the body resting on the same horizontal ground line in every cell, figure centered horizontally in its cell. Draw only the equipment named above, clearly.
Thin light grey lines between cells, no numbers, no text, no shadow.${e.extra ? `\n${e.extra}` : ""}
Do not write any file: just generate the image.`;
}

async function one(e) {
  const dir = path.join(e.dir ? path.join(HERE, "..", e.dir) : OUT, e.slug);
  if (fs.existsSync(path.join(dir, "apercu.gif"))) return console.log("déjà fait", e.slug);
  fs.mkdirSync(dir, { recursive: true });
  const ref = path.join(dir, "ref-style.png");
  await sharp(path.join(BANK, e.ref, "frame-1.svg"), { density: 150 })
    .resize(1024, 1024, { fit: "contain", background: "#fff" })
    .flatten({ background: "#fff" })
    .png()
    .toFile(ref);
  const t0 = Date.now();
  const run = spawnSync("codex", ["exec", "--skip-git-repo-check", "--ephemeral", "-i", ref, "-"], {
    input: prompt(e),
    encoding: "utf8",
    shell: true,
    maxBuffer: 1 << 26,
  });
  const log = (run.stdout ?? "") + (run.stderr ?? "");
  fs.writeFileSync(path.join(dir, "codex.log"), log);
  const session = log.match(/session id:\s*([0-9a-f-]+)/)?.[1];
  const folder = session && path.join(GENERATED, session);
  const pngs = folder && fs.existsSync(folder) ? fs.readdirSync(folder).filter((f) => f.endsWith(".png")) : [];
  if (!pngs.length) {
    if (/moderation_blocked/.test(log)) return console.log("refusé par le filtre de sécurité OpenAI", e.slug, "(reformuler)");
    if (/usage limit|rate limit|quota/i.test(log)) throw new Error("Limite d'usage Codex atteinte : relancer plus tard (" + e.slug + ")");
    return console.log("échec (pas d'image)", e.slug, "voir codex.log");
  }
  fs.copyFileSync(path.join(folder, pngs[pngs.length - 1]), path.join(dir, "sheet.png"));
  const cut = spawnSync("node", [path.join(HERE, "cut.mjs"), dir, ...(e.bothSides ? ["--miroir"] : []), ...(e.loop ? ["--boucle"] : []), ...(e.saut ? ["--saut"] : [])], { encoding: "utf8" });
  if (cut.status !== 0) return console.log("découpe impossible", e.slug, cut.stderr.slice(0, 200));
  console.log("ok", e.slug, Math.round((Date.now() - t0) / 1000) + " s");
}

const argv = process.argv.slice(2);
const refaire = argv[0] === "--refaire";
const corrections = argv[0] === "--corrections";
const source = corrections ? CORRECTIONS : refaire ? REFAIRE : NOUVEAUX;
if (refaire) OUT = path.join(HERE, "..", "out");
const want = refaire || corrections ? argv.slice(1) : argv;
const list = want.length ? source.filter((e) => want.includes(e.slug)) : source;
for (const e of list) {
  try {
    await one(e);
  } catch (err) {
    console.log(err.message);
    if (/Limite/.test(err.message)) process.exit(2);
  }
}
