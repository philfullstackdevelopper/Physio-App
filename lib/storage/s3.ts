// =============================================================================
// S3-compatible storage backend — for Outscale OOS (the object-storage
// service Scalingo itself points at for its HDS/SecNumCloud region, see
// project HDS memory notes). Scalingo has no Supabase-Storage equivalent, so
// this is the file-storage half of the eventual Scalingo cutover.
//
// SERVER-ONLY: the AWS SDK client here holds real secret credentials and
// must never be imported into a "use client" file or bundled to the browser.
// Client components that need to upload go through the server action in
// ./actions.ts instead, which hands back a short-lived presigned URL.
//
// Not active today — STORAGE_PROVIDER stays "supabase" (the default, see
// ./provider.ts) until real Outscale OOS credentials exist. Written now,
// ready to flip on, so that day is an env-var change plus testing, not
// another round of "which files touch storage" archaeology.
// =============================================================================

import { S3Client, PutObjectCommand, DeleteObjectsCommand, ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

let cachedClient: S3Client | null = null;

function s3Client(): S3Client {
  if (cachedClient) return cachedClient;
  const endpoint = process.env.S3_ENDPOINT;
  const region = process.env.S3_REGION ?? "eu-west-2";
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
  if (!endpoint || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "S3_ENDPOINT, S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY must be set to use the S3 storage backend.",
    );
  }
  cachedClient = new S3Client({
    endpoint,
    region,
    credentials: { accessKeyId, secretAccessKey },
    // Outscale OOS (like most non-AWS S3-compatible stores) expects
    // path-style URLs (https://endpoint/bucket/key), not AWS's
    // virtual-hosted-style (https://bucket.endpoint/key).
    forcePathStyle: true,
  });
  return cachedClient;
}

/** A short-lived URL the browser can PUT the file's bytes to directly. */
export async function s3UploadUrl(bucket: string, path: string, contentType: string, expiresSeconds = 300): Promise<string> {
  const cmd = new PutObjectCommand({ Bucket: bucket, Key: path, ContentType: contentType });
  return getSignedUrl(s3Client(), cmd, { expiresIn: expiresSeconds });
}

/** For a public bucket — a deterministic URL, no signing needed. */
export function s3PublicUrl(bucket: string, path: string): string {
  const endpoint = (process.env.S3_ENDPOINT ?? "").replace(/\/$/, "");
  return `${endpoint}/${bucket}/${path}`;
}

/** For a private bucket — a time-limited read URL (mirrors Supabase's createSignedUrl). */
export async function s3SignedReadUrl(bucket: string, path: string, expiresSeconds: number): Promise<string> {
  const cmd = new GetObjectCommand({ Bucket: bucket, Key: path });
  return getSignedUrl(s3Client(), cmd, { expiresIn: expiresSeconds });
}

export async function s3Remove(bucket: string, paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  await s3Client().send(
    new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects: paths.map((Key) => ({ Key })) } }),
  );
}

/** Lists object keys under a prefix (mirrors Supabase's storage.list()'s file names). */
export async function s3List(bucket: string, prefix: string): Promise<string[]> {
  const res = await s3Client().send(new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix }));
  return (res.Contents ?? []).map((o) => o.Key!).filter(Boolean);
}
