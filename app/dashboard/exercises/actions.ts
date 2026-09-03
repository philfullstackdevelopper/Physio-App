"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import type { SupabaseClient } from "@supabase/supabase-js";

async function requireInstructor(supabase: SupabaseClient): Promise<string> {
  const user = await requireUser(supabase);
  const { data: instr } = await supabase
    .from("instructors")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();
  if (!instr) redirect("/patient");
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
