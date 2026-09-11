import Link from "next/link";
import { ArrowLeft, Pencil } from "lucide-react";
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

function Field({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="border-t border-line py-3 first:border-t-0 first:pt-0">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 text-sm text-ink">{value}</p>
    </div>
  );
}

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
    <main className="min-h-screen bg-app-bg p-6 sm:p-8">
      <div className="mx-auto max-w-2xl">
        <Link href="/patient/compte" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
          <ArrowLeft className="h-4 w-4 shrink-0" strokeWidth={1.75} />
          Retour aux paramètres
        </Link>

        <h1 className="mt-4 text-2xl font-semibold text-ink">Mes informations</h1>
        <p className="mt-1 text-sm text-muted">Vos coordonnées et votre situation, telles que renseignées à l&rsquo;inscription.</p>

        <section className="mt-6 rounded-2xl border border-line bg-surface p-6 shadow-sm">
          <h2 className="font-medium text-ink">Coordonnées</h2>
          <div className="mt-3">
            <Field label="Nom" value={(patient?.full_name as string | null) ?? null} />
            <Field label="E-mail" value={user.email} />
          </div>
          <p className="mt-3 text-xs text-muted">
            Le nom et l&rsquo;e-mail sont ceux de votre compte de connexion — contactez votre kinésithérapeute pour les corriger.
          </p>
        </section>

        <section className="mt-5 rounded-2xl border border-line bg-surface p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-medium text-ink">Votre situation</h2>
            <Link
              href="/patient/onboarding"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline"
            >
              <Pencil className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
              Modifier
            </Link>
          </div>
          <div className="mt-3">
            <Field label="Zones travaillées" value={declaredBodyParts.length ? declaredBodyParts.join(", ") : null} />
            <Field
              label="Étape de récupération"
              value={profile?.injury_stage ? STAGE_LABELS[profile.injury_stage as InjuryStage] : null}
            />
            <Field label="Avancée de la rééducation" value={(profile?.rehab_progress as string | null) ?? null} />
            <Field label="Ce qui s'est passé" value={(profile?.history as string | null) ?? null} />
            <Field
              label="Date de naissance"
              value={profile?.date_of_birth ? frDate(profile.date_of_birth as string) : null}
            />
            <Field
              label="Taille / poids"
              value={
                profile?.height_cm || profile?.weight_kg
                  ? [profile?.height_cm ? `${profile.height_cm} cm` : null, profile?.weight_kg ? `${profile.weight_kg} kg` : null]
                      .filter(Boolean)
                      .join(" · ")
                  : null
              }
            />
            <Field
              label="Niveau d'activité"
              value={profile?.activity_level ? ACTIVITY_LABELS[profile.activity_level as ActivityLevel] : null}
            />
            <Field label="Équipement disponible" value={equipment.length ? equipment.join(", ") : null} />
          </div>
        </section>
      </div>
    </main>
  );
}
