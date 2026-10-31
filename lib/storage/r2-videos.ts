// =============================================================================
// Vidéos de démonstration des exercices, hébergées chez Cloudflare R2
// (Philippe, 2026-10-31). Le bucket est PRIVÉ : la base ne contient que le nom
// du fichier (exercises.media_url = "r2:<fichier>.mp4") et le serveur fabrique
// un lien signé, valable 6 h, au moment d'afficher la page. Le navigateur
// télécharge alors la vidéo directement chez Cloudflare, en qualité d'origine.
//
// SERVEUR UNIQUEMENT : les clés R2 (variables R2_*, jeton en lecture seule) ne
// doivent jamais partir vers le navigateur.
// =============================================================================
import "server-only";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const R2_PREFIX = "r2:";
const LINK_SECONDS = 6 * 60 * 60;

let client: S3Client | null = null;
function r2(): S3Client | null {
  if (client) return client;
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!accountId || !accessKeyId || !secretAccessKey || !process.env.R2_BUCKET) return null;
  client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
  return client;
}

export function isR2Video(mediaUrl: string | null | undefined): boolean {
  return !!mediaUrl && mediaUrl.startsWith(R2_PREFIX);
}

/** Lien signé (6 h) vers une vidéo du bucket, ou null si R2 n'est pas configuré. */
export async function getVideoUrl(fileName: string): Promise<string | null> {
  const s3 = r2();
  if (!s3) return null;
  const prefix = process.env.R2_VIDEOS_PREFIX ? `${process.env.R2_VIDEOS_PREFIX.replace(/\/+$/, "")}/` : "";
  return getSignedUrl(s3, new GetObjectCommand({ Bucket: process.env.R2_BUCKET, Key: `${prefix}${fileName}` }), {
    expiresIn: LINK_SECONDS,
  });
}

/** Adresse affichable d'une vidéo d'exercice : « r2:… » devient un lien signé,
 *  toute autre adresse (ancienne vidéo, YouTube) reste telle quelle. */
export async function resolveMediaUrl(mediaUrl: string | null | undefined): Promise<string | null> {
  if (!mediaUrl) return null;
  if (!isR2Video(mediaUrl)) return mediaUrl;
  try {
    return await getVideoUrl(mediaUrl.slice(R2_PREFIX.length));
  } catch {
    return null; // vidéo introuvable : l'appli montre le dessin à la place
  }
}
