// =============================================================================
// Provider-agnostic storage facade for server-side code (signed reads,
// deletion, listing). Dispatches to Supabase Storage (today's only real
// backend) or the S3-compatible backend (lib/storage/s3.ts, dormant until
// STORAGE_PROVIDER=s3 — see lib/storage/provider.ts), so callers stop caring
// which one is live. Client Components needing to UPLOAD go through
// lib/storage/actions.ts instead — this file is server-only.
// =============================================================================

import { createAdminClient } from "@/lib/supabase/admin";
import { activeStorageProvider } from "./provider";
import { s3SignedReadUrl, s3Remove, s3List, s3PublicUrl } from "./s3";

/** A time-limited URL to read a private file (message attachments, patient documents). */
export async function signedReadUrl(bucket: string, path: string, expiresSeconds: number): Promise<string | null> {
  if (activeStorageProvider() === "s3") return s3SignedReadUrl(bucket, path, expiresSeconds);
  const { data } = await createAdminClient().storage.from(bucket).createSignedUrl(path, expiresSeconds);
  return data?.signedUrl ?? null;
}

/** Several signed URLs at once — mirrors Supabase's own createSignedUrls batch call. */
export async function signedReadUrls(
  bucket: string,
  paths: string[],
  expiresSeconds: number,
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (paths.length === 0) return out;
  if (activeStorageProvider() === "s3") {
    await Promise.all(
      paths.map(async (p) => {
        out.set(p, await s3SignedReadUrl(bucket, p, expiresSeconds));
      }),
    );
    return out;
  }
  const { data } = await createAdminClient().storage.from(bucket).createSignedUrls(paths, expiresSeconds);
  for (const u of data ?? []) if (u.path && u.signedUrl) out.set(u.path, u.signedUrl);
  return out;
}

/** A public bucket's direct URL (exercise-media). */
export function publicUrl(bucket: string, path: string): string {
  if (activeStorageProvider() === "s3") return s3PublicUrl(bucket, path);
  const { data } = createAdminClient().storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

/** Every object under a prefix (e.g. a patient's whole document folder). */
export async function listFiles(bucket: string, prefix: string): Promise<string[]> {
  if (activeStorageProvider() === "s3") return s3List(bucket, prefix);
  const { data } = await createAdminClient().storage.from(bucket).list(prefix);
  return (data ?? []).map((f) => `${prefix}/${f.name}`);
}

export async function removeFiles(bucket: string, paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  if (activeStorageProvider() === "s3") return s3Remove(bucket, paths);
  await createAdminClient().storage.from(bucket).remove(paths);
}
