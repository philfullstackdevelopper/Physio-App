// Prototype surface — « Mon programme » et l'écran de séance du patient avec
// des données FICTIVES, pour vérifier leur tenue sur chaque format d'écran
// sans se connecter (audit des formats, 2026-10-10). Rend les vrais
// composants (ProgrammeView, WorkoutSession) dans la même coquille que
// app/patient/layout.tsx. Aucune donnée réelle, aucune requête. Pas lié
// depuis l'appli.
//   ?ecran=programme | seance | historique | seance-du-jour | changer-offre | informations | historique-detail | onboarding

import PatientNav from "@/components/PatientNav";
import ProgrammeView, { type ProgrammeWorkout } from "@/app/patient/programme/ProgrammeView";
import WorkoutSession from "@/components/WorkoutSession";
import { DEFAULT_SQUAT } from "@/lib/exercise/prescription";
import HistoriqueView from "@/app/patient/historique/HistoriqueView";
import HistoriqueDetailView from "@/app/patient/historique/[logId]/HistoriqueDetailView";
import InformationsView from "@/app/patient/compte/informations/InformationsView";
import ChangerOffreView from "@/app/patient/compte/changer-offre/ChangerOffreView";
import { TIERS } from "@/lib/billing/plans";
import OnboardingView from "@/app/patient/onboarding/OnboardingView";
import { STAGE_LABELS, type InjuryStage } from "@/lib/exercise/prescription";
import { EQUIPMENT_LABELS, EQUIPMENT_OPTIONS } from "@/lib/exercise/equipment";
import SeanceDuJourView from "@/app/patient/seance-du-jour/SeanceDuJourView";

export const metadata = { title: "Aperçu écrans patient", robots: { index: false } };

const EXERCISES = [
  ["Pont fessier (coxarthrose)", "Allongé sur le dos, genoux fléchis, soulevez le bassin en serrant les fessiers puis redescendez lentement."],
  ["Mini Wall Sit (Shallow)", "Dos contre le mur, descendez légèrement en pliant les genoux, tenez la position puis remontez."],
  ["Controlled Mini-Squat (Knee Arthritis)", "Debout, pieds écartés largeur du bassin, fléchissez doucement les genoux sans dépasser les orteils."],
  ["Assisted Partial Squat", "En vous tenant à un appui stable, descendez à mi-hauteur puis remontez en poussant dans les talons."],
] as const;

async function noop() {
  "use server";
}

export default async function PatientEcransPrototype({ searchParams }: { searchParams: Promise<{ ecran?: string }> }) {
  const { ecran = "programme" } = await searchParams;

  const workouts: ProgrammeWorkout[] = [
    {
      id: "demo-seance",
      name: "Renforcement du genou — niveau 2",
      description: "Renforcement doux des quadriceps et des fessiers.",
      durationMinutes: 20,
      timesPerWeek: 3,
      doneThisWeek: 1,
      isActive: true,
      exercises: EXERCISES.map(([name, instructions], i) => ({ id: `ex${i}`, name, instructions, categoryLabel: "Genou / jambe" })),
    },
  ];

  // L'onboarding s'affiche sans la barre de navigation, comme dans l'appli.
  if (ecran === "onboarding") {
    const parts = [["genou", "Genou / jambe"], ["dos", "Dos / lombaires"], ["epaule", "Épaule"], ["hanche", "Hanche / fessiers"], ["cheville", "Cheville / pied"], ["cervicales", "Cervicales / cou"], ["poignet", "Poignet / main"], ["tronc", "Tronc / gainage"], ["coude", "Coude / bras"]];
    return (
      <OnboardingView
        needsConsent
        wizard={{
          saveAction: noop,
          bodyParts: parts.map(([slug, label]) => ({ id: `bp-${slug}`, slug, label })),
          stages: Object.entries(STAGE_LABELS) as [InjuryStage, string][],
          profile: null,
          equipmentOptions: EQUIPMENT_OPTIONS,
          equipmentLabels: EQUIPMENT_LABELS,
          currentEquipment: new Set(),
          needsConsent: true,
        }}
      />
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-app-bg text-ink max-sm:bg-phone-bg sm:flex-row">
      <PatientNav patientName="Léa Martin" unreadCount={1} pathnameOverride="/patient/programme" />
      <div className="relative min-w-0 flex-1 pb-20 max-sm:pb-[calc(5rem+env(safe-area-inset-bottom))] sm:pb-0">
        {ecran === "informations" ? (
          <InformationsView
            name="Léa Martin"
            email="lea.martin@exemple.fr"
            situation={[
              { label: "Zones travaillées", value: "Genou / jambe, Hanche / fessiers" },
              { label: "Étape de récupération", value: "Phase intermédiaire — reprise progressive" },
              { label: "Avancée de la rééducation", value: "Je marche sans béquilles depuis deux semaines, encore gênée dans les escaliers." },
              { label: "Ce qui s'est passé", value: "Entorse du genou droit au ski en février, opérée en mars." },
              { label: "Date de naissance", value: "14 mars 1988" },
              { label: "Taille / poids", value: "168 cm · 62 kg" },
              { label: "Niveau d'activité", value: "Modérée (activité régulière)" },
              { label: "Équipement disponible", value: "Tapis, élastique, chaise" },
            ]}
          />
        ) : ecran === "historique-detail" ? (
          <HistoriqueDetailView
            name="Renforcement du genou — niveau 2"
            dateLabel="lundi 28 septembre à 18:15"
            feedback={{ pain_score: 3, notes: "Un peu raide au début, mieux à la fin." }}
            exercises={[...EXERCISES.map(([name]) => name), "Light Closed-Chain Quad Strengthening", "Isometric Wall Sit (60 Degrees)", "Protected Squat (Quadriceps)"]}
          />
        ) : ecran === "changer-offre" ? (
          <ChangerOffreView
            currentTier="essentiel"
            prices={{ essentiel: TIERS.essentiel.amount, standard: TIERS.standard.amount, premium: TIERS.premium.amount }}
            changeTier={noop}
          />
        ) : ecran === "historique" ? (
          <HistoriqueView
            groups={Array.from({ length: 9 }, (_, i) => ({
              day: `jour ${i + 1} — ${["lundi", "mercredi", "vendredi"][i % 3]} ${28 - i * 2} septembre`,
              logs: [{ id: `log${i}`, name: "Renforcement du genou — niveau 2", time: "18:15" }],
            }))}
            lockedDays={["mardi 2 septembre", "dimanche 31 août"]}
          />
        ) : ecran === "seance-du-jour" ? (
          <SeanceDuJourView
            activeWorkout={{
              id: "demo-seance",
              name: "Renforcement du genou — niveau 2",
              description: "Renforcement doux des quadriceps et des fessiers.",
              duration_minutes: 20,
              times_per_week: 3,
              workout_exercises: EXERCISES.map(([name], i) => ({ position: i, exercises: { name } })),
            }}
            doneToday
            weekComplete={false}
          />
        ) : ecran === "seance" ? (
          // Même enveloppe que app/patient/[workoutId]/seance/page.tsx.
          <main className="p-6 max-sm:min-h-[calc(100dvh-var(--phone-chrome))] max-sm:p-4 max-sm:short:py-2 sm:min-h-dvh sm:p-8 short:sm:py-3">
            <div className="mx-auto max-w-xl">
              <WorkoutSession
                workoutId="demo-seance"
                patientId="demo-patient"
                workoutName="Renforcement du genou — niveau 2"
                exercises={EXERCISES.map(([name, instructions]) => ({ name, instructions, mediaUrl: null, mediaStartSeconds: 0 }))}
                prescription={DEFAULT_SQUAT}
              />
            </div>
          </main>
        ) : (
          <ProgrammeView week={4} workouts={workouts} tip="Mieux vaut une séance courte et régulière qu'une longue de temps en temps." />
        )}
      </div>
    </div>
  );
}
