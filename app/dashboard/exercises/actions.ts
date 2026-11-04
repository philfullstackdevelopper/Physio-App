"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireApprovedInstructor } from "@/lib/dashboard/requireApprovedInstructor";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isAdminEmail } from "@/lib/admin";
import { adminSetExerciseMedia as dbAdminSetExerciseMedia } from "@/lib/db/admin";
import { friendlyDbError } from "@/lib/format/dbError";
import { isExerciseEquipmentId } from "@/lib/exercise/equipment";
import { KINE_VIDEO_KEY, KINE_VIDEO_MAX_MB, KINE_VIDEO_TYPES, stepsToInstructions } from "@/lib/exercise/kineExercises";
import { presignVideoUpload, r2UploadConfigured } from "@/lib/storage/r2-upload";

// (Philippe, 2026-10-07 : délègue à la garde commune, qui vérifie aussi que
// le compte kiné a été validé — avant, un kiné « pending » passait ici.)
async function requireInstructor(supabase: SupabaseClient): Promise<string> {
  const { user } = await requireApprovedInstructor(supabase);
  return user.id;
}

// =============================================================================
// Exercices créés par le kiné (Philippe, 2026-11-04 — migration 0081) :
// pour un de ses patients, pour sa banque, et en option proposés à tous
// (vérification par EasyPhysio dans /admin). Appelées par le formulaire en
// trois étapes (components/NewExerciseWizard.tsx), qui affiche l'erreur
// renvoyée au lieu de recharger la page.
// =============================================================================

export type CreateKineExerciseInput = {
  name: string;
  steps: string[];
  bodyPartIds: string[];
  equipment: string[];
  /** "bank" = sa banque ; "patient" = réservé au patient patientId. */
  scope: "bank" | "patient";
  patientId: string | null;
  /** « Rendre public pour tous » coché (banque seulement). */
  makePublic: boolean;
  /** « Partir de cet exercice » : l'exercice de la plateforme repris. */
  sourceExerciseId: string | null;
};

const UUID = /^[0-9a-f-]{36}$/i;

export async function createKineExercise(input: CreateKineExerciseInput): Promise<{ id: string } | { error: string }> {
  const supabase = await createClient();
  const userId = await requireInstructor(supabase);

  const name = String(input?.name ?? "").trim().replace(/\s+/g, " ");
  if (name.length < 3) return { error: "Donnez un nom à l'exercice (3 caractères au moins)." };
  if (name.length > 120) return { error: "Nom trop long (120 caractères au plus)." };
  const steps = Array.isArray(input.steps) ? input.steps.map(String).slice(0, 12) : [];
  const instructions = stepsToInstructions(steps);
  if (instructions && instructions.length > 2000) return { error: "Consignes trop longues." };
  const equipment = [...new Set((input.equipment ?? []).map(String).filter(isExerciseEquipmentId))];
  const bodyPartIds = [...new Set((input.bodyPartIds ?? []).map(String).filter((id) => UUID.test(id)))];
  if (bodyPartIds.length === 0) return { error: "Choisissez au moins une zone du corps." };

  const patientId = input.scope === "patient" ? String(input.patientId ?? "") : null;
  if (input.scope === "patient" && !UUID.test(patientId ?? "")) return { error: "Choisissez le patient." };
  const makePublic = input.scope === "bank" && input.makePublic === true;

  // « Partir de cet exercice » : on reprend sa vidéo (celle de Jules) tant que
  // le kiné n'envoie pas la sienne. Lecture sous ses droits : il ne peut
  // reprendre qu'un exercice qu'il voit.
  let mediaUrl: string | null = null;
  let sourceId: string | null = null;
  if (input.sourceExerciseId && UUID.test(input.sourceExerciseId)) {
    const { data: src } = await supabase
      .from("exercises")
      .select("id, media_url")
      .eq("id", input.sourceExerciseId)
      .maybeSingle();
    if (src) {
      sourceId = src.id as string;
      mediaUrl = (src.media_url as string | null) ?? null;
    }
  }

  const { data: exercise, error } = await supabase
    .from("exercises")
    .insert({
      name,
      instructions,
      equipment,
      created_by: userId,
      patient_id: patientId,
      publication_status: makePublic ? "pending" : "private",
      source_exercise_id: sourceId,
      media_url: mediaUrl,
    })
    .select("id")
    .single();
  if (error || !exercise) return { error: error ? friendlyDbError(error) : "Création impossible." };

  const { error: tagError } = await supabase
    .from("exercise_body_parts")
    .insert(bodyPartIds.map((bodyPartId) => ({ exercise_id: exercise.id, body_part_id: bodyPartId })));
  if (tagError) return { error: friendlyDbError(tagError) };

  revalidatePath("/dashboard/exercises");
  return { id: exercise.id as string };
}

/** « Rendre public » plus tard, depuis la fiche d'un exercice de sa banque. */
export async function requestExercisePublication(exerciseId: string): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  await requireInstructor(supabase);
  if (!UUID.test(String(exerciseId))) return { error: "Exercice introuvable." };
  const { data, error } = await supabase
    .from("exercises")
    .update({ publication_status: "pending" })
    .eq("id", exerciseId)
    .is("patient_id", null)
    .in("publication_status", ["private", "changes_requested", "declined"])
    .select("id");
  if (error) return { error: friendlyDbError(error) };
  if (!data?.length) return { error: "Cet exercice ne peut pas être proposé à tous." };
  revalidatePath("/dashboard/exercises");
  return { ok: true };
}

/** Étape 1 de l'envoi d'une vidéo : adresse d'envoi signée vers R2, après
 *  vérification que l'exercice est bien celui du kiné et pas encore publié. */
export async function getKineVideoUploadUrl(
  exerciseId: string,
  contentType: string,
  sizeBytes: number,
): Promise<{ uploadUrl: string; key: string } | { error: string }> {
  const supabase = await createClient();
  const userId = await requireInstructor(supabase);
  if (!UUID.test(String(exerciseId))) return { error: "Exercice introuvable." };
  const ext = KINE_VIDEO_TYPES[String(contentType)];
  if (!ext) return { error: "Format de vidéo non pris en charge (MP4 ou MOV)." };
  const size = Number(sizeBytes);
  if (!Number.isFinite(size) || size <= 0) return { error: "Vidéo vide." };
  if (size > KINE_VIDEO_MAX_MB * 1024 * 1024) {
    return { error: `Vidéo trop lourde (${KINE_VIDEO_MAX_MB} Mo au plus). Raccourcissez-la à 20 secondes environ.` };
  }
  const { data: ex } = await supabase
    .from("exercises")
    .select("id, created_by, publication_status")
    .eq("id", exerciseId)
    .maybeSingle();
  if (!ex || ex.created_by !== userId) return { error: "Exercice introuvable." };
  if (ex.publication_status === "published") return { error: "Un exercice publié ne peut plus être modifié." };
  if (!r2UploadConfigured()) return { error: "L'envoi de vidéos n'est pas encore activé sur EasyPhysio." };

  const key = `kines/${exerciseId}/${Date.now()}.${ext}`;
  try {
    return { uploadUrl: await presignVideoUpload(key, String(contentType), size), key };
  } catch (e) {
    console.error("getKineVideoUploadUrl failed", e);
    return { error: "Envoi de la vidéo impossible pour le moment." };
  }
}

/** Étape 2 : la vidéo est arrivée chez R2, on l'attache à l'exercice, avec la
 *  date de l'accord de la personne filmée (case obligatoire). */
export async function saveKineExerciseVideo(
  exerciseId: string,
  key: string,
  consent: boolean,
): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  await requireInstructor(supabase);
  if (consent !== true) return { error: "Cochez l'accord de la personne filmée." };
  const m = KINE_VIDEO_KEY.exec(String(key));
  if (!m || m[1] !== exerciseId) return { error: "Vidéo introuvable." };
  const { error: rpcErr } = await supabase.rpc("set_exercise_media", {
    p_exercise_id: exerciseId,
    p_media_url: `r2:${key}`,
    p_start_seconds: 0,
  });
  if (rpcErr) return { error: friendlyDbError(rpcErr) };
  await supabase.from("exercises").update({ filming_consent_at: new Date().toISOString() }).eq("id", exerciseId);
  revalidatePath("/dashboard/exercises");
  return { ok: true };
}

// Hides an exercise from THIS instructor's own library/picker views only —
// a personal filter on the shared library, never a deletion. Other
// instructors, and every workout that already includes it, are unaffected.
export async function hideExercise(formData: FormData) {
  const supabase = await createClient();
  const userId = await requireInstructor(supabase);

  const exerciseId = String(formData.get("exercise_id") ?? "");
  if (!exerciseId) redirect("/dashboard/exercises");

  const { error } = await supabase
    .from("instructor_hidden_exercises")
    .insert({ instructor_id: userId, exercise_id: exerciseId });
  if (error) {
    redirect(`/dashboard/exercises?error=${encodeURIComponent(friendlyDbError(error))}`);
  }

  revalidatePath("/dashboard/exercises");
  redirect("/dashboard/exercises");
}

// Reverses hideExercise.
export async function unhideExercise(formData: FormData) {
  const supabase = await createClient();
  const userId = await requireInstructor(supabase);

  const exerciseId = String(formData.get("exercise_id") ?? "");
  const { error } = await supabase
    .from("instructor_hidden_exercises")
    .delete()
    .eq("instructor_id", userId)
    .eq("exercise_id", exerciseId);
  if (error) {
    redirect(`/dashboard/exercises?error=${encodeURIComponent(friendlyDbError(error))}`);
  }

  revalidatePath("/dashboard/exercises");
  redirect("/dashboard/exercises");
}

// Vidéo de démonstration d'un exercice PLATEFORME (created_by null), réservée
// à l'administrateur (Philippe, 2026-10-07). La RPC set_exercise_media
// n'accepte plus que les exercices du kiné connecté ; pour la bibliothèque
// partagée, l'écriture passe donc par la connexion serveur directe
// (lib/db/admin.ts), après une double vérification ici même : e-mail admin
// (jamais une simple prop venue du navigateur) et exercice bien plateforme.
export async function adminSetExerciseMedia(
  exerciseId: string,
  url: string | null,
  startSeconds: number,
): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const { user } = await requireApprovedInstructor(supabase);
  if (!isAdminEmail(user.email)) return { error: "Action réservée à l'administrateur." };

  if (typeof exerciseId !== "string" || !exerciseId) return { error: "Exercice introuvable." };
  if (url !== null && (typeof url !== "string" || !/^https:\/\//.test(url))) {
    return { error: "Adresse de vidéo invalide." };
  }
  const seconds = Number.isFinite(startSeconds) && startSeconds >= 0 ? Math.floor(startSeconds) : 0;

  const { data: ex } = await supabase.from("exercises").select("created_by").eq("id", exerciseId).maybeSingle();
  if (!ex) return { error: "Exercice introuvable." };
  if (ex.created_by !== null) return { error: "Seuls les exercices de la plateforme passent par ici." };

  try {
    await dbAdminSetExerciseMedia(exerciseId, url, seconds);
  } catch (e) {
    console.error("adminSetExerciseMedia failed", e);
    return { error: "Échec de l'enregistrement de la vidéo." };
  }

  revalidatePath("/dashboard/exercises");
  return { ok: true };
}
