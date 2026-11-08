// Prototype surface — « Mon programme » et l'écran de séance du patient avec
// des données FICTIVES, pour vérifier leur tenue sur chaque format d'écran
// sans se connecter (audit des formats, 2026-10-10). Rend les vrais
// composants (ProgrammeView, WorkoutSession) dans la même coquille que
// app/patient/layout.tsx. Aucune donnée réelle, aucune requête. Pas lié
// depuis l'appli.
//   ?ecran=programme | seance | historique | informations | historique-detail | onboarding | progres | compte | suivi | cabinet (formulaire kiné de secours)

import { getLocale, getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/locales";
import SuiviView from "@/app/patient/suivi/SuiviView";
import PatientNav from "@/components/PatientNav";
import ProgrammeView, { type ProgrammeWorkout } from "@/app/patient/programme/ProgrammeView";
import WorkoutSession from "@/components/WorkoutSession";
import { DEFAULT_SQUAT } from "@/lib/exercise/prescription";
import HistoriqueView from "@/app/patient/historique/HistoriqueView";
import HistoriqueDetailView from "@/app/patient/historique/[logId]/HistoriqueDetailView";
import InformationsView from "@/app/patient/compte/informations/InformationsView";
import OnboardingView from "@/app/patient/onboarding/OnboardingView";
import { STAGE_LABELS, stageLabel, type InjuryStage } from "@/lib/exercise/prescription";
import { EQUIPMENT_OPTIONS, equipmentLabels } from "@/lib/exercise/equipment";
import ProgresView from "@/app/patient/progres/ProgresView";
import CompteView from "@/app/patient/compte/CompteView";
import { buildPainSeries } from "@/lib/dashboard/painHistory";
import SignupOnboardingView from "@/app/signup/onboarding/SignupOnboardingView";
import { demoBodyParts, type DemoT } from "@/app/prototypes/kine-telephone/mock";
import { resolveMediaUrl } from "@/lib/storage/r2-videos";
import { buildHistoryWeeks } from "@/lib/patient/historyWeeks";
import { thisWeekStartDateKey } from "@/lib/patient/weeks";

export async function generateMetadata() {
  const t = await getTranslations("demo.meta");
  return { title: t("previewPatient"), robots: { index: false } };
}
// Recalculée à chaque visite : la courbe de douleur fictive suit la vraie date.
export const dynamic = "force-dynamic";

// Exercices filmés avec Jules (lib/exercise/filmedExercises.ts) : la démo
// montre leur vraie vidéo (Cloudflare R2, lien signé côté serveur — même
// fichier que exercises.media_url, migration 0075) et l'objectif séries ×
// répétitions (Philippe, 2026-11-02).
// Consigne affichée : demo.samples.patientInstructions.<clé> (le nom reste
// celui de la banque : il sert à trouver le dessin et la vidéo).
const EXERCISE_LIST = [
  ["Glute Bridge", "gluteBridge", "glute-bridge.mp4"],
  ["Bodyweight Squat", "bodyweightSquat", "bodyweight-squat.mp4"],
  ["Straight Leg Raise", "straightLegRaise", "straight-leg-raise.mp4"],
  ["Terminal Knee Extension (Band)", "terminalKneeExt", "terminal-knee-extension.mp4"],
] as const;
const exercisesFor = (t: DemoT) =>
  EXERCISE_LIST.map(([name, key, video]) => [name, t(`patientInstructions.${key}`), video] as const);

// Hors du composant : la règle react-hooks/purity refuse Date.now() dans le rendu.
const daysAgoIso = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();

// Historique fictif : 4 semaines, séance prévue 3 fois par semaine — cette
// semaine 1 faite, puis 3/3, 2/3 et 1/3 (bleu = fait, rouge = manqué).
function demoHistoryWeeks(t: DemoT, locale: Locale, labels: { weekOf: (date: string) => string; session: string }) {
  const now = new Date();
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7), 18, 15);
  const at = (weeksAgo: number, day: number) => new Date(monday.getTime() + (day - weeksAgo * 7) * 86_400_000).toISOString();
  const workout = { name: t("kneeL2"), timesPerWeek: 3, exercises: EXERCISE_LIST.map(([name]) => name) };
  const done: [number, number][] = [[0, 0], [1, 0], [1, 2], [1, 4], [2, 1], [2, 3], [3, 2]];
  return buildHistoryWeeks({
    now,
    locale,
    labels,
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

export default async function PatientEcransPrototype({ searchParams }: { searchParams: Promise<{ ecran?: string; depuis?: string }> }) {
  const { ecran = "programme", depuis } = await searchParams;
  const t = await getTranslations("demo.samples");
  const tStage = await getTranslations("exercise.stage");
  const tEquip = await getTranslations("exercise.equipment");
  // Historique : « Semaine du … » et « Séance » dans la langue de l'interface.
  const locale = (await getLocale()) as Locale;
  const tHistory = await getTranslations("patient.history");
  const tCommon = await getTranslations("patient.common");
  const historyLabels = { weekOf: (date: string) => tHistory("weekOf", { date }), session: tCommon("session") };
  const EXERCISES = exercisesFor(t);

  const workouts: ProgrammeWorkout[] = [
    {
      id: "demo-seance",
      name: t("kneeL2"),
      description: t("kneeL2Description"),
      durationMinutes: 20,
      timesPerWeek: 3,
      doneThisWeek: 1,
      isActive: true,
      exercises: EXERCISES.map(([name, instructions], i) => ({ id: `ex${i}`, name, instructions, categoryLabel: t("kneeLeg") })),
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
          bodyParts: demoBodyParts(t),
          stages: (Object.keys(STAGE_LABELS) as InjuryStage[]).map((k) => [k, stageLabel(k, tStage)] as [InjuryStage, string]),
          profile: null,
          equipmentOptions: EQUIPMENT_OPTIONS,
          equipmentLabels: equipmentLabels(tEquip),
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
            conditionName={t("conditions.kneeReplacement")}
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
          <SuiviView sp={{}} kineName="Julien Roux" kineReady subscription={null} programmeReady demo />
        ) : ecran === "compte" ? (
          <CompteView
            fullName="Léa Martin"
            followUp={{ status: "active", line: t("followUpLine") }}
          />
        ) : ecran === "informations" ? (
          <InformationsView
            name="Léa Martin"
            email="lea.martin@exemple.fr"
            situation={[
              { label: t("info.zonesLabel"), value: t("info.zones") },
              { label: t("info.stageLabel"), value: t("info.stage") },
              { label: t("info.progressLabel"), value: t("info.progress") },
              { label: t("info.historyLabel"), value: t("info.history") },
              { label: t("info.birthLabel"), value: t("info.birth") },
              { label: t("info.sizeLabel"), value: "168 cm · 62 kg" },
              { label: t("info.activityLabel"), value: t("info.activity") },
              { label: t("info.equipmentLabel"), value: t("info.equipment") },
            ]}
          />
        ) : ecran === "historique-detail" ? (
          <HistoriqueDetailView
            name={t("kneeL2")}
            dateLabel={t("historyDate")}
            feedback={{ pain_score: 3, notes: t("historyNotes") }}
            exercises={[...EXERCISES.map(([name]) => name), "Quad Set", "Heel Slide", "Banded Clamshell"].map((name) => ({ name, skipped: false }))}
            back={depuis === "accueil" ? { href: "/patient", label: t("backHome") } : undefined}
          />
        ) : ecran === "historique" ? (
          <HistoriqueView weeks={demoHistoryWeeks(t, locale, historyLabels)} />
        ) : ecran === "seance" ? (
          // Même enveloppe que app/patient/[workoutId]/seance/page.tsx.
          <main className="p-6 max-sm:min-h-[calc(100dvh-var(--phone-chrome))] max-sm:p-4 max-sm:short:py-2 sm:min-h-dvh sm:p-8 short:sm:py-3">
            <div className="mx-auto max-w-xl sm:max-w-5xl">
              <WorkoutSession
                workoutId="demo-seance"
                patientId="demo-patient"
                workoutName={t("kneeL2")}
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
          <ProgrammeView week={4} workouts={workouts} tip={t("programmeTip")} />
        )}
      </div>
    </div>
  );
}
