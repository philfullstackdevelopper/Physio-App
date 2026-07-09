"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Saves the patient's onboarding profile into `patient_profiles`.
// RLS ensures a patient can only write their own row (id = auth.uid()).
export async function saveOnboarding(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const conditionId = String(formData.get("condition_id") ?? "");
  const injuryStage = String(formData.get("injury_stage") ?? "");
  const rehabProgress = String(formData.get("rehab_progress") ?? "").trim() || null;
  const history = String(formData.get("history") ?? "").trim() || null;
  const dateOfBirth = String(formData.get("date_of_birth") ?? "");
  const heightCm = Number(formData.get("height_cm"));
  const weightKg = Number(formData.get("weight_kg"));
  const activityLevel = String(formData.get("activity_level") ?? "");

  const validActivity = ["sedentary", "moderate", "active"].includes(activityLevel);
  const validStage = ["acute", "subacute", "recovery", "return_to_sport"].includes(injuryStage);
  if (!conditionId || !validStage || !dateOfBirth || !heightCm || !weightKg || !validActivity) {
    redirect(
      `/patient/onboarding?error=${encodeURIComponent("Veuillez remplir tous les champs.")}`,
    );
  }

  const { error } = await supabase.from("patient_profiles").upsert(
    {
      id: user.id,
      condition_id: conditionId,
      injury_stage: injuryStage,
      rehab_progress: rehabProgress,
      history: history,
      date_of_birth: dateOfBirth,
      height_cm: heightCm,
      weight_kg: weightKg,
      activity_level: activityLevel,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );
  if (error) {
    redirect(`/patient/onboarding?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/patient");
  redirect("/patient");
}
