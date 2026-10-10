import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import { STAGE_LABELS, type InjuryStage } from "@/lib/exercise/prescription";
import { EQUIPMENT_OPTIONS, EQUIPMENT_LABELS, type EquipmentId } from "@/lib/exercise/equipment";
import OnboardingView from "./OnboardingView";
import { saveOnboarding } from "./actions";

const STAGES = Object.entries(STAGE_LABELS) as [InjuryStage, string][];

// Shown once, right after a patient's first login (gated from /patient — see
// app/patient/layout.tsx). Also reachable later via "Modifier ma situation".
// Redesigned 2026-09-09 (Philippe, working from a reference screenshot): a
// numbered step wizard rather than one long scroll — so a first-time patient
// can see up front that this is 4 short steps, not an open-ended form — with
// the same split layout /login and /invitation use (no dashboard sidebar:
// onboarding isn't done yet, so app/patient/layout.tsx hasn't unlocked it).
export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  const supabase = await createClient();
  const user = await requireUser(supabase);

  const { data: bodyParts } = await supabase
    .from("body_parts")
    .select("id, slug, label")
    .order("position");

  // Pre-fill if the patient is editing an existing profile.
  const { data: profile } = await supabase
    .from("patient_profiles")
    .select(
      "declared_body_part_ids, injury_stage, rehab_progress, history, date_of_birth, height_cm, weight_kg, activity_level, equipment, health_data_consent_at",
    )
    .eq("id", user.id)
    .maybeSingle();

  // Consent is asked once. Already-consenting patients editing their
  // situation later aren't asked again.
  const needsConsent = !profile?.health_data_consent_at;
  const currentEquipment = new Set((profile?.equipment as EquipmentId[] | null) ?? []);

  return (
    <OnboardingView
      error={error}
      needsConsent={needsConsent}
      wizard={{
        saveAction: saveOnboarding,
        bodyParts: bodyParts ?? [],
        stages: STAGES,
        profile,
        equipmentOptions: EQUIPMENT_OPTIONS,
        equipmentLabels: EQUIPMENT_LABELS,
        currentEquipment,
        hasError: !!error,
        needsConsent,
      }}
    />
  );
}
