import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module';
const sharp = createRequire('C:/Users/ASUS/dev/Physio-App/package.json')('sharp');
const [dest, ...slugs] = process.argv.slice(2);
for (const s of slugs) {
  const src = path.join('out', s, 'svg'); const o = path.join(dest, s); fs.mkdirSync(o, { recursive: true });
  const frames = [];
  for (let i = 1; i <= 3; i++) { fs.copyFileSync(path.join(src, `frame-${i}.svg`), path.join(o, `frame-${i}.svg`)); frames.push(await sharp(path.join(src, `frame-${i}.svg`)).resize(320, 320).flatten({ background: '#fff' }).png().toBuffer()); }
  await sharp([...frames, frames[1]], { join: { animated: true } }).gif({ delay: [900, 700, 900, 700], loop: 0 }).toFile(path.join(o, 'apercu.gif'));
}
console.log('done', slugs.length);
