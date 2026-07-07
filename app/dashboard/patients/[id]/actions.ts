"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Assigns a condition to a patient and (re)fills their program with that
// condition's exercises. RLS ensures the instructor can only touch their own patient.
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

  // Record the assigned condition on the patient.
  const { error: updateError } = await supabase
    .from("patients")
    .update({ condition_id: conditionId })
    .eq("id", patientId);
  if (updateError) {
    redirect(`/dashboard/patients/${patientId}?error=${encodeURIComponent(updateError.message)}`);
  }

  // Clear any existing program, then copy the condition's exercises in.
  await supabase.from("programs").delete().eq("patient_id", patientId);

  const { data: conditionExercises } = await supabase
    .from("condition_exercises")
    .select("exercise_id, frequency")
    .eq("condition_id", conditionId);

  if (conditionExercises && conditionExercises.length > 0) {
    const rows = conditionExercises.map((ce) => ({
      patient_id: patientId,
      exercise_id: ce.exercise_id,
      frequency: ce.frequency,
      instructor_id: user.id,
    }));
    const { error: insertError } = await supabase.from("programs").insert(rows);
    if (insertError) {
      redirect(`/dashboard/patients/${patientId}?error=${encodeURIComponent(insertError.message)}`);
    }
  }

  revalidatePath(`/dashboard/patients/${patientId}`);
  redirect(`/dashboard/patients/${patientId}`);
}
