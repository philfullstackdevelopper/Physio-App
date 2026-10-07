"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireApprovedInstructor } from "@/lib/dashboard/requireApprovedInstructor";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isAdminEmail } from "@/lib/admin";
import { adminSetExerciseMedia as dbAdminSetExerciseMedia } from "@/lib/db/admin";

// (Philippe, 2026-10-07 : délègue à la garde commune, qui vérifie aussi que
// le compte kiné a été validé — avant, un kiné « pending » passait ici.)
async function requireInstructor(supabase: SupabaseClient): Promise<string> {
  const { user } = await requireApprovedInstructor(supabase);
  return user.id;
}

export async function createExercise(formData: FormData) {
  const supabase = await createClient();
  const userId = await requireInstructor(supabase);

  const name = String(formData.get("name") ?? "").trim();
  const instructions = String(formData.get("instructions") ?? "").trim() || null;
  const bodyPartIds = formData.getAll("body_part_ids").map(String).filter(Boolean);
  if (!name) {
    redirect(`/dashboard/exercises?error=${encodeURIComponent("Nom requis.")}`);
  }

  const { data: exercise, error } = await supabase
    .from("exercises")
    .insert({ name, instructions, created_by: userId })
    .select("id")
    .single();
  if (error) {
    redirect(`/dashboard/exercises?error=${encodeURIComponent(error.message)}`);
  }

  if (exercise && bodyPartIds.length > 0) {
    const { error: tagError } = await supabase.from("exercise_body_parts").insert(
      bodyPartIds.map((bodyPartId) => ({ exercise_id: exercise.id, body_part_id: bodyPartId })),
    );
    if (tagError) {
      redirect(`/dashboard/exercises?error=${encodeURIComponent(tagError.message)}`);
    }
  }

  revalidatePath("/dashboard/exercises");
  redirect("/dashboard/exercises");
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
    redirect(`/dashboard/exercises?error=${encodeURIComponent(error.message)}`);
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
    redirect(`/dashboard/exercises?error=${encodeURIComponent(error.message)}`);
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
