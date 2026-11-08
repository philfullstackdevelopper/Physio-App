import type { Locale } from "@/i18n/locales";
// Données FICTIVES pour /prototypes/kine-telephone — aucun vrai patient.
// Passées dans les mêmes fonctions de calcul que les vraies pages
// (buildDashboardHome, buildPatientRows, buildConversations), pour que
// l'aperçu montre exactement ce que le kiné verrait.

import { buildDashboardHome } from "@/lib/dashboard/homeData";
import { buildPatientRows } from "@/lib/dashboard/patientRows";
import { buildConversations } from "@/lib/dashboard/conversations";
import type { UnreadMessageRow } from "@/lib/dashboard/unreadMessages";
import type { LibI18n, Tr } from "@/lib/format/relativeDay";
import { stageLabel } from "@/lib/exercise/prescription";
import { buildWeeks, currentWeekNumber, localDateKey } from "@/lib/patient/weeks";
import type { SessionDetail } from "@/components/WeekProgramme";

const DAY = 86_400_000;

/** Traducteur de la zone « demo.samples » (getTranslations côté serveur) :
 *  les données fictives s'affichent dans la langue du visiteur. */
export type DemoT = (key: string, values?: Record<string, string | number>) => string;

export function mockData(t: DemoT, now = new Date(), i18n?: LibI18n) {
  const ago = (days: number, hours = 0) => new Date(now.getTime() - days * DAY - hours * 3_600_000).toISOString();

  const conditions = [
    { id: "c-lomb", name: t("conditions.lowBack") },
    { id: "c-genou", name: t("conditions.kneeReplacement") },
    { id: "c-epaule", name: t("conditions.painfulShoulder") },
  ];
  const people: { id: string; name: string; cond: string | null; stage: string | null; created: number; sessions: number[]; pain?: number[]; invite?: boolean; lapsed?: boolean }[] = [
    { id: "p1", name: "Léa Martin", cond: "c-lomb", stage: "subacute", created: 40, sessions: [0, 2, 4, 6, 9, 11], pain: [3, 3, 2] },
    { id: "p2", name: "Thomas Bernard", cond: "c-genou", stage: "acute", created: 30, sessions: [1, 3, 8], pain: [7, 6, 7] },
    { id: "p3", name: "Camille Dubois", cond: "c-epaule", stage: "recovery", created: 60, sessions: [12, 15], pain: [2, 2] },
    { id: "p4", name: "Julien Moreau", cond: "c-lomb", stage: "acute", created: 20, sessions: [0, 1, 3, 5], pain: [4, 3] },
    { id: "p5", name: "Sophie Laurent", cond: "c-genou", stage: "subacute", created: 50, sessions: [2, 5, 7, 10], pain: [3, 2], lapsed: true },
    { id: "p6", name: "Nicolas Petit", cond: null, stage: null, created: 2, sessions: [], invite: true },
    { id: "p7", name: "Emma Roux", cond: "c-epaule", stage: "acute", created: 25, sessions: [0, 2, 4], pain: [5, 4] },
  ];

  const patients = people.map((p) => ({
    id: p.id,
    full_name: p.name,
    condition_id: p.cond,
    created_at: ago(p.created),
    terms_accepted_at: p.invite ? null : ago(p.created - 1),
    payment_lapsed_at: p.lapsed ? ago(3) : null,
  }));
  const profiles = people.filter((p) => !p.invite).map((p) => ({ id: p.id, injury_stage: p.stage, health_data_consent_at: ago(p.created - 1) }));
  const logs = people.flatMap((p) => p.sessions.map((d, i) => ({ id: `${p.id}-l${i}`, patient_id: p.id, completed_at: ago(d, 2) })));
  const feedback = people.flatMap((p) =>
    (p.pain ?? []).map((score, i) => ({ patient_id: p.id, pain_score: score, difficulty: 2, created_at: ago(p.sessions[i] ?? 0, 2) })),
  );
  const recs = people
    .filter((p) => !p.invite)
    .map((p) => ({ patient_id: p.id, workout_id: `w-${p.id}`, week_start_date: ago(p.created).slice(0, 10), week_count: null, times_per_week: 3 }));

  const home = { firstName: "Julien", ...buildDashboardHome({ now, patients, profiles, logs, feedback }, i18n) };
  const rows = buildPatientRows({ now, patients, profiles, conditions, logs, feedback, recs }, i18n);

  const messages = [
    { patient_id: "p2", body: t("kineMessages.m1"), created_at: ago(0, 3), sender: "patient", read_by_instructor_at: null },
    { patient_id: "p2", body: t("kineMessages.m2"), created_at: ago(2), sender: "instructor", read_by_instructor_at: null },
    { patient_id: "p1", body: t("kineMessages.m3"), created_at: ago(1, 5), sender: "patient", read_by_instructor_at: null },
    { patient_id: "p4", body: t("kineMessages.m4"), created_at: ago(3), sender: "patient", read_by_instructor_at: ago(2) },
    { patient_id: "p7", body: t("kineMessages.m5"), created_at: ago(4), sender: "instructor", read_by_instructor_at: null },
  ];
  const conversations = buildConversations({ patients, profiles, conditions, messages }, i18n?.tx ? (k) => i18n.tx!(`stageShort.${k}`) : undefined);
  const unreadRows: UnreadMessageRow[] = messages
    .filter((m) => m.sender === "patient" && !m.read_by_instructor_at)
    .map((m) => ({ patientId: m.patient_id, patientName: people.find((p) => p.id === m.patient_id)!.name, body: m.body, createdAt: m.created_at }));

  // Fil de messages de CHAQUE patient : en démo, cliquer sur un autre patient
  // doit ouvrir sa conversation, pas toujours celle de Thomas (Philippe,
  // 2026-10-27).
  const threadFor = (patientId: string) =>
    messages
      .filter((m) => m.patient_id === patientId)
      .sort((a, b) => (a.created_at < b.created_at ? -1 : 1))
      .map((m, i) => ({ id: `${patientId}-m${i}`, body: m.body, created_at: m.created_at, sender: m.sender, read_at: m.sender === "instructor" ? ago(1) : null }));
  const thread = threadFor("p2");

  // Ce qu'il faut pour afficher la fiche de n'importe quel patient fictif.
  const patientInfo = (patientId: string) => {
    const p = people.find((x) => x.id === patientId) ?? people[1];
    const pain = p.pain ?? [];
    return {
      id: p.id,
      name: p.name,
      firstName: p.name.split(" ")[0],
      initials: p.name.split(" ").map((w) => w[0]).join(""),
      conditionId: p.cond,
      conditionName: conditions.find((c) => c.id === p.cond)?.name ?? null,
      invited: !!p.invite,
      painLatest: pain.length ? pain[pain.length - 1] : null,
      painPrevious: pain.length > 1 ? pain[pain.length - 2] : null,
      lastSessionDaysAgo: p.sessions.length ? Math.min(...p.sessions) : null,
      sessionCount: p.sessions.length,
      unread: messages.some((m) => m.patient_id === p.id && m.sender === "patient" && !m.read_by_instructor_at),
    };
  };

  return { home, rows, conditions, conversations, unreadRows, thread, threadFor, patientInfo, unreadCount: unreadRows.length };
}

// Fiche patient fictive (Thomas Bernard) : 5 semaines, une séance assignée
// depuis le début, une douleur élevée la semaine dernière.
// Zones du corps de la démo : les VRAIS slugs de la table body_parts (migration
// 0032). BodyPartIllustration choisit sa photo d'après le slug : un slug inventé
// (« genou » au lieu de « genou-jambe ») donnait une tuile sans image.
// Les id « bp-<court> » restent ceux qu'utilisent les exercices fictifs.
// Nom affiché : demo.samples.bodyParts.<court>.
export const demoBodyParts = (t: DemoT) =>
  (
    [
      ["genou", "genou-jambe"],
      ["dos", "dos-lombaires"],
      ["epaule", "epaule"],
      ["hanche", "hanche-fessiers"],
      ["cheville", "cheville-pied"],
      ["cervicales", "cervicales-cou"],
      ["poignet", "poignet-main-coude"],
      ["tronc", "tronc-gainage-abdos"],
      ["equilibre", "equilibre-general"],
    ] as const
  ).map(([short, slug], i) => ({ id: `bp-${short}`, slug, label: t(`bodyParts.${short}`), position: i }));

// Exercices de la démo : uniquement des exercices qui existent dans la banque
// actuelle (après le tri de la migration 0069), avec leur dessin animé. Les
// anciens noms (« Protected Squat (Quadriceps) »…) ont été retirés de la banque
// et ne doivent plus apparaître dans la démo publique.
// Consignes affichées : demo.samples.exerciseInstructions.<key> (le nom reste
// celui de la banque : il sert à trouver le dessin).
export const DEMO_EXERCISES = [
  { key: "quadSet", name: "Quad Set", bodyPartIds: ["bp-genou"], equipment: [] as string[] },
  { key: "heelSlide", name: "Heel Slide", bodyPartIds: ["bp-genou"], equipment: [] },
  { key: "straightLegRaise", name: "Straight Leg Raise", bodyPartIds: ["bp-genou", "bp-hanche"], equipment: [] },
  { key: "terminalKneeExt", name: "Terminal Knee Extension (Band)", bodyPartIds: ["bp-genou"], equipment: ["elastiques"] },
  { key: "bodyweightSquat", name: "Bodyweight Squat", bodyPartIds: ["bp-genou", "bp-hanche"], equipment: [] },
  { key: "wallSit", name: "Wall Sit", bodyPartIds: ["bp-genou"], equipment: [] },
  { key: "gluteBridge", name: "Glute Bridge", bodyPartIds: ["bp-hanche"], equipment: [] },
  { key: "bandedClamshell", name: "Banded Clamshell", bodyPartIds: ["bp-hanche"], equipment: ["elastiques"] },
  // Au moins un exercice par zone, pour que « Mes exercices » ne paraisse pas vide en démo.
  { key: "deadBug", name: "Dead Bug", bodyPartIds: ["bp-dos"], equipment: [] },
  { key: "birdDog", name: "Bird Dog", bodyPartIds: ["bp-dos", "bp-tronc"], equipment: [] },
  { key: "catCow", name: "Cat-Cow Stretch", bodyPartIds: ["bp-dos"], equipment: [] },
  { key: "codman", name: "Codman Pendulum", bodyPartIds: ["bp-epaule"], equipment: [] },
  { key: "bandExternalRotation", name: "Band Shoulder External Rotation", bodyPartIds: ["bp-epaule"], equipment: ["elastiques"] },
  { key: "wallSlides", name: "Wall Slides", bodyPartIds: ["bp-epaule"], equipment: [] },
  { key: "chinTuck", name: "Chin Tuck", bodyPartIds: ["bp-cervicales"], equipment: [] },
  { key: "singleLegCalfRaise", name: "Single-Leg Calf Raise", bodyPartIds: ["bp-cheville"], equipment: [] },
  { key: "plank", name: "Plank", bodyPartIds: ["bp-tronc"], equipment: [] },
  { key: "singleLegStance", name: "Single-Leg Stance", bodyPartIds: ["bp-equilibre", "bp-cheville"], equipment: [] },
];

/** DEMO_EXERCISES avec leur consigne dans la langue du visiteur. */
export const demoExercises = (t: DemoT) =>
  DEMO_EXERCISES.map(({ key, ...e }) => ({ ...e, instructions: t(`exerciseInstructions.${key}`) }));

// Séance fictive selon la pathologie du patient affiché (clé de
// demo.samples.seances, par identifiant de pathologie).
const SEANCE_BY_CONDITION: Record<string, string> = {
  "c-genou": "kneeGentle",
  "c-lomb": "lowBackMorning",
  "c-epaule": "shoulderReturn",
};

type FichePatient = ReturnType<ReturnType<typeof mockData>["patientInfo"]>;

// Par identifiant de pathologie fictive, et par clé de demo.samples.conditions.
const DEMO_CONDITION_IDS: Record<string, string> = {
  "c-genou": "c-genou",
  "c-lomb": "c-dos",
  "c-epaule": "c-epaule",
  kneeReplacement: "c-genou",
  lowBack: "c-dos",
  painfulShoulder: "c-epaule",
};

/** `tStage` = traducteur de « exercise.stage » (libellés des phases). */
export function mockFiche(t: DemoT, now = new Date(), patient?: FichePatient, tStage?: Tr, locale?: Locale) {
  const created = new Date(now.getTime() - 30 * DAY);
  const weeks = buildWeeks(created.toISOString(), now, locale);
  const seanceName = t(`seances.${(patient?.conditionId && SEANCE_BY_CONDITION[patient.conditionId]) || "kneeGentle"}`);
  // Exercices de la séance selon la pathologie (noms réels de la banque).
  const byCondition: Record<string, string[]> = {
    "c-lomb": ["Dead Bug", "Prone Press-Up (McKenzie)", "Cat-Cow Stretch", "Bird Dog"],
    "c-epaule": ["Codman Pendulum", "Band Shoulder External Rotation", "Wall Slides", "Side-Lying External Rotation"],
  };
  const names = (patient?.conditionId && byCondition[patient.conditionId]) || DEMO_EXERCISES.slice(0, 4).map((e) => e.name);
  // Mêmes identifiants que la bibliothèque de la démo (a0, a1…) : un exercice déjà
  // dans la séance n'y est pas reproposé.
  const exercises = names.map((name, i) => {
    const idx = DEMO_EXERCISES.findIndex((e) => e.name === name);
    return { id: idx >= 0 ? `a${idx}` : `e${i + 1}`, name };
  });
  // Sans patient : Thomas Bernard (douleur élevée la semaine dernière). Avec un
  // patient : ses séances fictives, la douleur la plus récente en premier.
  const history: (readonly [number, number])[] = patient
    ? patient.invited
      ? []
      : [[patient.lastSessionDaysAgo ?? 1, patient.painLatest ?? 3], [(patient.lastSessionDaysAgo ?? 1) + 2, patient.painPrevious ?? patient.painLatest ?? 3], [9, 3], [15, 3], [22, 2]]
    : [[1, 7], [3, 6], [8, 7], [10, 4], [15, 3], [17, 3], [22, 2], [24, 3]];
  const dayDetails: Record<string, SessionDetail[]> = {};
  for (const [daysAgo, pain] of history) {
    const d = new Date(now.getTime() - daysAgo * DAY);
    dayDetails[localDateKey(d)] = [
      { logId: `f-${daysAgo}`, workoutName: seanceName, time: "18:15", durationMinutes: 20, painScore: pain, difficulty: 2, notes: !patient && daysAgo === 1 ? t("painOnWaking") : null },
    ];
  }
  const adherencePct = patient ? Math.min(100, Math.round((patient.sessionCount / 6) * 100)) : 33;
  const tone = adherencePct >= 70 ? ("ok" as const) : adherencePct >= 40 ? ("warn" as const) : ("danger" as const);
  const last = patient ? patient.lastSessionDaysAgo : 1;
  const lastLabel = last === null ? t("lastNone") : last === 0 ? t("today") : last === 1 ? t("yesterday") : t("daysAgo", { n: last });
  return {
    weeks,
    currentWeekNumber: currentWeekNumber(weeks, now),
    dayDetails,
    assignments: [{ id: "r1", workoutId: "w1", weekStartDate: weeks[0].startDateKey, weekCount: null }],
    // Pathologie et phase de la séance : « Séance suivante » et le filtre « Par pathologie » de la démo.
    workoutsById: { w1: { id: "w1", name: seanceName, exercises, conditionId: DEMO_CONDITION_IDS[patient?.conditionId ?? ""] ?? "c-genou", stage: "acute" } },
    patientConditionId: DEMO_CONDITION_IDS[patient?.conditionId ?? ""] ?? "c-genou",
    patientStage: "acute" as const,
    bodyParts: demoBodyParts(t),
    addableExercises: DEMO_EXERCISES.map((e, i) => ({ id: `a${i}`, name: e.name, bodyPartIds: e.bodyPartIds, equipment: e.equipment })),
    addableWorkouts: (
      [
        ["kneePhase1B", "kneeReplacement", "bp-genou", "acute"], ["kneePhase2", "kneeReplacement", "bp-genou", "subacute"], ["kneeReturnToSport", "kneeReplacement", "bp-genou", "return_to_sport"],
        ["lowBackMorning", "lowBack", "bp-dos", "subacute"], ["lowBackCore", "lowBack", "bp-dos", "recovery"], ["shoulderReturn", "painfulShoulder", "bp-epaule", "recovery"],
      ] as const
    ).map(([name, condition, bp, stage], i) => ({ id: `aw${i}`, name: t(`seances.${name}`), description: t("workoutDescription"), durationMinutes: 20, timesPerWeek: 3, conditionId: DEMO_CONDITION_IDS[condition], stage, stageLabel: stageLabel(stage, tStage), conditionName: t(`conditions.${condition}`), editHref: i === 0 ? "/dashboard/seances/x" : null, exerciseNames: exercises.map((e) => e.name), exercises, bodyPartIds: [bp] })),
    stats: {
      painLatest: patient ? patient.painLatest : 7,
      painPrevious: patient ? patient.painPrevious : 6,
      adherencePct,
      adherenceTone: tone,
      adherenceLabel: tone === "ok" ? t("adherenceGood") : tone === "warn" ? t("adherenceAverage") : t("adherenceLow"),
      lastSessionLabel: lastLabel,
      lastSessionDetail: last === null ? "" : t("lastSessionDetail"),
    },
  };
}
