// Recompose la planche de « Fente au sol puis montée sur step » (reverse-lunge-to-step-up)
// pour que le pied d'appui ne glisse jamais et que les jambes ne s'échangent pas :
//  - le step est celui de la case 4 (où les deux pieds sont posés), au même endroit partout ;
//  - cases 1 à 3 : le personnage est décalé pour que le pied nu (au sol) reste au même endroit ;
//  - cases 5 à 8 : il est décalé pour que le pied à chaussette (sur le step) reste au même endroit.
//   node recaler-fente-step.mjs <planche-source.png> <planche-sortie.png>
import { createRequire } from "node:module";
const sharp = createRequire("C:/Users/ASUS/dev/Physio-App/package.json")("sharp");

const [src, dst] = process.argv.slice(2);
const CW = 384, CH = 512, OUTW = 640; // cases élargies pour laisser la place aux décalages
// Cadre du step dans chaque case (repéré à l'œil sur la planche, coordonnées de la case).
const STEP = [
  [262, 395, 372, 456], [253, 395, 373, 456], [264, 390, 367, 448], [261, 390, 368, 448],
  [244, 393, 362, 456], [214, 406, 368, 464], [204, 406, 369, 464], [204, 406, 368, 464],
];
const MASTER = 3; // case 4

async function cellGray(k) {
  const c = k % 4, r = Math.floor(k / 4);
  const buf = await sharp(src).extract({ left: c * CW + 3, top: r * CH + 3, width: CW - 6, height: CH - 6 }).flatten({ background: "#fff" }).png().toBuffer();
  const { data, info } = await sharp(buf).greyscale().raw().toBuffer({ resolveWithObject: true });
  return { buf, data, W: info.width, H: info.height };
}
const dark = (g, x, y) => x >= 0 && y >= 0 && x < g.W && y < g.H && g.data[y * g.W + x] < 150;

function figureMask(g, k) {
  // Tout sauf le step (on efface son cadre, en gardant 4 px du haut pour le pied posé dessus).
  const [x0, y0, x1, y1] = STEP[k];
  const m = new Uint8Array(g.W * g.H);
  for (let y = 0; y < g.H; y++) for (let x = 0; x < g.W; x++) if (dark(g, x, y)) m[y * g.W + x] = 1;
  // Pied à chaussette (zone remplie) : on le protège avant d'effacer le step.
  const sock = sockFoot(g, m);
  for (let y = 0; y < g.H; y++) for (let x = 0; x < g.W; x++) {
    const inStep = x >= x0 - 12 && x <= x1 + 12 && y >= y0 - 22 && y <= y1 + 6;
    const nearSock = sock && Math.abs(x - sock.x) < 48 && y < sock.bottom + 3;
    if (inStep && !nearSock) m[y * g.W + x] = 0;
  }
  // Petits morceaux isolés restants (bouts de trait du step) : on les enlève.
  const lab = new Int32Array(g.W * g.H); const sizes = [0];
  for (let p = 0; p < g.W * g.H; p++) { if (!m[p] || lab[p]) continue; const id = sizes.length, st = [p]; lab[p] = id; let n = 0;
    while (st.length) { const q = st.pop(); n++; const qx = q % g.W, qy = (q - qx) / g.W;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const nx = qx + dx, ny = qy + dy; if (nx < 0 || ny < 0 || nx >= g.W || ny >= g.H) continue; const r = ny * g.W + nx; if (m[r] && !lab[r]) { lab[r] = id; st.push(r); } } }
    sizes.push(n); }
  const big = Math.max(...sizes) * 0.02;
  for (let p = 0; p < g.W * g.H; p++) if (m[p] && sizes[lab[p]] < big) m[p] = 0;
  return m;
}
function sockFoot(g, m) {
  // Pied à chaussette = zone remplie (pixels sombres entourés de sombres).
  let sx = 0, sy = 0, n = 0, maxY = 0;
  for (let y = 4; y < g.H - 4; y++) for (let x = 4; x < g.W - 4; x++) {
    if (!m[y * g.W + x]) continue;
    let d = 0;
    for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) d += m[(y + dy) * g.W + x + dx];
    if (d >= 76) { sx += x; sy += y; n++; if (y > maxY) maxY = y; }
  }
  return n ? { x: sx / n, bottom: maxY } : null;
}
function bareFoot(g, m, sock) {
  // Pied nu au sol = pixels les plus bas du personnage, hors chaussette ; on prend les orteils (x max).
  let bottom = 0;
  for (let y = 0; y < g.H; y++) for (let x = 0; x < g.W; x++) if (m[y * g.W + x] && !(sock && Math.abs(x - sock.x) < 45 && Math.abs(y - sock.bottom) < 45)) bottom = Math.max(bottom, y);
  let toes = 0;
  for (let y = bottom - 12; y <= bottom; y++) for (let x = 0; x < g.W; x++) if (m[y * g.W + x] && !(sock && Math.abs(x - sock.x) < 45)) toes = Math.max(toes, x);
  return { x: toes, bottom };
}

const cells = [];
for (let k = 0; k < 8; k++) {
  const g = await cellGray(k);
  const m = figureMask(g, k);
  const sock = sockFoot(g, m);
  const bare = bareFoot(g, m, sock);
  cells.push({ g, m, sock, bare });
  console.log(`case ${k + 1}: chaussette ${sock ? Math.round(sock.x) + "/" + sock.bottom : "-"}  pied nu ${bare.x}/${bare.bottom}`);
}
const M = cells[MASTER];
const OFFX = 130, TOPPAD = 70, OUTH = 512 + 70; // marge à gauche dans la case élargie
const comps = [];
for (let k = 0; k < 8; k++) {
  const { g, m, sock, bare } = cells[k];
  let dx, dy;
  if (k <= MASTER) { dx = M.bare.x - bare.x; dy = M.bare.bottom - bare.bottom; }
  else { dx = Math.round(M.sock.x - sock.x); dy = M.sock.bottom - sock.bottom; }
  // Personnage seul (le step d'origine effacé), en PNG avec fond blanc.
  const px = Buffer.alloc(g.W * g.H * 3, 255);
  for (let i = 0; i < g.W * g.H; i++) if (m[i]) { px[i * 3] = 37; px[i * 3 + 1] = 99; px[i * 3 + 2] = 235; }
  const fig = await sharp(px, { raw: { width: g.W, height: g.H, channels: 3 } }).png().toBuffer();
  // Step de la case maître, toujours au même endroit.
  // Step dessiné : celui de la case 3 (aucun pied dessus), calé sur l'emplacement du step de la case 4.
  const SRCK = 2, [sx0, sy0, sx1, sy1] = STEP[SRCK], S3 = cells[SRCK];
  const placeX = STEP[MASTER][2] - (sx1 - sx0), placeY = STEP[MASTER][3] - (sy1 - sy0);
  // Step maître : sa zone, sans le pied à chaussette posé dessus.
  const sw = sx1 - sx0 + 24, sh = sy1 - sy0 + 28;
  const spx = Buffer.alloc(sw * sh * 3, 255);
  for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) { const gx = sx0 - 12 + x, gy = sy0 - 22 + y;
    const nearSock = S3.sock && Math.abs(gx - S3.sock.x) < 48 && gy < S3.sock.bottom + 3;
    if (!nearSock && dark(S3.g, gx, gy)) { const i = (y * sw + x) * 3; spx[i] = 37; spx[i + 1] = 99; spx[i + 2] = 235; } }
  const step = await sharp(spx, { raw: { width: sw, height: sh, channels: 3 } }).png().toBuffer();
  const cell = await sharp({ create: { width: OUTW, height: OUTH, channels: 3, background: "#fff" } })
    .composite([
      { input: fig, left: OFFX + dx, top: TOPPAD + 3 + dy, blend: "multiply" },
      { input: step, left: OFFX + placeX - 12, top: TOPPAD + placeY - 22 + 3, blend: "multiply" },
    ]).png().toBuffer();
  comps.push({ input: cell, left: (k % 4) * OUTW, top: Math.floor(k / 4) * OUTH });
  console.log(`case ${k + 1}: décalage ${dx}, ${dy}`);
}
await sharp({ create: { width: OUTW * 4, height: OUTH * 2, channels: 3, background: "#fff" } }).composite(comps).png().toFile(dst);
console.log("ok", dst);
