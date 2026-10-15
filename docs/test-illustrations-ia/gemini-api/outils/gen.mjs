// Usage: node --env-file=<.env.local> gen.mjs list            -> list image models available to the key
//        node --env-file=<.env.local> gen.mjs <slug|all> <frame 1|2|3> [candidates=2]
// Frame 1 uses the bank style reference; frames 2-3 also get out/<slug>/pick-1.png (the chosen frame 1).
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { STYLE, EXERCISES } from './exercises.mjs';
const require = createRequire('C:/Users/ASUS/dev/Physio-App/package.json');
const sharp = require('sharp');

const KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_IMAGE_MODEL || 'gemini-3.1-flash-image-preview';
const MAX = Number(process.env.MAX_IMAGES || 170); // hard budget cap across all runs
const DIR = path.dirname(new URL(import.meta.url).pathname).replace(/^\/(\w:)/, '$1');
const OUT = path.join(DIR, 'out');
const COUNT = path.join(DIR, 'count.json');
const BANK = 'C:/Users/ASUS/dev/Physio-App/public/exercise-illustrations';
if (!KEY) { console.error('GEMINI_API_KEY missing'); process.exit(1); }
const API = 'https://generativelanguage.googleapis.com/v1beta';

const [cmd, frameArg, candArg] = process.argv.slice(2);
if (cmd === 'list') {
  const r = await (await fetch(`${API}/models?pageSize=200`, { headers: { 'x-goog-api-key': KEY } })).json();
  if (r.error) { console.error(r.error.message); process.exit(1); }
  console.log(r.models.map(m => m.name).filter(n => /image/.test(n)).join('\n'));
  process.exit(0);
}

const count = () => (fs.existsSync(COUNT) ? JSON.parse(fs.readFileSync(COUNT, 'utf8')).n : 0);
const bump = () => fs.writeFileSync(COUNT, JSON.stringify({ n: count() + 1 }));
const png = async p => (await sharp(p, { density: 150 }).resize(1024, 1024, { fit: 'contain', background: '#fff' }).flatten({ background: '#fff' }).png().toBuffer()).toString('base64');

async function generate(ex, frame, k) {
  if (count() >= MAX) throw new Error(`budget cap ${MAX} reached`);
  const parts = [{ inline_data: { mime_type: 'image/png', data: await png(`${BANK}/${ex.ref}/frame-1.svg`) } }];
  const FIX = fs.existsSync(path.join(DIR,'fixes.json')) ? JSON.parse(fs.readFileSync(path.join(DIR,'fixes.json'),'utf8')) : {};
  const pose = FIX[ex.slug]?.[frame] || ex.frames[frame - 1];
  const view = FIX[ex.slug]?.view || ex.view;
  let text = `${STYLE}\nImage 1 is the STYLE reference only (ignore its pose and equipment).\nDraw this exercise position: ${view}; ${pose}.`;
  if (frame > 1) {
    parts.push({ inline_data: { mime_type: 'image/png', data: await png(path.join(OUT, ex.slug, 'pick-1.png')) } });
    text += `\nImage 2 is the start position of the same exercise: keep the SAME man, same scale, same camera angle, same position in the frame and the same equipment, and change only what is needed to reach the position described.`;
  }
  parts.push({ text });
  const body = { contents: [{ parts }], generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: '1:1' } } };
  const res = await fetch(`${API}/models/${MODEL}:generateContent`, { method: 'POST', headers: { 'x-goog-api-key': KEY, 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const j = await res.json();
  if (j.error) throw new Error(j.error.message);
  bump();
  const img = j.candidates?.[0]?.content?.parts?.find(p => p.inlineData || p.inline_data);
  if (!img) throw new Error('no image: ' + JSON.stringify(j).slice(0, 300));
  const d = path.join(OUT, ex.slug); fs.mkdirSync(d, { recursive: true });
  const f = path.join(d, `f${frame}-${k}.png`);
  fs.writeFileSync(f, Buffer.from((img.inlineData || img.inline_data).data, 'base64'));
  return f;
}

const frame = Number(frameArg); const n = Number(candArg || 2);
const list = cmd === 'all' ? EXERCISES : EXERCISES.filter(e => cmd.split(',').includes(e.slug));
for (const ex of list) {
  if (frame > 1 && !fs.existsSync(path.join(OUT, ex.slug, 'pick-1.png'))) { console.log(`${ex.slug}: no pick-1, skipped`); continue; }
  const jobs = [];
  for (let k = 1; k <= n; k++) {
    const kk = k; let off = 0; while (fs.existsSync(path.join(OUT, ex.slug, `f${frame}-${kk + off}.png`))) off += n;
    jobs.push(generate(ex, frame, kk + off).then(f => console.log('ok', f), e => console.log('ERR', ex.slug, e.message)));
  }
  await Promise.all(jobs);
}
console.log('images used so far:', count(), '/', MAX);
