// Prototype surface — « Mon programme » et l'écran de séance du patient avec
// des données FICTIVES, pour vérifier leur tenue sur chaque format d'écran
// sans se connecter (audit des formats, 2026-10-10). Rend les vrais
// composants (ProgrammeView, WorkoutSession) dans la même coquille que
// app/patient/layout.tsx. Aucune donnée réelle, aucune requête. Pas lié
// depuis l'appli.
//   ?ecran=programme | seance | historique | seance-du-jour | changer-offre | informations | historique-detail | onboarding | progres | compte | abonnement | cadenas | cabinet (formulaire kiné de secours)

import SuiviView from "@/app/patient/suivi/SuiviView";
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
import ProgresView from "@/app/patient/progres/ProgresView";
import AbonnementView from "@/app/patient/abonnement/AbonnementView";
import CompteView from "@/app/patient/compte/CompteView";
import PatientLockScreen from "@/components/PatientLockScreen";
import { buildPainSeries } from "@/lib/dashboard/painHistory";
import SignupOnboardingView from "@/app/signup/onboarding/SignupOnboardingView";
import SeanceDuJourView from "@/app/patient/seance-du-jour/SeanceDuJourView";

export const metadata = { title: "Aperçu écrans patient", robots: { index: false } };
// Recalculée à chaque visite : la courbe de douleur fictive suit la vraie date.
export const dynamic = "force-dynamic";

const EXERCISES = [
  ["Pont fessier (coxarthrose)", "Allongé sur le dos, genoux fléchis, soulevez le bassin en serrant les fessiers puis redescendez lentement."],
  ["Mini Wall Sit (Shallow)", "Dos contre le mur, descendez légèrement en pliant les genoux, tenez la position puis remontez."],
  ["Controlled Mini-Squat (Knee Arthritis)", "Debout, pieds écartés largeur du bassin, fléchissez doucement les genoux sans dépasser les orteils."],
  ["Assisted Partial Squat", "En vous tenant à un appui stable, descendez à mi-hauteur puis remontez en poussant dans les talons."],
] as const;

// Hors du composant : la règle react-hooks/purity refuse Date.now() dans le rendu.
const daysAgoIso = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();

// Onglet surligné dans la barre de navigation, selon l'écran affiché.
const NAV_PATH: Record<string, string> = {
  progres: "/patient/progres",
  compte: "/patient/compte",
  informations: "/patient/compte",
  "changer-offre": "/patient/compte",
  historique: "/patient/progres",
  "historique-detail": "/patient/progres",
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

  // Choix d'offre et écran cadenas : plein écran, sans la barre de navigation.
  if (ecran === "abonnement") {
    return (
      <AbonnementView
        paymentFailed={false}
        trialAvailable
        prices={{ essentiel: TIERS.essentiel.amount, standard: TIERS.standard.amount, premium: TIERS.premium.amount }}
        kineName="Julien Roux"
        paymentsReady
        firstChargeDate="19 octobre"
        startTierCheckout={noop}
        openBillingPortal={noop}
      />
    );
  }
  if (ecran === "cabinet") {
    return <SignupOnboardingView defaults={{ cabinet_name: null, cabinet_address: null, phone: null, rpps_number: null, siret: null }} action={noop} />;
  }
  if (ecran === "cadenas") return <PatientLockScreen reason="payment_failed" firstName="Léa" kineName="Julien Roux" />;

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
          <SuiviView
            sp={{}}
            kineName="Julien Roux"
            kineReady
            status="active"
            currentPrice={2000}
            acceptedPrice={2000}
            price={2000}
            cardLabel="VISA •••• 4242"
            reviews={[
              { id: "r2", period: "2026-09-01", amount_cents: 2000, payment_status: "paid", fee_note_year: 2026, fee_note_seq: 14 },
              { id: "r1", period: "2026-08-01", amount_cents: 2000, payment_status: "paid", fee_note_year: 2026, fee_note_seq: 6 },
            ]}
          />
        ) : ecran === "compte" ? (
          <CompteView
            fullName="Léa Martin"
            followUp={{ status: "active", priceCents: 2000, cardLabel: "VISA •••• 4242", kineName: "Julien Roux" }}
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
              logs: [{ id: `log${i}`, name: "Renforcement du genou, niveau 2", time: "18:15" }],
            }))}
            lockedDays={["mardi 2 septembre", "dimanche 31 août"]}
          />
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
            <div className="mx-auto max-w-xl">
              <WorkoutSession
                workoutId="demo-seance"
                patientId="demo-patient"
                workoutName="Renforcement du genou, niveau 2"
                exercises={EXERCISES.map(([name, instructions]) => ({ name, instructions, mediaUrl: null, mediaStartSeconds: 0 }))}
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
