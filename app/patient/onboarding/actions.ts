"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import { EQUIPMENT_OPTIONS, type EquipmentId } from "@/lib/exercise/equipment";
import { hasActiveTier } from "@/lib/billing/access";
import { getTierBilling } from "@/lib/billing/context";

// Saves the patient's onboarding profile into `patient_profiles`.
// RLS ensures a patient can only write their own row (id = auth.uid()).
export async function saveOnboarding(formData: FormData) {
  const supabase = await createClient();
  const user = await requireUser(supabase);

  const declaredBodyPartIds = formData.getAll("declared_body_part_ids").map(String).filter(Boolean);
  const injuryStage = String(formData.get("injury_stage") ?? "");
  const rehabProgress = String(formData.get("rehab_progress") ?? "").trim() || null;
  const history = String(formData.get("history") ?? "").trim() || null;
  const dateOfBirth = String(formData.get("date_of_birth") ?? "");
  const heightCm = Number(formData.get("height_cm"));
  const weightKg = Number(formData.get("weight_kg"));
  const activityLevel = String(formData.get("activity_level") ?? "");
  const equipment = formData
    .getAll("equipment")
    .map(String)
    .filter((v): v is EquipmentId => (EQUIPMENT_OPTIONS as string[]).includes(v));

  const validActivity = ["sedentary", "moderate", "active"].includes(activityLevel);
  const validStage = ["acute", "subacute", "recovery", "return_to_sport"].includes(injuryStage);

  // Named per-field messages instead of one generic "remplissez tout" — a
  // patient re-submitting the wizard with everything pre-filled from a prior
  // save has no way to tell which single field regressed otherwise, and
  // neither did we when debugging this from server logs alone (Philippe,
  // 2026-09-09).
  const missing: string[] = [];
  if (declaredBodyPartIds.length === 0) missing.push("au moins une zone du corps");
  if (!validStage) missing.push("l'étape de récupération");
  if (!dateOfBirth) missing.push("la date de naissance");
  if (!heightCm) missing.push("la taille");
  if (!weightKg) missing.push("le poids");
  if (!validActivity) missing.push("le niveau d'activité");
  if (missing.length > 0) {
    redirect(`/patient/onboarding?error=${encodeURIComponent(`Champ(s) manquant(s) : ${missing.join(", ")}.`)}`);
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
      declared_body_part_ids: declaredBodyPartIds,
      injury_stage: injuryStage,
      rehab_progress: rehabProgress,
      history: history,
      date_of_birth: dateOfBirth,
      height_cm: heightCm,
      weight_kg: weightKg,
      activity_level: activityLevel,
      equipment,
      health_data_consent_at: healthDataConsentAt,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );
  if (error) {
    redirect(`/patient/onboarding?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/patient");
  // Onboarding done → choose an offer, unless one is already active (a patient
  // editing their situation later, or a grandfathered account) — Philippe,
  // 2026-09-10. lib/patient/home-data.ts applies the same rule on /patient.
  const goesToApp = hasActiveTier(await getTierBilling(supabase, user.id));
  redirect(goesToApp ? "/patient" : "/patient/abonnement");
}
