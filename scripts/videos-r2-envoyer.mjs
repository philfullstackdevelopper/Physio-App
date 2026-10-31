// Envoie les vidéos préparées (videos-tournage/r2/, voir videos-r2-preparer.mjs)
// dans le bucket Cloudflare R2 « easyphysio-videos », dossier « exercises/ ».
//   node --env-file=.env.local scripts/videos-r2-envoyer.mjs
// Clés d'ENVOI (lecture + écriture), à mettre par Philippe dans .env.local :
//   R2_UPLOAD_ACCESS_KEY_ID=…   R2_UPLOAD_SECRET_ACCESS_KEY=…
// (la clé R2_* de Scalingo est en lecture seule, exprès). N'affiche jamais les clés.
// Vérifie ensuite chaque fichier (taille) et qu'un lien signé répond bien.
import fs from "node:fs";
import path from "node:path";
import { S3Client, PutObjectCommand, HeadObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const ACCOUNT = process.env.R2_ACCOUNT_ID || "672f4edeb0376a88a4e6f5dcf890054c";
const BUCKET = process.env.R2_BUCKET || "easyphysio-videos";
const PREFIX = (process.env.R2_VIDEOS_PREFIX || "exercises").replace(/\/+$/, "");
const KEY = process.env.R2_UPLOAD_ACCESS_KEY_ID, SECRET = process.env.R2_UPLOAD_SECRET_ACCESS_KEY;
if (!KEY || !SECRET) { console.error("Il manque R2_UPLOAD_ACCESS_KEY_ID / R2_UPLOAD_SECRET_ACCESS_KEY dans .env.local."); process.exit(1); }

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${ACCOUNT}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: KEY, secretAccessKey: SECRET },
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
});
const DIR = "videos-tournage/r2";
const files = fs.readdirSync(DIR).filter((f) => f.endsWith(".mp4") || f === "manifest.json");
let total = 0, sent = 0;
for (const f of files) {
  const p = path.join(DIR, f), size = fs.statSync(p).size;
  const Key = `${PREFIX}/${f}`;
  try {
    const head = await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key })).catch(() => null);
    if (head && head.ContentLength === size) { total += size; continue; } // déjà en ligne
    await s3.send(new PutObjectCommand({
      Bucket: BUCKET, Key, Body: fs.readFileSync(p), ContentLength: size,
      ContentType: f.endsWith(".mp4") ? "video/mp4" : "application/json",
      CacheControl: "public, max-age=31536000",
    }));
    sent++; total += size;
    process.stdout.write(".");
  } catch (e) { console.error(`\nÉchec ${f} : ${e.name}`); process.exitCode = 1; }
}
console.log(`\n${sent} envoyés, ${files.length} en ligne, ${(total / 1e9).toFixed(2)} Go`);
// Contrôle : un lien signé vers la première vidéo répond-il ?
const first = files.find((f) => f.endsWith(".mp4"));
const url = await getSignedUrl(s3, new GetObjectCommand({ Bucket: BUCKET, Key: `${PREFIX}/${first}` }), { expiresIn: 600 });
const r = await fetch(url, { headers: { Range: "bytes=0-1023" } });
console.log(`Lien signé de test (${first}) : HTTP ${r.status}`);
