"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

// Ensure the caller is a logged-in instructor; returns their user id.
async function requireInstructor(supabase: SupabaseClient): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: instr } = await supabase
    .from("instructors")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();
  if (!instr) redirect("/patient");
  return user.id;
}

// Create a new (empty) séance owned by the instructor, then open its editor.
export async function createSeance(formData: FormData) {
  const supabase = await createClient();
  const userId = await requireInstructor(supabase);

  const conditionId = String(formData.get("condition_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const stage = String(formData.get("stage") ?? "") || null;
  if (!conditionId || !name) {
    redirect(`/dashboard/seances?error=${encodeURIComponent("Nom et condition requis.")}`);
  }

  const { data, error } = await supabase
    .from("workouts")
    .insert({
      condition_id: conditionId,
      name,
      stage,
      created_by: userId,
      duration_minutes: 10,
      times_per_week: 3,
    })
    .select("id")
    .single();
  if (error) {
    redirect(`/dashboard/seances?error=${encodeURIComponent(error.message)}`);
  }
  redirect(`/dashboard/seances/${data.id}`);
}

// Save a séance's details AND its exercise list (add/remove).
export async function saveSeance(formData: FormData) {
  const supabase = await createClient();
  const userId = await requireInstructor(supabase);

  const id = String(formData.get("workout_id") ?? "");
  if (!id) redirect("/dashboard/seances");

  // Only the owning instructor can edit (platform séances are read-only).
  const { data: wk } = await supabase.from("workouts").select("created_by").eq("id", id).maybeSingle();
  if (!wk || wk.created_by !== userId) {
    redirect(`/dashboard/seances?error=${encodeURIComponent("Séance non modifiable.")}`);
  }

  const name = String(formData.get("name") ?? "").trim();
  const conditionId = String(formData.get("condition_id") ?? "");
  const stage = String(formData.get("stage") ?? "") || null;
  const duration = Number(formData.get("duration_minutes")) || null;
  const tpw = Number(formData.get("times_per_week")) || null;

  await supabase
    .from("workouts")
    .update({ name, condition_id: conditionId, stage, duration_minutes: duration, times_per_week: tpw })
    .eq("id", id);

  // Replace the exercise list with the checked exercises (in DOM order).
  const exerciseIds = formData.getAll("exercise_ids").map(String).filter(Boolean);
  await supabase.from("workout_exercises").delete().eq("workout_id", id);
  if (exerciseIds.length) {
    const rows = exerciseIds.map((exId, i) => ({ workout_id: id, exercise_id: exId, position: i }));
    await supabase.from("workout_exercises").insert(rows);
  }

  revalidatePath(`/dashboard/seances/${id}`);
  revalidatePath("/patient");
  redirect(`/dashboard/seances/${id}?saved=1`);
}

// Copy a platform séance (template) into a new séance owned by the instructor,
// including its exercises, then open its editor to customise.
export async function duplicateSeance(formData: FormData) {
  const supabase = await createClient();
  const userId = await requireInstructor(supabase);

  const templateId = String(formData.get("template_id") ?? "");
  if (!templateId) redirect("/dashboard/seances");

  const { data: tpl } = await supabase
    .from("workouts")
    .select("name, condition_id, stage, duration_minutes, times_per_week")
    .eq("id", templateId)
    .maybeSingle();
  if (!tpl) redirect("/dashboard/seances");

  const { data: created, error } = await supabase
    .from("workouts")
    .insert({
      name: `${tpl.name} (copie)`,
      condition_id: tpl.condition_id,
      stage: tpl.stage,
      duration_minutes: tpl.duration_minutes,
      times_per_week: tpl.times_per_week,
      created_by: userId,
    })
    .select("id")
    .single();
  if (error) {
    redirect(`/dashboard/seances?error=${encodeURIComponent(error.message)}`);
  }

  const { data: exs } = await supabase
    .from("workout_exercises")
    .select("exercise_id, position")
    .eq("workout_id", templateId)
    .order("position");
  if (exs && exs.length) {
    await supabase.from("workout_exercises").insert(
      exs.map((e) => ({ workout_id: created.id, exercise_id: e.exercise_id, position: e.position })),
    );
  }

  redirect(`/dashboard/seances/${created.id}`);
}

export async function deleteSeance(formData: FormData) {
  const supabase = await createClient();
  const userId = await requireInstructor(supabase);
  const id = String(formData.get("workout_id") ?? "");
  const { data: wk } = await supabase.from("workouts").select("created_by").eq("id", id).maybeSingle();
  if (wk && wk.created_by === userId) {
    await supabase.from("workouts").delete().eq("id", id);
  }
  revalidatePath("/dashboard/seances");
  redirect("/dashboard/seances");
}
