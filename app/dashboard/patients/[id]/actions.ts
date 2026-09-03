"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";

// Assigns a condition to a patient. The condition's workouts become available to
// the patient. Changing the condition clears any previous recommendations —
// they belonged to the old condition's workouts.
export async function assignCondition(formData: FormData) {
  const supabase = await createClient();
  await requireUser(supabase);

  const patientId = String(formData.get("patient_id") ?? "");
  const conditionId = String(formData.get("condition_id") ?? "");
  if (!patientId || !conditionId) {
    redirect(`/dashboard/patients/${patientId}?error=${encodeURIComponent("Veuillez choisir une condition.")}`);
  }

  const { error } = await supabase.from("patients").update({ condition_id: conditionId }).eq("id", patientId);
  if (error) {
    redirect(`/dashboard/patients/${patientId}?error=${encodeURIComponent(error.message)}`);
  }
  await supabase.from("patient_recommended_workouts").delete().eq("patient_id", patientId);

  revalidatePath(`/dashboard/patients/${patientId}`);
  redirect(`/dashboard/patients/${patientId}`);
}

// Sends a short message from the instructor to one of their patients (e.g.
// reacting to a recent session). RLS re-checks the patient is really theirs.
export async function sendMessage(formData: FormData) {
  const supabase = await createClient();
  const user = await requireUser(supabase);

  const patientId = String(formData.get("patient_id") ?? "");
  const body = String(formData.get("body") ?? "").trim();

  const fail = (msg: string) =>
    redirect(`/dashboard/patients/${patientId}?error=${encodeURIComponent(msg)}`);

  if (!patientId) fail("Patient introuvable.");
  if (!body) fail("Le message ne peut pas être vide.");

  const { error } = await supabase.from("patient_messages").insert({
    patient_id: patientId,
    instructor_id: user.id,
    body,
  });
  if (error) fail(error.message);

  revalidatePath(`/dashboard/patients/${patientId}`);
  redirect(`/dashboard/patients/${patientId}`);
}

// Adds a workout to the patient's recommended list, at the end (lowest priority).
export async function addRecommendedWorkout(formData: FormData) {
  const supabase = await createClient();
  await requireUser(supabase);

  const patientId = String(formData.get("patient_id") ?? "");
  const workoutId = String(formData.get("workout_id") ?? "");
  if (!patientId || !workoutId) redirect(`/dashboard/patients/${patientId}`);

  const { data: last } = await supabase
    .from("patient_recommended_workouts")
    .select("priority")
    .eq("patient_id", patientId)
    .order("priority", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextPriority = ((last?.priority as number | undefined) ?? 0) + 1;

  const { error } = await supabase
    .from("patient_recommended_workouts")
    .insert({ patient_id: patientId, workout_id: workoutId, priority: nextPriority });
  if (error) redirect(`/dashboard/patients/${patientId}?error=${encodeURIComponent(error.message)}`);

  revalidatePath(`/dashboard/patients/${patientId}`);
  redirect(`/dashboard/patients/${patientId}`);
}

// Removes one workout from the patient's recommended list.
export async function removeRecommendedWorkout(formData: FormData) {
  const supabase = await createClient();
  await requireUser(supabase);

  const patientId = String(formData.get("patient_id") ?? "");
  const recId = String(formData.get("rec_id") ?? "");

  const { error } = await supabase.from("patient_recommended_workouts").delete().eq("id", recId);
  if (error) redirect(`/dashboard/patients/${patientId}?error=${encodeURIComponent(error.message)}`);

  revalidatePath(`/dashboard/patients/${patientId}`);
  redirect(`/dashboard/patients/${patientId}`);
}

// Swaps one recommended workout's priority with its neighbor — the whole
// "reordering" UI, on purpose: no drag-and-drop, just two arrows.
export async function moveRecommendedWorkout(formData: FormData) {
  const supabase = await createClient();
  await requireUser(supabase);

  const patientId = String(formData.get("patient_id") ?? "");
  const recId = String(formData.get("rec_id") ?? "");
  const direction = String(formData.get("direction") ?? "");

  const { data: rows } = await supabase
    .from("patient_recommended_workouts")
    .select("id, priority")
    .eq("patient_id", patientId)
    .order("priority");
  const list = rows ?? [];
  const idx = list.findIndex((r) => r.id === recId);
  const swapIdx = direction === "up" ? idx - 1 : idx + 1;

  if (idx !== -1 && swapIdx >= 0 && swapIdx < list.length) {
    const a = list[idx];
    const b = list[swapIdx];
    await supabase.from("patient_recommended_workouts").update({ priority: b.priority }).eq("id", a.id);
    await supabase.from("patient_recommended_workouts").update({ priority: a.priority }).eq("id", b.id);
  }

  revalidatePath(`/dashboard/patients/${patientId}`);
  redirect(`/dashboard/patients/${patientId}`);
}
