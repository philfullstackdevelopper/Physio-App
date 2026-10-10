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
import { isAdminEmail } from "@/lib/admin";
import { activeStorageProvider } from "./provider";
import { s3UploadUrl, s3PublicUrl } from "./s3";

export type UploadTarget =
  | { provider: "supabase" }
  | { provider: "s3"; uploadUrl: string; publicUrl: string };

// Content-types allowed through the presigned-upload path. Deliberately an
// allowlist, not a denylist: an uploaded file this app later serves back
// (exercise-media is a PUBLIC bucket) must never come back as text/html,
// image/svg+xml, or application/xhtml+xml — a browser will happily execute
// script from those regardless of what a <video>/<img> tag intended, turning
// this into stored XSS. Extend deliberately, not by removing entries.
const ALLOWED_CONTENT_TYPES = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "application/pdf",
]);

/** Every bucket this app writes to, and who's allowed to mint an upload URL
 *  into it. Reject anything not listed — this is a strict allowlist, not a
 *  passthrough, precisely because a presigned URL is a bearer credential:
 *  whoever holds it can write to that exact bucket/path regardless of who
 *  they are, so authorization has to happen HERE, before minting one, not
 *  after. Mirrors the checks that already exist elsewhere for the same
 *  buckets (migration 0022's set_exercise_media() for exercise-media). */
async function assertCanUploadTo(bucket: string, path: string): Promise<void> {
  const supabase = await createClient();
  const user = await requireUser(supabase); // throws/redirects if not signed in

  if (bucket === "exercise-media") {
    // Audit du 2026-10-08 : avant, tout compte kiné (même en attente) pouvait
    // obtenir une adresse d'envoi vers N'IMPORTE QUEL chemin du dossier.
    // Désormais, même règle que set_exercise_media() (migration 0061) : un
    // kiné validé, pour SES exercices ; l'administrateur pour ceux de la
    // plateforme. Le chemin doit être « <id de l'exercice>/<fichier> »
    // (components/ExerciseVideoUpload.tsx).
    const match = /^([0-9a-f-]{36})\/[A-Za-z0-9._-]+$/i.exec(path);
    if (!match) throw new Error("Chemin d'envoi invalide.");
    const { data: me } = await supabase.from("instructors").select("id, status").eq("id", user.id).maybeSingle();
    if (!me || ((me.status as string | null) ?? "approved") !== "approved") throw new Error("Réservé aux comptes kiné validés.");
    const { data: exercise } = await supabase.from("exercises").select("created_by").eq("id", match[1]).maybeSingle();
    const allowed = !!exercise && (exercise.created_by === user.id || (exercise.created_by === null && isAdminEmail(user.email)));
    if (!allowed) throw new Error("Vous ne pouvez envoyer une vidéo que pour vos propres exercices.");
    return;
  }

  throw new Error(`Bucket de stockage inconnu : ${bucket}`);
}

export async function getUploadTarget(bucket: string, path: string, contentType: string): Promise<UploadTarget> {
  if (activeStorageProvider() !== "s3") return { provider: "supabase" };

  const safeContentType = ALLOWED_CONTENT_TYPES.has(contentType) ? contentType : "application/octet-stream";
  await assertCanUploadTo(bucket, path);

  const uploadUrl = await s3UploadUrl(bucket, path, safeContentType);
  return { provider: "s3", uploadUrl, publicUrl: s3PublicUrl(bucket, path) };
}
