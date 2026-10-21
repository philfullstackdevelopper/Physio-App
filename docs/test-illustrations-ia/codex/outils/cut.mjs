// Découpe une planche de 8 dessins (4 colonnes x 2 rangées) générée par Codex
// en 8 images au format de la banque d'illustrations :
//   node cut.mjs <dossier-exercice>
//   lit   <dossier>/sheet.png
//   écrit <dossier>/svg/frame-1..8.svg (512x512, un seul tracé #2563eb)
//         <dossier>/apercu.gif (animation aller-retour pour validation)
// Recalage : la même échelle pour les 8 dessins, les pieds posés sur la même
// ligne de sol et le personnage centré, pour qu'il ne « saute » pas d'une
// image à l'autre.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
const sharp = createRequire("C:/Users/ASUS/dev/Physio-App/package.json")("sharp");
const potrace = createRequire(import.meta.url)("potrace");

const dir = process.argv[2];
if (!dir) throw new Error("usage: node cut.mjs <dossier-exercice>");
const sheet = path.join(dir, "sheet.png");
const meta = await sharp(sheet).metadata();
const COLS = 4, ROWS = 2;
const cw = Math.floor(meta.width / COLS), ch = Math.floor(meta.height / ROWS);
const INSET = Math.round(Math.min(cw, ch) * 0.03); // évite les filets gris entre les cases

// 1. Chaque case, en niveaux de gris, et le cadre serré du dessin.
const cells = [];
for (let i = 0; i < COLS * ROWS; i++) {
  const c = i % COLS, r = Math.floor(i / COLS);
  let buf = await sharp(sheet)
    .extract({ left: c * cw + INSET, top: r * ch + INSET, width: cw - 2 * INSET, height: ch - 2 * INSET })
    .flatten({ background: "#fff" })
    .png()
    .toBuffer();
  const { data, info } = await sharp(buf).greyscale().raw().toBuffer({ resolveWithObject: true });
  // Taches parasites : bouts du dessin de la case voisine qui dépassent. Ce sont
  // de petits morceaux (moins de 10 % du plus gros) qui touchent le bord de la
  // case ; on les blanchit. Les petits morceaux à l'intérieur (traits, billes) restent.
  const W = info.width, H = info.height, lab = new Int32Array(W * H), sizes = [0], edge = [false];
  const E = 8;
  for (let p = 0; p < W * H; p++) {
    if (data[p] >= 150 || lab[p]) continue;
    const id = sizes.length, stack = [p];
    lab[p] = id;
    let n = 0, touches = false;
    while (stack.length) {
      const q = stack.pop();
      n++;
      const qx = q % W, qy = (q - qx) / W;
      if (qx < E || qy < E || qx >= W - E || qy >= H - E) touches = true;
      for (let dy = -2; dy <= 2; dy++)
        for (let dx = -2; dx <= 2; dx++) {
          const nx = qx + dx, ny = qy + dy;
          if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
          const r = ny * W + nx;
          if (data[r] < 150 && !lab[r]) { lab[r] = id; stack.push(r); }
        }
    }
    sizes.push(n);
    edge.push(touches);
  }
  const keep = Math.max(...sizes) * 0.1;
  const rgb = await sharp(buf).removeAlpha().raw().toBuffer();
  for (let p = 0; p < W * H; p++)
    if (lab[p] && edge[lab[p]] && sizes[lab[p]] < keep) { data[p] = 255; rgb[p * 3] = rgb[p * 3 + 1] = rgb[p * 3 + 2] = 255; }
  buf = await sharp(rgb, { raw: { width: W, height: H, channels: 3 } }).png().toBuffer();
  let x0 = info.width, y0 = info.height, x1 = -1, y1 = -1;
  for (let y = 0; y < info.height; y++)
    for (let x = 0; x < info.width; x++)
      if (data[y * info.width + x] < 150) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
  if (x1 < 0) throw new Error(`case ${i + 1} vide`);
  cells.push({ buf, w: info.width, h: info.height, x0, y0, x1, y1 });
}

// 1 bis. Mouvement des deux côtés (--miroir) : la planche ne montre qu'un côté,
//    du centre (case 1) vers la droite de l'image (case 8) — demander à l'IA les
//    deux côtés donnait deux fois le même (Philippe, 2026-10-17). On fabrique
//    l'autre côté en retournant les dessins (vue de face, donc symétrique) :
//    gauche max … centre … droite max = m8 m6 m4 m2 | 2 4 6 8.
if (process.argv.includes("--miroir")) {
  const flip = async (c) => {
    const buf = await sharp(c.buf).flop().png().toBuffer();
    return { ...c, buf, x0: c.w - 1 - c.x1, x1: c.w - 1 - c.x0 };
  };
  const half = [cells[1], cells[3], cells[5], cells[7]];
  const left = await Promise.all([...half].reverse().map(flip));
  cells.splice(0, cells.length, ...left, ...half);
}

// 2. Échelle commune : le plus grand dessin (en hauteur ou largeur) occupe 76 % du carré,
//    le tout centré : au moins 12 % de marge de chaque côté, pour que la tête ne
//    sorte jamais de la vignette arrondie de l'appli (Philippe, 2026-10-17).
const OUT = 1024;
const maxH = Math.max(...cells.map((c) => c.y1 - c.y0 + 1));
// Horizontalement, un seul cadre commun aux 8 cases : chaque dessin garde sa
// position dans sa case, pour que le corps ne glisse pas quand les bras (ou un
// disque) s'écartent d'un côté.
const ux0 = Math.min(...cells.map((c) => c.x0));
const ux1 = Math.max(...cells.map((c) => c.x1));
const unionW = ux1 - ux0 + 1;
// Saut latéral (--saut) : l'IA dessine les postures sur place, centrées ;
// c'est ici qu'on déplace le personnage, pour un trajet parfaitement régulier :
// réception à gauche (1-2), envol en arc, réception à droite (7-8).
const SAUT = process.argv.includes("--saut");
const DX = [-1, -1, -0.66, -0.22, 0.22, 0.66, 1, 1].map((v) => v * 0.2);
const DY = [0, 0, -0.07, -0.1, -0.1, -0.07, 0, 0];
const FILL = SAUT ? 0.52 : 0.76;
const scale = (OUT * FILL) / Math.max(maxH, SAUT ? Math.max(...cells.map((c) => c.x1 - c.x0 + 1)) : unionW);
const LEFT0 = (OUT - unionW * scale) / 2;
const GROUND = Math.round(OUT * (0.5 + FILL / 2)); // ligne de sol commune
// Exercices suspendus à une barre : pas de sol, c'est la barre (en haut) qui
// doit rester fixe et le corps qui monte — sinon la barre semble descendre.
const SUSPENDUS = new Set(["pull-up", "chin-up", "neutral-grip-pull-up", "weighted-pull-up", "weighted-chin-up", "towel-pull-up", "scapular-pull-up", "negative-pull-up", "commando-pull-up", "l-sit-pull-up", "hanging-knee-raise", "hanging-leg-raise", "dead-hang", "active-hang", "assisted-pull-up", "assisted-chin-up"]);
const HAUT = SUSPENDUS.has(path.basename(path.resolve(dir)));
const TOP = Math.round(OUT * (0.5 - FILL / 2));

fs.mkdirSync(path.join(dir, "svg"), { recursive: true });
fs.mkdirSync(path.join(dir, "png"), { recursive: true });
const previews = [];
for (const [i, c] of cells.entries()) {
  const bw = c.x1 - c.x0 + 1, bh = c.y1 - c.y0 + 1;
  const sw = Math.max(1, Math.round(bw * scale)), sh = Math.max(1, Math.round(bh * scale));
  const fig = await sharp(c.buf).extract({ left: c.x0, top: c.y0, width: bw, height: bh }).resize(sw, sh).png().toBuffer();
  const left = SAUT
    ? Math.round((OUT - sw) / 2 + DX[i] * OUT)
    : Math.max(0, Math.min(OUT - sw, Math.round(LEFT0 + (c.x0 - ux0) * scale)));
  const top = HAUT ? TOP : Math.max(0, GROUND - sh + (SAUT ? Math.round(DY[i] * OUT) : 0));
  const placed = await sharp({ create: { width: OUT, height: OUT, channels: 3, background: "#fff" } })
    .composite([{ input: fig, left, top }])
    .png()
    .toBuffer();
  fs.writeFileSync(path.join(dir, "png", `frame-${i + 1}.png`), placed);
  // Tracé vectoriel : même traitement que l'outil Gemini (convert.mjs).
  const base = await sharp(placed).greyscale().blur(1.6).threshold(200).png().toBuffer();
  const svg = await new Promise((res, rej) =>
    potrace.trace(base, { threshold: 128, turdSize: 4, optTolerance: 0.4 }, (e, s) => (e ? rej(e) : res(s))),
  );
  const d = [...svg.matchAll(/ d="([^"]+)"/g)].map((m) => m[1]).join(" ");
  const out = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><path fill="#2563eb" fill-rule="evenodd" transform="scale(0.5)" d="${d}"/></svg>`;
  fs.writeFileSync(path.join(dir, "svg", `frame-${i + 1}.svg`), out);
  previews.push(await sharp(Buffer.from(out)).resize(360, 360).flatten({ background: "#fff" }).png().toBuffer());
}

// 3. Aperçu animé : 1 → 8 puis retour 7 → 2 ; mouvements circulaires
//    (--boucle) : 1 → 8 puis on recommence à 1, sans retour en arrière.
const boucle = process.argv.includes("--boucle");
const seq = boucle ? previews : [...previews, ...previews.slice(1, 7).reverse()];
await sharp(seq, { join: { animated: true } })
  .gif({ delay: seq.map((_, k) => (!boucle && (k === 0 || k === 7) ? 400 : 130)), loop: 0 })
  .toFile(path.join(dir, "apercu.gif"));
console.log("ok", dir);
