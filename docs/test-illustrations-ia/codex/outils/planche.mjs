// Planche de contrôle : une rangée de 8 vignettes par exercice.
//   node planche.mjs <sortie.png> <dossier-exercice> [...]
import { createRequire } from "node:module";
const sharp = createRequire("C:/Users/ASUS/dev/Physio-App/package.json")("sharp");

const [outFile, ...dirs] = process.argv.slice(2);
const T = 140, LABEL = 18;
const tiles = [];
for (const [r, dir] of dirs.entries()) {
  const y = r * (T + LABEL);
  const name = dir.replace(/[\\/]+$/, "").split(/[\\/]/).pop();
  tiles.push({ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${8 * T}" height="${LABEL}"><text x="4" y="14" font-size="13" font-family="Arial">${name}</text></svg>`), left: 0, top: y });
  for (let i = 1; i <= 8; i++) {
    const png = await sharp(`${dir}/svg/frame-${i}.svg`).resize(T, T).flatten({ background: "#fff" }).png().toBuffer();
    tiles.push({ input: png, left: (i - 1) * T, top: y + LABEL });
  }
}
await sharp({ create: { width: 8 * T, height: dirs.length * (T + LABEL), channels: 3, background: "#fff" } })
  .composite(tiles)
  .png()
  .toFile(outFile);
console.log("ok", outFile);
