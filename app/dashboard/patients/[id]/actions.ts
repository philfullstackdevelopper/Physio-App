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

// Applies the adaptation suggestion for one exercise: stores the instructor's
// decision so the patient's NEXT session actually uses it. `base_reps` is what
// the standard prescription said right now — kept so a later regression can undo
// an increase. See lib/exercise/overrides.ts.
export async function applyAdaptation(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const patientId = String(formData.get("patient_id") ?? "");
  const exerciseName = String(formData.get("exercise_name") ?? "");
  const goalReps = Number(formData.get("goal_reps"));
  const baseReps = Number(formData.get("base_reps"));

  const fail = (msg: string) =>
    redirect(`/dashboard/patients/${patientId}?error=${encodeURIComponent(msg)}`);

  if (!patientId || !exerciseName) fail("Exercice introuvable.");
  if (!Number.isInteger(goalReps) || goalReps < 1 || goalReps > 100) fail("Nombre de répétitions invalide.");
  if (!Number.isInteger(baseReps) || baseReps < 1 || baseReps > 100) fail("Prescription de référence invalide.");

  // RLS re-checks that this patient belongs to this instructor; we never trust
  // the form alone.
  const { error } = await supabase.from("exercise_overrides").upsert(
    {
      patient_id: patientId,
      exercise_name: exerciseName,
      goal_reps: goalReps,
      base_reps: baseReps,
      set_by: user.id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "patient_id,exercise_name" },
  );
  if (error) fail(error.message);

  revalidatePath(`/dashboard/patients/${patientId}`);
  redirect(`/dashboard/patients/${patientId}`);
}

// Removes an override — the patient goes back to the standard prescription.
export async function resetAdaptation(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const patientId = String(formData.get("patient_id") ?? "");
  const exerciseName = String(formData.get("exercise_name") ?? "");

  const { error } = await supabase
    .from("exercise_overrides")
    .delete()
    .eq("patient_id", patientId)
    .eq("exercise_name", exerciseName);
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
