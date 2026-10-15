// node convert.mjs <outDir> <slug>  -> <outDir>/<slug>/svg/frame-1..3.svg (bank format) from pick-1..3.png
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const req = createRequire(import.meta.url);
const sharp = createRequire('C:/Users/ASUS/dev/Physio-App/package.json')('sharp');
const potrace = req('potrace');
const [outDir, slug] = process.argv.slice(2);
const d = path.join(outDir, slug);
const picks = [1, 2, 3].map(n => path.join(d, `pick-${n}.png`));

// union bounding box of the drawing across the 3 frames, so the figure doesn't jump between frames
let box = null;
for (const p of picks) {
  const { data, info } = await sharp(p).greyscale().resize(1024, 1024).raw().toBuffer({ resolveWithObject: true });
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    if (data[y * info.width + x] < 160) {
      box = box ? { x0: Math.min(box.x0, x), y0: Math.min(box.y0, y), x1: Math.max(box.x1, x), y1: Math.max(box.y1, y) } : { x0: x, y0: y, x1: x, y1: y };
    }
  }
}
const side = Math.round(Math.max(box.x1 - box.x0, box.y1 - box.y0) * 1.12);
const cx = (box.x0 + box.x1) / 2, cy = (box.y0 + box.y1) / 2;
const left = Math.round(cx - side / 2), top = Math.round(cy - side / 2);
fs.mkdirSync(path.join(d, 'svg'), { recursive: true });
for (const [i, p] of picks.entries()) {
  const padded = await sharp(p).resize(1024, 1024).flatten({ background: '#fff' })
    .extend({ top: 1024, bottom: 1024, left: 1024, right: 1024, background: '#fff' }).png().toBuffer();
  const base = await sharp(padded).greyscale()
    .extract({ left: left + 1024, top: top + 1024, width: side, height: side })
    .resize(1024, 1024).blur(2.2).threshold(232).png().toBuffer();
  const svg = await new Promise((res, rej) => potrace.trace(base, { threshold: 128, turdSize: 4, optTolerance: 0.4 }, (e, s) => (e ? rej(e) : res(s))));
  const dAttr = [...svg.matchAll(/ d="([^"]+)"/g)].map(m => m[1]).join(' ');
  // potrace traced at 1024px: scale to the bank's 512 viewBox
  const out = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><path fill="#2563eb" fill-rule="evenodd" transform="scale(0.5)" d="${dAttr}"/></svg>`;
  fs.writeFileSync(path.join(d, 'svg', `frame-${i + 1}.svg`), out);
}
console.log('ok', slug);
