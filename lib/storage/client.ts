"use client";

// Shared upload helper for Client Components (ExerciseVideoUpload,
// MessageComposer) — hides whether the bytes go straight to Supabase (today)
// or via a presigned S3 PUT (once STORAGE_PROVIDER=s3, see ./actions.ts).
// Both components used to call supabase.storage.from(bucket).upload(...)
// directly; that call now only happens on the Supabase branch here, so it's
// the one place that needs touching if the presigned-PUT shape ever changes.

import type { SupabaseClient } from "@supabase/supabase-js";
import { getUploadTarget } from "./actions";

export async function uploadFile(
  supabase: SupabaseClient,
  bucket: string,
  path: string,
  file: File,
): Promise<{ error: string | null; publicUrl: string | null }> {
  const target = await getUploadTarget(bucket, path, file.type || "application/octet-stream");

  if (target.provider === "supabase") {
    const { error } = await supabase.storage.from(bucket).upload(path, file);
    if (error) return { error: error.message, publicUrl: null };
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
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
