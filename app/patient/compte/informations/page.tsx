import InformationsView from "./InformationsView";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import { getLocale, getTranslations } from "next-intl/server";
import { stageLabel, type ActivityLevel, type InjuryStage } from "@/lib/exercise/prescription";
import { equipmentLabels, type EquipmentId } from "@/lib/exercise/equipment";
import { intlTag } from "@/lib/i18n/translator";
import type { Locale } from "@/i18n/locales";

// Libellés du niveau d'activité : les mêmes que le <select> de
// OnboardingWizard (messages patient.situation.activity), pour rester
// cohérent avec ce que le patient a vu en les choisissant.

// « Mes informations » : coordonnées (Clerk) + tout ce que le patient a
// renseigné à l'onboarding (Philippe, 2026-09-11 — la maquette d'origine ne
// prévoyait qu'un nom/email/mot de passe, mais cette page-là est le seul
// endroit où le patient peut relire sa situation complète sans rouvrir
// l'onboarding). Lecture seule ici ; "Modifier ma situation" renvoie vers
// l'onboarding lui-même, qui sait déjà pré-remplir et mettre à jour un
// profil existant (voir app/patient/onboarding/page.tsx).
export default async function InformationsPage() {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("patient.informations");
  const tActivity = await getTranslations("patient.situation.activity");
  const tStage = await getTranslations("exercise.stage");
  const tEquipment = await getTranslations("exercise.equipment");
  const longDate = (iso: string) =>
    new Intl.DateTimeFormat(intlTag(locale), { day: "numeric", month: "long", year: "numeric" }).format(new Date(iso));
  const EQUIPMENT_LABELS = equipmentLabels(tEquipment);

  const [{ data: patient }, { data: profile }, { data: bodyParts }] = await Promise.all([
    supabase.from("patients").select("full_name").eq("id", user.id).maybeSingle(),
    supabase
      .from("patient_profiles")
      .select(
        "declared_body_part_ids, injury_stage, rehab_progress, history, date_of_birth, height_cm, weight_kg, activity_level, equipment",
      )
      .eq("id", user.id)
      .maybeSingle(),
    supabase.from("body_parts").select("id, label"),
  ]);

  const bodyPartLabels = new Map((bodyParts ?? []).map((b) => [b.id as string, b.label as string]));
  const declaredBodyParts = ((profile?.declared_body_part_ids as string[] | null) ?? [])
    .map((id) => bodyPartLabels.get(id))
    .filter((label): label is string => !!label);
  const equipment = ((profile?.equipment as EquipmentId[] | null) ?? []).map((id) => EQUIPMENT_LABELS[id]);

  return (
    <InformationsView
      name={(patient?.full_name as string | null) ?? null}
      email={user.email ?? null}
      situation={[
        { label: t("bodyParts"), value: declaredBodyParts.length ? declaredBodyParts.join(", ") : null },
        { label: t("stage"), value: profile?.injury_stage ? stageLabel(profile.injury_stage as InjuryStage, tStage) : null },
        { label: t("rehabProgress"), value: (profile?.rehab_progress as string | null) ?? null },
        { label: t("history"), value: (profile?.history as string | null) ?? null },
        { label: t("dateOfBirth"), value: profile?.date_of_birth ? longDate(profile.date_of_birth as string) : null },
        {
          label: t("heightWeight"),
          value:
            profile?.height_cm || profile?.weight_kg
              ? [profile?.height_cm ? `${profile.height_cm} cm` : null, profile?.weight_kg ? `${profile.weight_kg} kg` : null]
                  .filter(Boolean)
                  .join(" · ")
              : null,
        },
        { label: t("activity"), value: profile?.activity_level ? tActivity(profile.activity_level as ActivityLevel) : null },
        { label: t("equipment"), value: equipment.length ? equipment.join(", ") : null },
      ]}
    />
  );
}
