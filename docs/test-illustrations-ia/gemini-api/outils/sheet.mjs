// node sheet.mjs <glob-prefix e.g. f1> <out.png>  -> grid of every out/<slug>/<prefix>-*.png, labelled
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire('C:/Users/ASUS/dev/Physio-App/package.json');
const sharp = require('sharp');
const DIR = path.dirname(new URL(import.meta.url).pathname).replace(/^\/(\w:)/, '$1');
const OUT = path.join(DIR, 'out');
const [prefix, dest, only] = process.argv.slice(2);
const T = Number(process.env.T || 260), cols = Number(process.env.COLS || 6);
const tiles = [];
for (const slug of fs.readdirSync(OUT).sort()) {
  if (only && !only.split(',').includes(slug)) continue;
  for (const f of fs.readdirSync(path.join(OUT, slug)).filter(f => f.startsWith(prefix)).sort()) tiles.push({ slug, f, p: path.join(OUT, slug, f) });
}
const rows = Math.ceil(tiles.length / cols);
const comps = [];
for (const [i, t] of tiles.entries()) {
  const x = (i % cols) * T, y = Math.floor(i / cols) * (T + 24);
  comps.push({ input: await sharp(t.p).resize(T, T).toBuffer(), left: x, top: y + 24 });
  const label = `${t.slug} ${t.f.replace('.png', '')}`;
  comps.push({ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${T}" height="24"><text x="4" y="17" font-family="Arial" font-size="13" fill="#000">${label}</text></svg>`), left: x, top: y });
}
await sharp({ create: { width: cols * T, height: rows * (T + 24), channels: 3, background: '#fff' } }).composite(comps).png().toFile(dest);
console.log(tiles.length, 'tiles ->', dest);
