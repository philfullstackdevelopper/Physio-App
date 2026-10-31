// « Fente puis montée sur step » : remplace les images 4 et 5 et rapproche le
// step (même décalage dans les 8 images, il reste donc immobile pendant
// l'animation) pour que le pied gauche se pose entièrement dessus à l'image 4
// sans que le pied droit, planté, ne bouge.
//   node inserer-4-5.mjs <2-cases.png> <dossier-exercice>
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
const sharp = createRequire("C:/Users/ASUS/dev/Physio-App/package.json")("sharp");

const [newSheet, dir] = process.argv.slice(2);
const PNG = path.join(dir, "png");
const S = 1024, DX = -60; // décalage du step (vers le pied droit)
const STEP = { x0: 648, x1: 823, y0: 802, y1: 900 }; // step de l'image 2 (mesuré)

async function gray(input) {
  const { data, info } = await sharp(input).flatten({ background: "#fff" }).greyscale().raw().toBuffer({ resolveWithObject: true });
  return { data, W: info.width, H: info.height };
}
function maskPng(m, W, H) {
  const px = Buffer.alloc(W * H * 3, 255);
  for (let i = 0; i < W * H; i++) if (m[i]) { px[i * 3] = 37; px[i * 3 + 1] = 99; px[i * 3 + 2] = 235; }
  return sharp(px, { raw: { width: W, height: H, channels: 3 } }).png().toBuffer();
}

// Masque du step seul, pris dans l'image 2 (rien d'autre dessus).
const g2 = await gray(path.join(PNG, "frame-2.png"));
const stepM = new Uint8Array(S * S);
for (let y = STEP.y0 - 40; y <= STEP.y1 + 6; y++) for (let x = STEP.x0 - 12; x <= STEP.x1 + 12; x++) if (g2.data[y * S + x] < 150) stepM[y * S + x] = 1;
// Zone d'effacement : tout le cadre du step, un peu élargi.
const ERASE = { x0: STEP.x0 - 20, x1: STEP.x1 + 20, y0: STEP.y0 - 45, y1: STEP.y1 + 8 };
// Version élargie (pour bien effacer l'ancien step) et version décalée.
const eraseM = new Uint8Array(S * S);
for (let y = ERASE.y0; y <= ERASE.y1; y++) for (let x = ERASE.x0; x <= ERASE.x1; x++) eraseM[y * S + x] = 1;
const shifted = new Uint8Array(S * S);
for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) if (stepM[y * S + x] && x + DX >= 0) shifted[y * S + x + DX] = 1;
const stepPng = await maskPng(shifted, S, S);

// Image existante sans son step (on garde le pied posé dessus : rien au-dessus du haut du step).
async function withoutStep(k) {
  const g = await gray(path.join(PNG, `frame-${k}.png`));
  const m = new Uint8Array(S * S);
  // On efface tout l'ancien step, sauf le pied à chaussette posé dessus (zone remplie).
  const dark = (x, y) => x >= 0 && y >= 0 && x < S && y < S && g.data[y * S + x] < 150;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const i = y * S + x;
    if (!dark(x, y)) continue;
    if (eraseM[i]) {
      let d = 0;
      for (let dy = -5; dy <= 5; dy++) for (let dx = -5; dx <= 5; dx++) d += dark(x + dx, y + dy) ? 1 : 0;
      if (d < 100) continue; // trait du step : effacé
    }
    m[i] = 1;
  }
  return maskPng(m, S, S);
}

// Nouvelles images 4 et 5 (repères relevés à l'œil sur les 2 cases de Codex).
const NEW = [
  { scale: 675 / 700, from: { x: 470, y: 815 }, to: { x: 523, y: 900 }, step: [522, 700, 735, 820] },   // pied droit planté → même endroit
  { scale: 675 / 700, from: { x: 457, y: 715 }, to: { x: 675, y: 808 }, step: [418, 700, 628, 820] },   // pied gauche (chaussette) → comme à l'image 6
];
const meta = await sharp(newSheet).metadata();
const cw = Math.floor(meta.width / 2);
const newFrames = [];
for (let k = 0; k < 2; k++) {
  const buf = await sharp(newSheet).extract({ left: k * cw, top: 0, width: cw, height: meta.height }).toBuffer();
  const g = await gray(buf);
  const m = new Uint8Array(g.W * g.H);
  const [sx0, sy0, sx1, sy1] = NEW[k].step;
  for (let y = 0; y < g.H; y++) for (let x = 4; x < g.W - 4; x++) {
    const inStep = x >= sx0 && x <= sx1 && y >= sy0 && y <= sy1;
    if (g.data[y * g.W + x] < 150 && !inStep) m[y * g.W + x] = 1;
  }
  const sc = NEW[k].scale, W2 = Math.round(g.W * sc), H2 = Math.round(g.H * sc);
  const fig = await sharp(await maskPng(m, g.W, g.H)).resize(W2, H2).png().toBuffer();
  const dx = Math.round(NEW[k].to.x - NEW[k].from.x * sc), dy = Math.round(NEW[k].to.y - NEW[k].from.y * sc);
  const big = 2048, off = 512;
  const canvas = await sharp({ create: { width: big, height: big, channels: 3, background: "#fff" } })
    .composite([{ input: fig, left: off + dx, top: off + dy, blend: "multiply" }]).png().toBuffer();
  newFrames.push(await sharp(canvas).extract({ left: off, top: off, width: S, height: S }).png().toBuffer());
  console.log(`image ${k + 4} : décalage ${dx}, ${dy}`);
}

const frames = [];
for (let i = 1; i <= 8; i++) {
  const fig = i === 4 || i === 5 ? newFrames[i - 4] : await withoutStep(i);
  frames.push(await sharp({ create: { width: S, height: S, channels: 3, background: "#fff" } })
    .composite([{ input: fig, left: 0, top: 0, blend: "multiply" }, { input: stepPng, left: 0, top: 0, blend: "multiply" }]).png().toBuffer());
}
fs.copyFileSync(path.join(dir, "sheet.png"), path.join(dir, "sheet-avant-45.png"));
await sharp({ create: { width: S * 4, height: S * 2, channels: 3, background: "#fff" } })
  .composite(frames.map((input, i) => ({ input, left: (i % 4) * S, top: Math.floor(i / 4) * S })))
  .png().toFile(path.join(dir, "sheet.png"));
console.log("ok");
