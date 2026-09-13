"use client";

// Upload helper for Client Components (ExerciseVideoUpload, the only caller
// today — message attachments were dropped entirely, migration 0056) — hides
// whether the bytes go straight to Supabase (today) or via a presigned S3
// PUT (once STORAGE_PROVIDER=s3, see ./actions.ts).

import { createStorageClient } from "@/lib/supabase/client";
import { getUploadTarget } from "./actions";

export async function uploadFile(
  bucket: string,
  path: string,
  file: File,
): Promise<{ error: string | null; publicUrl: string | null }> {
  const target = await getUploadTarget(bucket, path, file.type || "application/octet-stream");

  if (target.provider === "supabase") {
    // Deliberately a separate client, not the `supabase` param: that one is
    // pointed at PostgREST (the database) since the Scalingo migration,
    // which has no Storage API at all — Storage stays on Supabase directly.
    const storage = createStorageClient();
    const { error } = await storage.storage.from(bucket).upload(path, file);
    if (error) return { error: error.message, publicUrl: null };
    const { data } = storage.storage.from(bucket).getPublicUrl(path);
    return { error: null, publicUrl: data.publicUrl };
  }

  const res = await fetch(target.uploadUrl, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": file.type || "application/octet-stream" },
  });
  if (!res.ok) return { error: `Échec de l'envoi (${res.status}).`, publicUrl: null };
  return { error: null, publicUrl: target.publicUrl };
}
