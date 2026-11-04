// Prototype surface — « Mon programme » et l'écran de séance du patient avec
// des données FICTIVES, pour vérifier leur tenue sur chaque format d'écran
// sans se connecter (audit des formats, 2026-10-10). Rend les vrais
// composants (ProgrammeView, WorkoutSession) dans la même coquille que
// app/patient/layout.tsx. Aucune donnée réelle, aucune requête. Pas lié
// depuis l'appli.
//   ?ecran=programme | seance | historique | seance-du-jour | informations | historique-detail | onboarding | progres | compte | suivi | cabinet (formulaire kiné de secours)

import SuiviView from "@/app/patient/suivi/SuiviView";
import PatientNav from "@/components/PatientNav";
import ProgrammeView, { type ProgrammeWorkout } from "@/app/patient/programme/ProgrammeView";
import WorkoutSession from "@/components/WorkoutSession";
import { DEFAULT_SQUAT } from "@/lib/exercise/prescription";
import HistoriqueView from "@/app/patient/historique/HistoriqueView";
import HistoriqueDetailView from "@/app/patient/historique/[logId]/HistoriqueDetailView";
import InformationsView from "@/app/patient/compte/informations/InformationsView";
import OnboardingView from "@/app/patient/onboarding/OnboardingView";
import { STAGE_LABELS, type InjuryStage } from "@/lib/exercise/prescription";
import { EQUIPMENT_LABELS, EQUIPMENT_OPTIONS } from "@/lib/exercise/equipment";
import ProgresView from "@/app/patient/progres/ProgresView";
import CompteView from "@/app/patient/compte/CompteView";
import { buildPainSeries } from "@/lib/dashboard/painHistory";
import SignupOnboardingView from "@/app/signup/onboarding/SignupOnboardingView";
import SeanceDuJourView from "@/app/patient/seance-du-jour/SeanceDuJourView";
import { DEMO_BODY_PARTS } from "@/app/prototypes/kine-telephone/mock";
import { resolveMediaUrl } from "@/lib/storage/r2-videos";
import { buildHistoryWeeks } from "@/lib/patient/historyWeeks";
import { thisWeekStartDateKey } from "@/lib/patient/weeks";

export const metadata = { title: "Aperçu écrans patient", robots: { index: false } };
// Recalculée à chaque visite : la courbe de douleur fictive suit la vraie date.
export const dynamic = "force-dynamic";

// Exercices filmés avec Jules (lib/exercise/filmedExercises.ts) : la démo
// montre leur vraie vidéo (Cloudflare R2, lien signé côté serveur — même
// fichier que exercises.media_url, migration 0075) et l'objectif séries ×
// répétitions (Philippe, 2026-11-02).
const EXERCISES = [
  ["Glute Bridge", "Allongé sur le dos, genoux fléchis, soulevez le bassin en serrant les fessiers puis redescendez lentement.", "glute-bridge.mp4"],
  ["Bodyweight Squat", "Debout, pieds écartés largeur du bassin, fléchissez doucement les genoux sans dépasser les orteils.", "bodyweight-squat.mp4"],
  [
    "Straight Leg Raise",
    "Allongé sur le dos, appuyé sur les avant-bras, l'autre jambe allongée au sol. Contractez la cuisse pour verrouiller le genou, puis levez la jambe tendue jusqu'à environ 45°, sans plier le genou. Redescendez lentement.",
    "straight-leg-raise.mp4",
  ],
  [
    "Terminal Knee Extension (Band)",
    "Debout, un pied devant l'autre, élastique passé derrière le genou avant et fixé devant vous à hauteur du genou. Partez genou légèrement plié, puis tendez complètement le genou en poussant vers l'arrière contre l'élastique. Revenez lentement.",
    "terminal-knee-extension.mp4",
  ],
] as const;

// Hors du composant : la règle react-hooks/purity refuse Date.now() dans le rendu.
const daysAgoIso = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();

// Historique fictif : 4 semaines, séance prévue 3 fois par semaine — cette
// semaine 1 faite, puis 3/3, 2/3 et 1/3 (bleu = fait, rouge = manqué).
function demoHistoryWeeks() {
  const now = new Date();
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7), 18, 15);
  const at = (weeksAgo: number, day: number) => new Date(monday.getTime() + (day - weeksAgo * 7) * 86_400_000).toISOString();
  const workout = { name: "Renforcement du genou, niveau 2", timesPerWeek: 3, exercises: EXERCISES.map(([name]) => name) };
  const done: [number, number][] = [[0, 0], [1, 0], [1, 2], [1, 4], [2, 1], [2, 3], [3, 2]];
  return buildHistoryWeeks({
    now,
    assignments: [{ workoutId: "demo-seance", weekStartDate: thisWeekStartDateKey(new Date(at(3, 0))), workout }],
    logs: done.map(([w, d], i) => ({ id: `log${i}`, completedAt: at(w, d), workout })),
  });
}

// Onglet surligné dans la barre de navigation, selon l'écran affiché.
const NAV_PATH: Record<string, string> = {
  progres: "/patient/progres",
  compte: "/patient/compte",
  informations: "/patient/compte",
  historique: "/patient/progres",
  "historique-detail": "/patient/progres",
  // « Suivi mensuel » s'ouvre depuis les Paramètres (lien retour « Paramètres »).
  suivi: "/patient/compte",
};

async function noop() {
  "use server";
}

export default async function PatientEcransPrototype({ searchParams }: { searchParams: Promise<{ ecran?: string }> }) {
  const { ecran = "programme" } = await searchParams;

  const workouts: ProgrammeWorkout[] = [
    {
      id: "demo-seance",
      name: "Renforcement du genou, niveau 2",
      description: "Renforcement doux des quadriceps et des fessiers.",
      durationMinutes: 20,
      timesPerWeek: 3,
      doneThisWeek: 1,
      isActive: true,
      exercises: EXERCISES.map(([name, instructions], i) => ({ id: `ex${i}`, name, instructions, categoryLabel: "Genou / jambe" })),
    },
  ];

  // Formulaire kiné de secours : plein écran, sans la barre de navigation.
  if (ecran === "cabinet") {
    return <SignupOnboardingView defaults={{ cabinet_name: null, cabinet_address: null, phone: null, rpps_number: null, siret: null }} action={noop} />;
  }

  // L'onboarding s'affiche sans la barre de navigation, comme dans l'appli.
  if (ecran === "onboarding") {
    return (
      <OnboardingView
        needsConsent
        wizard={{
          saveAction: noop,
          bodyParts: DEMO_BODY_PARTS,
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
      <PatientNav patientName="Léa Martin" unreadCount={1} pathnameOverride={NAV_PATH[ecran] ?? "/patient/programme"} />
      <div className="relative min-w-0 flex-1 pb-20 max-sm:pb-[calc(5rem+env(safe-area-inset-bottom))] sm:pb-0">
        {ecran === "progres" ? (
          <ProgresView
            conditionName="Prothèse de genou"
            hasPain
            phoneTileCount={3}
            adherenceNow={{ pct: 67, done: 8, expected: 12 }}
            adherenceDelta={12}
            painAvgNow={3.4}
            painDelta={-0.8}
            pain={buildPainSeries(
              [26, 22, 19, 15, 12, 8, 5, 2].map((daysAgo, i) => ({
                pain_score: [6, 5, 5, 4, 4, 3, 3, 2][i],
                created_at: daysAgoIso(daysAgo),
              })),
            )}
          />
        ) : ecran === "suivi" ? (
          // Formules patient (2026-11-02) : la démo montre le choix des trois formules.
          <SuiviView sp={{}} kineName="Julien Roux" kineReady subscription={null} demo />
        ) : ecran === "compte" ? (
          <CompteView
            fullName="Léa Martin"
            followUp={{ status: "active", priceCents: 1999, cardLabel: null, kineName: "Julien Roux", line: "3 mois · renouvelée le 4 février" }}
          />
        ) : ecran === "informations" ? (
          <InformationsView
            name="Léa Martin"
            email="lea.martin@exemple.fr"
            situation={[
              { label: "Zones travaillées", value: "Genou / jambe, Hanche / fessiers" },
              { label: "Étape de récupération", value: "Phase intermédiaire, reprise progressive" },
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
            name="Renforcement du genou, niveau 2"
            dateLabel="lundi 28 septembre à 18:15"
            feedback={{ pain_score: 3, notes: "Un peu raide au début, mieux à la fin." }}
            exercises={[...EXERCISES.map(([name]) => name), "Quad Set", "Heel Slide", "Banded Clamshell"]}
          />
        ) : ecran === "historique" ? (
          <HistoriqueView weeks={demoHistoryWeeks()} />
        ) : ecran === "seance-du-jour" ? (
          <SeanceDuJourView
            activeWorkout={{
              id: "demo-seance",
              name: "Renforcement du genou, niveau 2",
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
            <div className="mx-auto max-w-xl sm:max-w-5xl">
              <WorkoutSession
                workoutId="demo-seance"
                patientId="demo-patient"
                workoutName="Renforcement du genou, niveau 2"
                exercises={await Promise.all(
                  EXERCISES.map(async ([name, instructions, video]) => ({
                    name,
                    instructions,
                    mediaUrl: await resolveMediaUrl(`r2:${video}`),
                    mediaStartSeconds: 0,
                  })),
                )}
                prescription={DEFAULT_SQUAT}
                demo
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
