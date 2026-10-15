// node seq.mjs <dest> <slug,slug,...> [f2 name] [f3 name] -> rows of pick-1 | f2 | f3
import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module';
const sharp = createRequire('C:/Users/ASUS/dev/Physio-App/package.json')('sharp');
const [dest, slugs, a = 'f2-1', b = 'f3-1'] = process.argv.slice(2);
const T = 300, list = slugs.split(','); const comps = [];
for (const [r, s] of list.entries()) {
  const files = ['pick-1', a, b].map(n => path.join('out', s, (fs.existsSync(path.join('out', s, 'pick-' + n.slice(1, 2) + '.png')) && n !== 'pick-1' && process.env.PICKS ? 'pick-' + n.slice(1, 2) : n) + '.png'));
  comps.push({ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${T*3}" height="22"><text x="4" y="16" font-family="Arial" font-size="15">${s}</text></svg>`), left: 0, top: r * (T + 22) });
  for (const [c, f] of files.entries()) if (fs.existsSync(f)) comps.push({ input: await sharp(f).resize(T, T).toBuffer(), left: c * T, top: r * (T + 22) + 22 });
}
await sharp({ create: { width: T * 3, height: list.length * (T + 22), channels: 3, background: '#fff' } }).composite(comps).png().toFile(dest);
