// Remplace les images 3, 4, 5 de « Fente puis montée sur step » par celles
// dessinées à partir de l'image 2 (jambe droite plantée), recalées :
//  - même taille de personnage que l'image 2 ;
//  - images 3 et 4 : le pied droit (nu) exactement au même endroit que dans l'image 2 ;
//  - image 5 : le pied gauche (chaussette) au même endroit que dans l'image 6 ;
//  - le step de l'image 2 partout.
// Puis refait une planche 4×2 avec les 8 images, à découper avec cut.mjs.
//   node inserer-3-4-5.mjs <nouvelles-3-cases.png> <dossier-exercice>
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
const sharp = createRequire("C:/Users/ASUS/dev/Physio-App/package.json")("sharp");

const [newSheet, dir] = process.argv.slice(2);
const PNG = path.join(dir, "png");
const S = 1024;

async function gray(input) {
  const { data, info } = await sharp(input).flatten({ background: "#fff" }).greyscale().raw().toBuffer({ resolveWithObject: true });
  return { data, W: info.width, H: info.height };
}
const isDark = (g, x, y) => x >= 0 && y >= 0 && x < g.W && y < g.H && g.data[y * g.W + x] < 150;

// Step = les lignes horizontales longues en bas à droite.
function stepBox(g) {
  let x0 = g.W, x1 = 0, y0 = g.H, y1 = 0;
  for (let y = Math.floor(g.H * 0.55); y < g.H; y++) {
    let run = 0, start = 0;
    for (let x = Math.floor(g.W * 0.45); x <= g.W; x++) {
      if (x < g.W && isDark(g, x, y)) { if (!run) start = x; run++; }
      else { if (run > g.W * 0.08) { x0 = Math.min(x0, start); x1 = Math.max(x1, start + run); y0 = Math.min(y0, y); y1 = Math.max(y1, y); } run = 0; }
    }
  }
  return { x0, x1, y0, y1 };
}
function sockFoot(g, m) {
  let sx = 0, n = 0, maxY = 0, minX = g.W;
  for (let y = 5; y < g.H - 5; y++) for (let x = 5; x < g.W - 5; x++) {
    if (!m[y * g.W + x]) continue;
    let d = 0;
    for (let dy = -5; dy <= 5; dy++) for (let dx = -5; dx <= 5; dx++) d += m[(y + dy) * g.W + x + dx];
    if (d >= 115) { sx += x; n++; if (y > maxY) maxY = y; if (x < minX) minX = x; }
  }
  return n ? { x: sx / n, bottom: maxY } : null;
}
// Masque du personnage seul (step effacé, pied à chaussette protégé).
function figure(g) {
  const m = new Uint8Array(g.W * g.H);
  for (let i = 0; i < m.length; i++) m[i] = g.data[i] < 150 ? 1 : 0;
  const st = stepBox(g);
  const sock = sockFoot(g, m);
  const pad = Math.round(g.W * 0.02);
  for (let y = 0; y < g.H; y++) for (let x = 0; x < g.W; x++) {
    const inStep = x >= st.x0 - pad && x <= st.x1 + pad && y >= st.y0 - pad * 2 && y <= st.y1 + pad;
    const nearSock = sock && Math.abs(x - sock.x) < g.W * 0.07 && y < sock.bottom + 3;
    if (inStep && !nearSock) m[y * g.W + x] = 0;
  }
  let top = g.H, bottom = 0;
  for (let y = 0; y < g.H; y++) for (let x = 0; x < g.W; x++) if (m[y * g.W + x]) { top = Math.min(top, y); bottom = Math.max(bottom, y); }
  return { m, st, sock, top, bottom };
}
// Pied nu au sol : les pixels les plus bas hors chaussette ; orteils = x max.
function bareToes(g, f) {
  let bottom = 0;
  for (let y = 0; y < g.H; y++) for (let x = 0; x < g.W; x++)
    if (f.m[y * g.W + x] && !(f.sock && Math.abs(x - f.sock.x) < g.W * 0.08 && Math.abs(y - f.sock.bottom) < g.W * 0.08)) bottom = Math.max(bottom, y);
  let toes = 0;
  for (let y = bottom - Math.round(g.H * 0.012); y <= bottom; y++) for (let x = 0; x < g.W; x++)
    if (f.m[y * g.W + x] && !(f.sock && Math.abs(x - f.sock.x) < g.W * 0.08)) toes = Math.max(toes, x);
  return { x: toes, bottom };
}
function maskPng(m, W, H) {
  const px = Buffer.alloc(W * H * 3, 255);
  for (let i = 0; i < W * H; i++) if (m[i]) { px[i * 3] = 37; px[i * 3 + 1] = 99; px[i * 3 + 2] = 235; }
  return sharp(px, { raw: { width: W, height: H, channels: 3 } }).png().toBuffer();
}

// Références : images 2 et 6 actuelles (1024×1024, déjà recalées).
const g2 = await gray(path.join(PNG, "frame-2.png"));
const f2 = figure(g2);
const bare2 = bareToes(g2, f2);
const g6 = await gray(path.join(PNG, "frame-6.png"));
const f6 = figure(g6);
console.log("image 2 : pied nu", bare2, "hauteur", bare2.bottom - f2.top, "step", f2.st, "| image 6 : chaussette", f6.sock);
// Step de l'image 2 (sans rien d'autre).
const stepM = new Uint8Array(S * S);
const st = f2.st, pad = 20;
for (let y = st.y0 - 40; y <= st.y1 + pad; y++) for (let x = st.x0 - pad; x <= st.x1 + pad; x++) if (isDark(g2, x, y) && !f2.m[y * S + x]) stepM[y * S + x] = 1;
const stepPng = await maskPng(stepM, S, S);

// Les 3 nouvelles cases.
const meta = await sharp(newSheet).metadata();
const cw = Math.floor(meta.width / 3);
// Repères relevés à l'œil sur les 3 nouvelles cases (coordonnées de la case) :
// haut de la tête, orteils du pied nu au sol, pied à chaussette, cadre du step.
const NEW = [
  { head: 60, bare: { x: 445, bottom: 652 }, step: [467, 565, 626, 660] },
  { head: 60, bare: { x: 438, bottom: 652 }, sock: { x: 503, bottom: 575 }, step: [465, 565, 625, 660] },
  { head: 33, sock: { x: 463, bottom: 575 }, step: [469, 565, 628, 660] },
];
const cells = [];
for (let k = 0; k < 3; k++) {
  const buf = await sharp(newSheet).extract({ left: k * cw, top: 0, width: cw, height: meta.height }).toBuffer();
  const g = await gray(buf);
  const m = new Uint8Array(g.W * g.H);
  const [sx0, sy0, sx1, sy1] = NEW[k].step;
  for (let y = 0; y < g.H; y++) for (let x = 0; x < g.W; x++) {
    const inStep = x >= sx0 - 8 && x <= sx1 + 8 && y >= sy0 - 10 && y <= sy1 + 8;
    const nearSock = NEW[k].sock && Math.abs(x - NEW[k].sock.x) < 60 && y < NEW[k].sock.bottom + 4;
    if (g.data[y * g.W + x] < 150 && !(inStep && !nearSock) && x > 4 && x < g.W - 4) m[y * g.W + x] = 1;
  }
  cells.push({ g, f: { m, sock: NEW[k].sock, top: NEW[k].head }, bare: NEW[k].bare });
}
// Échelle : le personnage de la case 3 (debout, pied nu au sol) à la taille de l'image 2.
const scale = (bare2.bottom - f2.top) / (NEW[0].bare.bottom - NEW[0].head);
console.log("échelle", scale.toFixed(3));
const out = [];
for (let k = 0; k < 3; k++) {
  const { g, f, bare } = cells[k];
  const W2 = Math.round(g.W * scale), H2 = Math.round(g.H * scale);
  const fig = await sharp(await maskPng(f.m, g.W, g.H)).resize(W2, H2).png().toBuffer();
  let dx, dy;
  if (k < 2) { dx = Math.round(bare2.x - bare.x * scale); dy = Math.round(bare2.bottom - bare.bottom * scale); }
  else { dx = Math.round(f6.sock.x - f.sock.x * scale); dy = Math.round(f6.sock.bottom - f.sock.bottom * scale); }
  // On compose sur une grande toile puis on recadre au 1024 (les décalages peuvent être négatifs).
  const big = 2048, off = 512;
  const canvas = await sharp({ create: { width: big, height: big, channels: 3, background: "#fff" } })
    .composite([{ input: fig, left: off + dx, top: off + dy, blend: "multiply" }, { input: stepPng, left: off, top: off, blend: "multiply" }])
    .png().toBuffer();
  out.push(await sharp(canvas).extract({ left: off, top: off, width: S, height: S }).png().toBuffer());
  console.log(`image ${k + 3} : décalage ${dx}, ${dy}`);
}
// Planche 4×2 : 1, 2, nouvelles 3-4-5, 6, 7, 8.
const frames = [];
for (let i = 1; i <= 8; i++) frames.push(i >= 3 && i <= 5 ? out[i - 3] : fs.readFileSync(path.join(PNG, `frame-${i}.png`)));
fs.copyFileSync(path.join(dir, "sheet.png"), path.join(dir, "sheet-avant-345.png"));
await sharp({ create: { width: S * 4, height: S * 2, channels: 3, background: "#fff" } })
  .composite(frames.map((input, i) => ({ input, left: (i % 4) * S, top: Math.floor(i / 4) * S })))
  .png().toFile(path.join(dir, "sheet.png"));
console.log("ok");
