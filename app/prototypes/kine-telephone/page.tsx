// Prototype surface — le tableau de bord kiné avec des données FICTIVES, pour
// juger l'affichage sur téléphone sans se connecter (Philippe, 2026-10-07).
// Rend les vrais composants (DashboardSidebar, DashboardHomeView,
// PatientsTable, KineMessagesView…) dans la même coquille que
// app/dashboard/layout.tsx : tout changement d'affichage s'y voit tel quel.
// Aucune donnée réelle ; les boutons qui écrivent en base ne font rien ici.
// Pas lié depuis l'appli.
//   ?ecran=accueil | patients | messages | conversation | fiche | informations | revenus | seances | exercices

import DashboardSidebar from "@/components/DashboardSidebar";
import DashboardHomeView from "@/components/DashboardHomeView";
import PatientsTable from "@/components/PatientsTable";
import PatientsPageView from "@/components/PatientsPageView";
import KineMessagesView from "@/components/KineMessagesView";
import PatientDetailView from "@/components/PatientDetailView";
import PatientActionsMenu from "@/components/PatientActionsMenu";
import KineWeekProgramme from "@/components/KineWeekProgramme";
import KineInfosView from "@/components/KineInfosView";
import FacturationView from "@/app/dashboard/facturation/FacturationView";
import SeancesTabs from "@/components/SeancesTabs";
import ExerciseLibraryGrid from "@/components/ExerciseLibraryGrid";
import { STAGE_LABELS, type InjuryStage } from "@/lib/exercise/prescription";
import { mockData, mockFiche } from "./mock";
import { noopResult, noopVoid } from "./actions";
import MonthlyReviewBar from "@/components/MonthlyReviewBar";

export const metadata = { title: "Aperçu tableau de bord kiné", robots: { index: false } };
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
};

export default async function KineTelephonePrototype({ searchParams }: { searchParams: Promise<{ ecran?: string; nouvelle?: string }> }) {
  const { ecran = "accueil", nouvelle } = await searchParams;
  const d = mockData();

  let screen: React.ReactNode;
  if (ecran === "patients") {
    screen = (
      <PatientsPageView>
        <PatientsTable
          rows={d.rows}
          conditions={d.conditions}
          getPatientThread={noopResult}
          sendPatientMessage={noopResult}
          reactivatePatient={noopResult}
          deletePatient={noopVoid}
        />
      </PatientsPageView>
    );
  } else if (ecran === "messages" || ecran === "conversation") {
    const selected = d.conversations.find((c) => c.patientId === "p2") ?? null;
    screen = (
      <KineMessagesView
        conversations={d.conversations}
        selected={selected}
        explicitlyOpened={ecran === "conversation"}
        thread={d.thread}
        tab="all"
        q=""
        markConversationRead={noopVoid}
        sendInboxMessage={noopVoid}
        toggleFollowUp={noopVoid}
      />
    );
  } else if (ecran === "informations") {
    screen = <KineInfosView instructorName="Julien Roux" />;
  } else if (ecran === "revenus") {
    screen = (
      <FacturationView
        connectStatus="active"
        data={{
          period: "2026-10-01",
          kinePriceCents: 2000,
          priceCents: 2000,
          followUps: [
            { patientId: "p1", name: "Claire Martin", status: "active", priceCents: 2000, cardLabel: "VISA •••• 4242", review: null },
            { patientId: "p2", name: "Hugo Bernard", status: "pending_card", priceCents: 2000, cardLabel: null, review: null },
            { patientId: "p3", name: "Léa Petit", status: "active", priceCents: 2000, cardLabel: "VISA •••• 1881", review: { id: "r1", paymentStatus: "paid", amountCents: 2000, validatedAt: "2026-10-12T09:00:00Z" } },
          ],
          notInFollowUp: 4,
          activePatients: 7,
          monthEstimate: { free: false, htCents: 2100, vatCents: 420, ttcCents: 2520 },
          firstBilledMonth: false,
          platformPaymentLabel: "Prélèvement SEPA •••• 3201",
          platformCustomerId: "cus_demo",
          invoices: [{ periodStart: "2026-09-01", amountCents: 2160, status: "paid", patientCount: 6 }],
          reviewMonths: ["2026-10-01", "2026-09-01"],
          collectedCents: 2000,
        }}
      />
    );
  } else if (ecran === "seances") {
    const names = ["Pont fessier (coxarthrose)", "Mini Wall Sit (Shallow)", "Controlled Mini-Squat (Knee Arthritis)", "Light Closed-Chain Quad Strengthening"];
    const zones = [
      ["genou", "Genou / jambe"], ["dos", "Dos / lombaires"], ["epaule", "Épaule"],
    ].map(([slug, label], i) => ({ id: `bp-${slug}`, slug, label, position: i }));
    const item = (id: string, name: string, cond: string, stage: InjuryStage, lead: number) => ({
      id,
      bodyPartIds: [/Genou/.test(name) ? "bp-genou" : /Lomb/.test(name) ? "bp-dos" : "bp-epaule"],
      name,
      conditionName: cond,
      stage,
      stageLabel: STAGE_LABELS[stage],
      extra: "4 exercices",
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
              item("s1", "Genou, renforcement doux", "Prothèse de genou", "acute", 0),
              item("s2", "Lombaires, mobilité du matin", "Lombalgie chronique", "subacute", 1),
              item("s3", "Épaule, retour au geste", "Épaule douloureuse", "recovery", 2),
            ]}
            templates={[
              item("t1", "Lombalgie, phase 1", "Lombalgie chronique", "acute", 3),
              item("t2", "Lombalgie, phase 2", "Lombalgie chronique", "subacute", 0),
              item("t3", "Genou, phase 1", "Prothèse de genou", "acute", 2),
            ]}
            duplicateSeance={noopVoid}
            deleteSeance={noopVoid}
            hideTemplateWorkout={noopVoid}
            unhideTemplateWorkout={noopVoid}
            createSeance={noopVoid}
            conditions={d.conditions}
            stages={Object.entries(STAGE_LABELS) as [InjuryStage, string][]}
          />
        </div>
      </main>
    );
  } else if (ecran === "exercices") {
    const bodyParts = [
      ["genou", "Genou / jambe"], ["dos", "Dos / lombaires"], ["epaule", "Épaule"], ["hanche", "Hanche / fessiers"],
      ["cheville", "Cheville / pied"], ["cervicales", "Cervicales / cou"], ["poignet", "Poignet / main"], ["tronc", "Tronc / gainage"],
    ].map(([slug, label], i) => ({ id: `bp-${slug}`, slug, label, position: i }));
    const names = [
      "Pont fessier (coxarthrose)", "Mini Wall Sit (Shallow)", "Controlled Mini-Squat (Knee Arthritis)", "Light Closed-Chain Quad Strengthening",
      "Assisted Partial Squat", "Isometric Wall Sit (60 Degrees)", "Protected Squat (Quadriceps)",
    ];
    screen = (
      <main className="flex h-dvh min-h-0 flex-col max-sm:h-[calc(100dvh-var(--phone-chrome))]">
        <div className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col px-4 pb-4 pt-2 sm:px-8 sm:py-6 short:sm:py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h1 className="text-2xl font-semibold text-ink">Mes exercices</h1>
          </div>
          <ExerciseLibraryGrid
            bodyParts={bodyParts}
            exercises={names.map((name, i) => ({
              id: `ex${i}`,
              name,
              instructions: "Allongé sur le dos, genoux fléchis, soulevez le bassin en serrant les fessiers puis redescendez lentement.",
              media_url: null,
              media_start_seconds: 0,
              created_by: i === 0 ? "moi" : null,
              bodyPartIds: ["bp-genou"],
              search_keywords: [],
              hidden: false,
            }))}
            currentUserId="moi"
            createExercise={noopVoid}
            hideExercise={noopVoid}
            unhideExercise={noopVoid}
          />
        </div>
      </main>
    );
  } else if (ecran === "fiche") {
    const f = mockFiche();
    screen = (
      <PatientDetailView
        name="Thomas Bernard"
        warning={{ label: "Douleur élevée", detail: "Douleur 7/10 signalée hier." }}
        paymentLapsed={false}
        adjusted={false}
        stats={f.stats}
        monthlyReview={
          <MonthlyReviewBar
            state={{
              patientId: "p2",
              firstName: "Thomas",
              monthLabel: "octobre 2026",
              followUp: "active",
              priceCents: 2000,
              review: null,
              draft: `Bonjour Thomas,

Ce mois-ci : 9 séances faites, assiduité 82 %, dernière douleur notée 7/10.

La douleur d'hier vient sûrement de la montée en charge des squats : je les remplace cette semaine par des demi-squats. Continuez la marche quotidienne. On refait le point dans deux semaines.`,
              connectActive: true,
            }}
            validateAction={noopVoid}
            proposeAction={noopVoid}
          />
        }
        actionsMenu={
          <PatientActionsMenu
            patientId="p2"
            patientName="Thomas"
            paymentLapsedAt={null}
            paymentEligibleForDeletion={false}
            redirectTo="/prototypes/kine-telephone?ecran=fiche"
            deletePatient={noopVoid}
            messages={{ patient: { id: "p2", name: "Thomas Bernard", initials: "TB" }, unreadCount: 1, getThread: noopResult, sendMessage: noopResult }}
          />
        }
        programme={
          <KineWeekProgramme
            weeks={f.weeks}
            currentWeekNumber={f.currentWeekNumber}
            dayDetails={f.dayDetails}
            assignments={f.assignments}
            workoutsById={f.workoutsById}
            patientId="p2"
            patientFirstName="Thomas"
            patientEquipment={["tapis", "chaise", "halteres"]}
            addableExercises={f.addableExercises}
            bodyParts={f.bodyParts}
            addableWorkouts={f.addableWorkouts}
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
      <DashboardSidebar instructorName="Julien Roux" unreadCount={d.unreadCount} pathnameOverride={PATHS[ecran] ?? "/dashboard"} />
      <div data-phone-pad="" className="relative min-w-0 flex-1 max-sm:pb-[calc(5rem+env(safe-area-inset-bottom))]">{screen}</div>
    </div>
  );
}
