// Prototype surface — le tableau de bord kiné avec des données FICTIVES, pour
// juger l'affichage sur téléphone sans se connecter (Philippe, 2026-10-07).
// Rend les vrais composants (DashboardSidebar, DashboardHomeView,
// PatientsTable, KineMessagesView…) dans la même coquille que
// app/dashboard/layout.tsx : tout changement d'affichage s'y voit tel quel.
// Aucune donnée réelle ; les boutons qui écrivent en base ne font rien ici.
// Pas lié depuis l'appli.
//   ?ecran=accueil | patients | messages | conversation | fiche | informations | revenus | seances | exercices

import { getTranslations } from "next-intl/server";
import { getLibI18n } from "@/lib/dashboard/libI18n";
import DashboardSidebar from "@/components/DashboardSidebar";
import DashboardHomeView from "@/components/DashboardHomeView";
import PatientsTable, { type Segment } from "@/components/PatientsTable";
import EditSeanceModal from "@/components/EditSeanceModal";
import PatientsPageView from "@/components/PatientsPageView";
import KineMessagesView from "@/components/KineMessagesView";
import PatientDetailView from "@/components/PatientDetailView";
import PatientActionsMenu from "@/components/PatientActionsMenu";
import KineWeekProgramme from "@/components/KineWeekProgramme";
import KineInfosView from "@/components/KineInfosView";
import FacturationView from "@/app/dashboard/facturation/FacturationView";
import SeancesTabs from "@/components/SeancesTabs";
import ExerciseLibraryGrid from "@/components/ExerciseLibraryGrid";
import ContributionSummary from "@/components/ContributionSummary";
import ContributorsView from "@/components/ContributorsView";
import NewPatientView from "@/components/NewPatientView";
import JoinQrCard from "@/components/JoinQrCard";
import { contributorRanking } from "@/lib/exercise/kineExercises";
import { KINE_FOLLOW_UP_CENTS } from "@/lib/billing/patientPlans";

const inDays = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString();
import { STAGE_LABELS, stageLabel, stageShort, type InjuryStage } from "@/lib/exercise/prescription";
import { DEMO_EXERCISES, demoBodyParts, demoExercises, mockData, mockFiche } from "./mock";
import { noopPublish, noopResult, noopVoid } from "./actions";

export async function generateMetadata() {
  const t = await getTranslations("demo.meta");
  return { title: t("previewKine"), robots: { index: false } };
}
export const dynamic = "force-dynamic";

const PATHS: Record<string, string> = {
  accueil: "/dashboard",
  patients: "/dashboard/patients",
  messages: "/dashboard/messages",
  conversation: "/dashboard/messages",
  fiche: "/dashboard/patients",
  seances: "/dashboard/seances",
  informations: "/dashboard/informations",
  revenus: "/dashboard/facturation",
  editeur: "/dashboard/seances/demo",
  nouveau: "/dashboard/patients/new",
  exercices: "/dashboard/exercises",
  contributeurs: "/dashboard/exercises",
};

// Exercices proposés par d'autres kinés et publiés (fictifs) : crédit
// « Proposé par » sur les cartes, et classement des contributeurs.
// Nom affiché : demo.samples.contribExercises.<key>.
const DEMO_CONTRIB_EXERCISES: { key: string; bodyPartIds: string[]; author: string; authorId: string }[] = [
  { key: "lateralStepUp", bodyPartIds: ["bp-genou"], author: "Claire Fontaine · Kiné du Parc", authorId: "k1" },
  { key: "reverseLunge", bodyPartIds: ["bp-genou", "bp-hanche"], author: "Claire Fontaine · Kiné du Parc", authorId: "k1" },
  { key: "singleLegBridgeBand", bodyPartIds: ["bp-hanche"], author: "Marc Lefèvre · Cabinet des Lilas", authorId: "k2" },
  { key: "quadrupedThoracicRotation", bodyPartIds: ["bp-dos"], author: "Julien Roux", authorId: "moi" },
];
// Classement de démo : Julien Roux (le kiné de la démo) a 6 exercices publiés.
const DEMO_RANKING_ROWS = [
  ...Array.from({ length: 9 }, () => ({ created_by: "k1", publication_status: "published" as const, author_label: "Claire Fontaine · Kiné du Parc" })),
  ...Array.from({ length: 6 }, () => ({ created_by: "moi", publication_status: "published" as const, author_label: "Julien Roux" })),
  ...Array.from({ length: 3 }, () => ({ created_by: "k2", publication_status: "published" as const, author_label: "Marc Lefèvre · Cabinet des Lilas" })),
  ...Array.from({ length: 1 }, () => ({ created_by: "k3", publication_status: "published" as const, author_label: "Inès Garnier · Kiné Sport Lyon" })),
];
const DEMO_PUBLISHED = 6;

export default async function KineTelephonePrototype({
  searchParams,
}: {
  searchParams: Promise<{ ecran?: string; nouvelle?: string; patient?: string; filtre?: string; seance?: string }>;
}) {
  // patient / filtre / seance : ce qui a été choisi dans l'écran précédent
  // (components/DemoShell.tsx les garde en traduisant l'adresse de l'appli).
  const { ecran = "accueil", nouvelle, patient, filtre, seance } = await searchParams;
  const t = await getTranslations("demo.samples");
  const tStage = await getTranslations("exercise.stage");
  const tStageShort = await getTranslations("exercise.stageShort");
  const i18n = await getLibI18n();
  const d = mockData(t, new Date(), i18n);
  const DEMO_BODY_PARTS = demoBodyParts(t);
  const stages = (Object.keys(STAGE_LABELS) as InjuryStage[]).map((k) => [k, stageLabel(k, tStage)] as [InjuryStage, string]);

  let screen: React.ReactNode;
  if (ecran === "patients") {
    const initialSegment: Segment =
      filtre === "surveiller" ? "surveiller" : filtre === "jour" ? "jour" : "tous";
    screen = (
      <PatientsPageView>
        <PatientsTable
          rows={d.rows}
          conditions={d.conditions}
          initialSegment={initialSegment}
          getPatientThread={noopResult}
          sendPatientMessage={noopResult}
          reactivatePatient={noopResult}
          deletePatient={noopVoid}
        />
      </PatientsPageView>
    );
  } else if (ecran === "messages" || ecran === "conversation") {
    const selected = d.conversations.find((c) => c.patientId === (patient ?? "p2")) ?? d.conversations.find((c) => c.patientId === "p2") ?? null;
    screen = (
      <KineMessagesView
        conversations={d.conversations}
        selected={selected}
        explicitlyOpened={ecran === "conversation"}
        thread={selected ? d.threadFor(selected.patientId) : d.thread}
        q=""
        markConversationRead={noopVoid}
        sendInboxMessage={noopVoid}
      />
    );
  } else if (ecran === "informations") {
    screen = <KineInfosView instructorName="Julien Roux" />;
  } else if (ecran === "revenus") {
    screen = (
      // Modèle actuel (lib/billing/patientPlans.ts) : mêmes patients que le
      // reste de la démo, mêmes libellés et même calcul que la vraie page
      // (6 € par patient abonné hors essai et hors résiliation).
      <FacturationView
        connectStatus="active"
        patientCount={d.rows.length}
        monthlyCents={3 * KINE_FOLLOW_UP_CENTS}
        subscribers={[
          { patientId: "p1", name: "Léa Martin", planLabel: t("plans.plan_3m"), status: "active", periodEnd: inDays(18) },
          { patientId: "p2", name: "Thomas Bernard", planLabel: t("plans.plan_1m"), status: "active", periodEnd: inDays(9) },
          { patientId: "p3", name: "Camille Dubois", planLabel: t("plans.plan_6m"), status: "active", periodEnd: inDays(26) },
          { patientId: "p4", name: "Julien Moreau", planLabel: t("freeTrial"), status: "active", periodEnd: inDays(6) },
          { patientId: "p5", name: "Sophie Laurent", planLabel: t("plans.plan_1m"), status: "cancelled", periodEnd: inDays(4) },
        ]}
      />
    );
  } else if (ecran === "seances") {
    const names = DEMO_EXERCISES.slice(0, 4).map((e) => e.name);
    const zones = DEMO_BODY_PARTS.filter((b) => ["bp-genou", "bp-dos", "bp-epaule"].includes(b.id));
    // name / cond : clés de demo.samples.seances / demo.samples.conditions.
    const item = (id: string, name: string, cond: string, stage: InjuryStage, lead: number) => ({
      id,
      bodyPartIds: [/^knee/.test(name) ? "bp-genou" : /^lowBack/.test(name) ? "bp-dos" : "bp-epaule"],
      name: t(`seances.${name}`),
      conditionName: t(`conditions.${cond}`),
      stage,
      stageLabel: stageLabel(stage, tStage),
      extra: t("exerciseCount", { n: 4 }),
      leadExerciseName: names[lead],
      exerciseNames: names,
      exerciseCount: 4,
    });
    screen = (
      <main className="flex h-dvh min-h-0 flex-col max-sm:h-[calc(100dvh-var(--phone-chrome))]">
        <div className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col px-4 pb-4 pt-2 sm:px-8 sm:py-6 short:sm:py-4">
          <SeancesTabs
            // ?ecran=seances&nouvelle=1 : ouvre « Nouvelle séance » avec quelques
            // exercices fictifs, pour juger la liste et le bouton (i) de démonstration.
            openNewSeance={nouvelle === "1"}
            exercises={names.map((name, i) => ({ id: `demo-ex-${i}`, name, bodyPartIds: ["bp-genou"] }))}
            bodyParts={zones}
            mine={[
              item("s1", "kneeGentle", "kneeReplacement", "acute", 0),
              item("s2", "lowBackMorning", "lowBack", "subacute", 1),
              item("s3", "shoulderReturn", "painfulShoulder", "recovery", 2),
            ]}
            templates={[
              item("t1", "lowBackPhase1", "lowBack", "acute", 3),
              item("t2", "lowBackPhase2", "lowBack", "subacute", 0),
              item("t3", "kneePhase1", "kneeReplacement", "acute", 2),
            ]}
            duplicateSeance={noopVoid}
            deleteSeance={noopVoid}
            hideTemplateWorkout={noopVoid}
            unhideTemplateWorkout={noopVoid}
            createSeance={noopVoid}
            conditions={d.conditions}
            stages={stages}
          />
        </div>
      </main>
    );
  } else if (ecran === "exercices") {
    const bodyParts = DEMO_BODY_PARTS;
    screen = (
      <main className="flex h-dvh min-h-0 flex-col max-sm:h-[calc(100dvh-var(--phone-chrome))]">
        <div className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col px-4 pb-4 pt-2 sm:px-8 sm:py-6 short:sm:py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex min-w-0 flex-col gap-1">
              <h1 className="text-2xl font-semibold text-ink">{t("myExercises")}</h1>
              <ContributionSummary
                contributors={contributorRanking(DEMO_RANKING_ROWS).map((r) => ({ id: r.authorId, label: r.label }))}
                published={DEMO_PUBLISHED}
                pending={1}
              />
            </div>
          </div>
          <ExerciseLibraryGrid
            bodyParts={bodyParts}
            exercises={[...demoExercises(t).map((e, i) => ({
              id: `ex${i}`,
              name: e.name,
              instructions: e.instructions,
              media_url: null,
              media_start_seconds: 0,
              created_by: null,
              bodyPartIds: e.bodyPartIds,
              equipment: e.equipment,
              search_keywords: [],
              hidden: false,
              publication_status: "published" as const,
              patient_id: null,
              review_note: null,
              author_label: null,
            })),
            ...DEMO_CONTRIB_EXERCISES.map((e, i) => ({
              id: `kex${i}`,
              name: t(`contribExercises.${e.key}`),
              instructions: null,
              media_url: null,
              media_start_seconds: 0,
              created_by: e.authorId,
              bodyPartIds: e.bodyPartIds,
              equipment: [],
              search_keywords: [],
              hidden: false,
              publication_status: (e.authorId === "moi" ? "pending" : "published") as "pending" | "published",
              patient_id: null,
              review_note: null,
              author_label: e.author,
            }))]}
            currentUserId="moi"
            hideExercise={noopVoid}
            unhideExercise={noopVoid}
            creator={{
              patients: d.rows.map((p) => ({ id: p.id, name: p.name })),
              publishedCount: DEMO_PUBLISHED,
              requestPublication: noopPublish,
              demo: true,
            }}
          />
        </div>
      </main>
    );
  } else if (ecran === "nouveau") {
    // « Ajouter un patient » : le formulaire s'envoie (bloqué par DemoShell,
    // « rien n'est enregistré ») et le QR code ouvre la démo patient.
    screen = (
      <NewPatientView
        open
        addPatientAction={noopVoid}
        seanceGroups={[
          { condition: t("conditions.lowBack"), seances: [{ id: "d1", label: `${stageShort("subacute", tStageShort)} · ${t("seances.lowBackMorning")}` }, { id: "d2", label: `${stageShort("recovery", tStageShort)} · ${t("seances.lowBackCore")}` }] },
          { condition: t("conditions.kneeReplacement"), seances: [{ id: "d3", label: `${stageShort("acute", tStageShort)} · ${t("seances.kneeGentle")}` }] },
        ]}
        qr={<JoinQrCard instructorId="demo" open demoPath="/demo/patient?ecran=onboarding" />}
      />
    );
  } else if (ecran === "contributeurs") {
    screen = <ContributorsView ranking={contributorRanking(DEMO_RANKING_ROWS)} meId="moi" />;
  } else if (ecran === "editeur") {
    // Détail d'une séance de « Mes séances » (s1, s2, s3), dans la même fenêtre
    // que dans l'appli. Enregistrer ne fait rien en démo.
    const seances: Record<string, [string, string, InjuryStage]> = {
      s1: [t("seances.kneeGentle"), "c-genou", "acute"],
      s2: [t("seances.lowBackMorning"), "c-lomb", "subacute"],
      s3: [t("seances.shoulderReturn"), "c-epaule", "recovery"],
    };
    const id = seance && seances[seance] ? seance : "s1";
    const [name, conditionId, stage] = seances[id];
    const pickable = DEMO_EXERCISES.map((e, i) => ({ id: `demo-ex-${i}`, name: e.name, searchKeywords: null, equipment: e.equipment, bodyPartIds: e.bodyPartIds }));
    screen = (
      <main className="min-h-screen max-sm:min-h-0">
        <EditSeanceModal
          conditions={d.conditions}
          stages={stages}
          exercises={pickable}
          bodyParts={DEMO_BODY_PARTS}
          saveSeance={noopVoid}
          edit={{
            workoutId: id,
            name,
            conditionId,
            stage,
            durationMinutes: 20,
            timesPerWeek: 3,
            // Les exercices de la zone de la séance (genou, dos ou épaule).
            exerciseIds: pickable
              .filter((e) => e.bodyPartIds.includes(({ "c-genou": "bp-genou", "c-lomb": "bp-dos", "c-epaule": "bp-epaule" } as Record<string, string>)[conditionId] ?? "bp-genou"))
              .slice(0, 4)
              .map((e) => e.id),
            deleteAction: noopVoid,
            saved: false,
            error: null,
          }}
        />
      </main>
    );
  } else if (ecran === "fiche") {
    // La fiche du patient choisi (Thomas Bernard par défaut).
    const p = d.patientInfo(patient ?? "p2");
    const f = mockFiche(t, new Date(), p.id === "p2" ? undefined : p, tStage, i18n.locale);
    const highPain = f.stats.painLatest !== null && f.stats.painLatest >= 6;
    screen = (
      <PatientDetailView
        name={p.name}
        warning={highPain ? { label: t("highPain"), detail: t("highPainDetail", { score: f.stats.painLatest ?? 0 }) } : null}
        adjusted={false}
        stats={f.stats}
        actionsMenu={
          <PatientActionsMenu
            patientId={p.id}
            patientName={p.firstName}
            deletePatient={noopVoid}
            messages={{ patient: { id: p.id, name: p.name, initials: p.initials }, unreadCount: p.unread ? 1 : 0, getThread: noopResult, sendMessage: noopResult }}
          />
        }
        programme={
          <KineWeekProgramme
            weeks={f.weeks}
            currentWeekNumber={f.currentWeekNumber}
            dayDetails={f.dayDetails}
            assignments={f.assignments}
            workoutsById={f.workoutsById}
            patientId={p.id}
            patientFirstName={p.firstName}
            patientEquipment={["tapis", "chaise", "halteres"]}
            addableExercises={f.addableExercises}
            bodyParts={f.bodyParts}
            addableWorkouts={f.addableWorkouts}
            patientConditionId={f.patientConditionId}
            patientStage={f.patientStage}
            adjustAction={noopVoid}
            assignAction={noopVoid}
            removeAction={noopVoid}
          />
        }
      />
    );
  } else {
    screen = <DashboardHomeView h={d.home} unreadRows={d.unreadRows} />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-app-bg text-ink max-sm:bg-phone-bg sm:flex-row">
      <DashboardSidebar
        instructorName="Julien Roux"
        unreadCount={d.unreadCount}
        pathnameOverride={PATHS[ecran] ?? "/dashboard"}
        contributorTitle={t("contributorTitle")}
      />
      <div data-phone-pad="" className="relative min-w-0 flex-1 max-sm:pb-[calc(5rem+env(safe-area-inset-bottom))]">{screen}</div>
    </div>
  );
}
