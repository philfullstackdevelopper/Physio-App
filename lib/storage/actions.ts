"use server";

// =============================================================================
// The one part of the storage abstraction Client Components call directly.
// Supabase lets the browser upload straight to it (scoped by Storage RLS
// policies); a raw S3-compatible store can't safely take secret credentials
// into the browser, so it needs a short-lived presigned PUT URL minted
// server-side instead. This action hides that difference: today (Supabase)
// it's a no-op stub the client-side upload code ignores; once
// STORAGE_PROVIDER=s3 is flipped, it hands back a real presigned URL to PUT
// the file to.
// =============================================================================

import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import { ATTACHMENT_BUCKET, isAttachmentPathFor } from "@/lib/messages/attachment";
import { activeStorageProvider } from "./provider";
import { s3UploadUrl, s3PublicUrl } from "./s3";
import { removeFiles } from "./server";

export type UploadTarget =
  | { provider: "supabase" }
  | { provider: "s3"; uploadUrl: string; publicUrl: string };

export async function getUploadTarget(bucket: string, path: string, contentType: string): Promise<UploadTarget> {
  if (activeStorageProvider() !== "s3") return { provider: "supabase" };
  const uploadUrl = await s3UploadUrl(bucket, path, contentType);
  return { provider: "s3", uploadUrl, publicUrl: s3PublicUrl(bucket, path) };
}

/** MessageComposer's "remove attachment before sending" button — the only
 *  client-callable delete today. Client Components can't safely delete
 *  objects directly on the S3 backend (no anon-scoped delete the way
 *  Supabase Storage's RLS-gated remove() works), so this goes through a
 *  server action instead. Scoped ONLY to message-attachments, deliberately:
 *  a generic "delete any bucket/path" action would have no equivalent of
 *  Supabase Storage's own RLS policies to stop one patient from deleting
 *  another's files — this re-implements that one check by hand instead
 *  (isAttachmentPathFor + confirming the caller can actually see this
 *  patient's row, mirroring app/dashboard/messages/actions.ts's own check
 *  on the send path). */
export async function removeMessageAttachment(patientId: string, path: string): Promise<void> {
  if (!isAttachmentPathFor(path, patientId)) return;
  const supabase = await createClient();
  const user = await requireUser(supabase);
  // RLS-scoped select: returns a row only if `user` is this patient or their
  // instructor — same rule the "patients" policies already enforce
  // everywhere else, reused here instead of re-deriving it.
  const { data } = await supabase.from("patients").select("id").eq("id", patientId).maybeSingle();
  if (!data && user.id !== patientId) return;
  await removeFiles(ATTACHMENT_BUCKET, [path]);
}
