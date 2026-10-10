import InformationsView from "./InformationsView";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import { STAGE_LABELS, type ActivityLevel, type InjuryStage } from "@/lib/exercise/prescription";
import { EQUIPMENT_LABELS, type EquipmentId } from "@/lib/exercise/equipment";

// Pas de constante partagée pour ces libellés (ils vivent en dur dans le
// <select> de OnboardingWizard) — repris ici tels quels pour rester cohérent
// avec ce que le patient a vu en les choisissant.
const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: "Sédentaire (peu ou pas de sport)",
  moderate: "Modérée (activité régulière)",
  active: "Active (sport fréquent)",
};

const frDate = (iso: string) => new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(new Date(iso));

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
        { label: "Zones travaillées", value: declaredBodyParts.length ? declaredBodyParts.join(", ") : null },
        { label: "Étape de récupération", value: profile?.injury_stage ? STAGE_LABELS[profile.injury_stage as InjuryStage] : null },
        { label: "Avancée de la rééducation", value: (profile?.rehab_progress as string | null) ?? null },
        { label: "Ce qui s'est passé", value: (profile?.history as string | null) ?? null },
        { label: "Date de naissance", value: profile?.date_of_birth ? frDate(profile.date_of_birth as string) : null },
        {
          label: "Taille / poids",
          value:
            profile?.height_cm || profile?.weight_kg
              ? [profile?.height_cm ? `${profile.height_cm} cm` : null, profile?.weight_kg ? `${profile.weight_kg} kg` : null]
                  .filter(Boolean)
                  .join(" · ")
              : null,
        },
        { label: "Niveau d'activité", value: profile?.activity_level ? ACTIVITY_LABELS[profile.activity_level as ActivityLevel] : null },
        { label: "Équipement disponible", value: equipment.length ? equipment.join(", ") : null },
      ]}
    />
  );
}
