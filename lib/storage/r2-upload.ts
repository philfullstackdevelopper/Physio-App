// =============================================================================
// Envoi d'une vidéo filmée par un kiné vers Cloudflare R2 (Philippe,
// 2026-11-04). Le fichier part directement du téléphone vers R2, avec une
// adresse d'envoi signée valable 15 minutes, fabriquée ici après vérification
// (le kiné, son exercice). Le serveur ne reçoit donc jamais la vidéo elle-même
// (Next.js limite le corps des requêtes à 10 Mo quand proxy.ts est actif).
//
// Clés : R2_UPLOAD_ACCESS_KEY_ID / R2_UPLOAD_SECRET_ACCESS_KEY, un jeton R2
// en écriture distinct du jeton en lecture seule (R2_ACCESS_KEY_ID). Le bucket
// doit accepter les envois depuis le site (règle CORS « PUT » pour
// https://easyphysio.fr).
//
// SERVEUR UNIQUEMENT.
// =============================================================================
import "server-only";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const UPLOAD_SECONDS = 15 * 60;

let client: S3Client | null = null;
function r2Writer(): S3Client | null {
  if (client) return client;
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_UPLOAD_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_UPLOAD_SECRET_ACCESS_KEY;
  if (!accountId || !accessKeyId || !secretAccessKey || !process.env.R2_BUCKET) return null;
  client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
  return client;
}

export function r2UploadConfigured(): boolean {
  return r2Writer() !== null;
}

/** Adresse d'envoi signée pour `key` (relative au dossier des vidéos
 *  d'exercices, comme les valeurs « r2:… » de exercises.media_url). */
export async function presignVideoUpload(key: string, contentType: string, sizeBytes: number): Promise<string> {
  const s3 = r2Writer();
  if (!s3) throw new Error("upload-not-configured");
  const prefix = process.env.R2_VIDEOS_PREFIX ? `${process.env.R2_VIDEOS_PREFIX.replace(/\/+$/, "")}/` : "";
  return getSignedUrl(
    s3,
    new PutObjectCommand({ Bucket: process.env.R2_BUCKET, Key: `${prefix}${key}`, ContentType: contentType, ContentLength: sizeBytes }),
    { expiresIn: UPLOAD_SECONDS, signableHeaders: new Set(["content-type", "content-length"]) },
  );
}
