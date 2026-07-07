"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Assigns a condition to a patient. The condition's workouts become available to
// the patient. Changing the condition clears any previous workout recommendation.
export async function assignCondition(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const patientId = String(formData.get("patient_id") ?? "");
  const conditionId = String(formData.get("condition_id") ?? "");
  if (!patientId || !conditionId) {
    redirect(`/dashboard/patients/${patientId}?error=${encodeURIComponent("Veuillez choisir une condition.")}`);
  }

  const { error } = await supabase
    .from("patients")
    .update({ condition_id: conditionId, recommended_workout_id: null })
    .eq("id", patientId);
  if (error) {
    redirect(`/dashboard/patients/${patientId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/dashboard/patients/${patientId}`);
  redirect(`/dashboard/patients/${patientId}`);
}

// Sets (or clears) the instructor's recommended workout for this patient.
export async function recommendWorkout(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const patientId = String(formData.get("patient_id") ?? "");
  const workoutId = String(formData.get("workout_id") ?? "") || null;

  const { error } = await supabase
    .from("patients")
    .update({ recommended_workout_id: workoutId })
    .eq("id", patientId);
  if (error) {
    redirect(`/dashboard/patients/${patientId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/dashboard/patients/${patientId}`);
  redirect(`/dashboard/patients/${patientId}`);
}
