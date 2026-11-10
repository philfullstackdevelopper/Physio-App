import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import { requirePatientOnboardingAccess } from "@/lib/patient/requirePatientAccess";
import { getTranslations } from "next-intl/server";
import { STAGE_LABELS, stageLabel, type InjuryStage } from "@/lib/exercise/prescription";
import { EQUIPMENT_OPTIONS, equipmentLabels, type EquipmentId } from "@/lib/exercise/equipment";
import { mainBodyPartId } from "@/lib/exercise/category";
import OnboardingView from "./OnboardingView";
import { saveOnboarding } from "./actions";


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
  // Libellés dans la langue de l'interface (français : identiques à STAGE_LABELS / EQUIPMENT_LABELS).
  const tStage = await getTranslations("exercise.stage");
  const STAGES = (Object.keys(STAGE_LABELS) as InjuryStage[]).map((s) => [s, stageLabel(s, tStage)] as [InjuryStage, string]);
  const EQUIPMENT_LABELS = equipmentLabels(await getTranslations("exercise.equipment"));

  const supabase = await createClient();
  const user = await requireUser(supabase);
  // CGU + accès payé refaits ici (audit du 2026-11-10, B4) ; pas le
  // consentement santé, qui se donne justement dans ce questionnaire.
  if (!(await requirePatientOnboardingAccess())) return null;

  const [{ data: bodyParts }, { data: patient }] = await Promise.all([
    supabase.from("body_parts").select("id, slug, label, position").order("position"),
    supabase.from("patients").select("condition_id, instructors ( full_name )").eq("id", user.id).maybeSingle(),
  ]);

  // Zone choisie par le kiné (Philippe, 2026-11-08) : celle de la condition
  // qu'il a attribuée (patients.condition_id), déduite des exercices de ses
  // séances (mainBodyPartId). Déjà cochée au questionnaire, avec la mention
  // « Choisi par … ». Pas de condition attribuée : rien de coché, comme avant.
  const conditionId = (patient?.condition_id as string | null) ?? null;
  const { data: conditionWorkouts } = conditionId
    ? await supabase
        .from("workouts")
        .select("workout_exercises ( exercises ( exercise_body_parts ( body_part_id ) ) )")
        .eq("condition_id", conditionId)
    : { data: null };
  type WorkoutTags = { workout_exercises: { exercises: { exercise_body_parts: { body_part_id: string }[] | null } | null }[] | null };
  const exerciseTags = ((conditionWorkouts ?? []) as unknown as WorkoutTags[]).flatMap((w) =>
    (w.workout_exercises ?? []).map((we) => (we.exercises?.exercise_body_parts ?? []).map((t) => t.body_part_id)),
  );
  const kineBodyPartId = conditionId ? mainBodyPartId(exerciseTags, bodyParts ?? []) : null;
  // Jointure plusieurs-vers-un (patients → instructors) : un objet, pas un tableau.
  const kineName = (patient?.instructors as unknown as { full_name: string | null } | null)?.full_name ?? null;

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
        kineBodyPartId,
        kineName,
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
