import { createRequire } from 'node:module';
const sharp = createRequire('C:/Users/ASUS/dev/Physio-App/package.json')('sharp');
const D = 'C:/Users/ASUS/dev/Physio-App/docs/test-illustrations-ia/gemini-api';
const L = [
 ['knee-to-chest','1. Genoux-poitrine',3],['prone-press-up','2. Extension lombaire (McKenzie)',3],['single-leg-stance','3. Appui unipodal',3],
 ['sit-to-stand','4. Assis-debout',3],['straight-leg-raise','5. Élévation jambe tendue',3],['supine-stick-shoulder-flexion','6. Élévation bâton allongé',3],
 ['heel-slide','7. Glissé du talon',3],['cervical-isometrics','8. Isométriques cervicaux',3],['chin-tuck','9. Rétraction cervicale',3],
 ['passive-knee-extension','10. Extension passive du genou',3],['hop-and-stick','11. Réception unipodale',3],['quad-set','12. Quad set',3],
 ['terminal-knee-extension','13. TKE (extension terminale)',3],['band-shoulder-external-rotation','14. Rotation externe élastique',3],['band-shoulder-internal-rotation','15. Rotation interne élastique',3],
 ['y-balance','16. Y-balance',3],['codman-pendulum','17. Pendulaire de Codman (image fixe)',1],['ankle-dorsiflexion-band','18. Flexion dorsale élastique (image fixe)',1],
 ['ankle-plantar-flexion-band','19. Flexion plantaire élastique (image fixe)',1],['ankle-eversion-band','20. Éversion élastique (image fixe)',1],['ankle-inversion-band','21. Inversion élastique (image fixe)',1],
 ['ball-squeeze','22. Ballon entre les genoux (image fixe)',1],['pelvic-tilt','23. Bascule du bassin (image fixe)',1],['knee-to-wall','24. Genou au mur (image fixe)',1]];
const T = 170, H = 26, CW = 3 * T + 20, cols = 2, comps = [];
for (const [i, [s, name, n]] of L.entries()) {
  const x = (i % cols) * CW, y = Math.floor(i / cols) * (T + H);
  comps.push({ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${CW}" height="${H}"><text x="4" y="19" font-family="Arial" font-size="16" font-weight="bold">${name}</text></svg>`), left: x, top: y });
  for (let f = 1; f <= n; f++) comps.push({ input: await sharp(`${D}/${s}/frame-${f}.svg`).resize(T, T).flatten({ background: '#fff' }).png().toBuffer(), left: x + (f - 1) * T, top: y + H });
}
await sharp({ create: { width: cols * CW, height: Math.ceil(L.length / cols) * (T + H), channels: 3, background: '#fff' } }).composite(comps).png().toFile(`${D}/les-24-exercices.png`);
