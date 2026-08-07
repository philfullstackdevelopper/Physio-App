"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";

// Saves the patient's onboarding profile into `patient_profiles`.
// RLS ensures a patient can only write their own row (id = auth.uid()).
export async function saveOnboarding(formData: FormData) {
  const supabase = await createClient();
  const user = await requireUser(supabase);

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

  // RGPD article 9: health data needs explicit, specific consent. Asked once —
  // if the patient already consented on a prior save, keep that original
  // timestamp rather than overwrite it; only require the checkbox when
  // there's no consent on file yet.
  const { data: existing } = await supabase
    .from("patient_profiles")
    .select("health_data_consent_at")
    .eq("id", user.id)
    .maybeSingle();

  let healthDataConsentAt = existing?.health_data_consent_at ?? null;
  if (!healthDataConsentAt) {
    const consented = formData.get("health_data_consent") === "on";
    if (!consented) {
      redirect(
        `/patient/onboarding?error=${encodeURIComponent(
          "Merci de cocher la case de consentement pour continuer.",
        )}`,
      );
    }
    healthDataConsentAt = new Date().toISOString();
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
      health_data_consent_at: healthDataConsentAt,
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
