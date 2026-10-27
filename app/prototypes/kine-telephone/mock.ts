// Données FICTIVES pour /prototypes/kine-telephone — aucun vrai patient.
// Passées dans les mêmes fonctions de calcul que les vraies pages
// (buildDashboardHome, buildPatientRows, buildConversations), pour que
// l'aperçu montre exactement ce que le kiné verrait.

import { buildDashboardHome } from "@/lib/dashboard/homeData";
import { buildPatientRows } from "@/lib/dashboard/patientRows";
import { buildConversations } from "@/lib/dashboard/conversations";
import type { UnreadMessageRow } from "@/lib/dashboard/unreadMessages";
import { buildWeeks, currentWeekNumber, localDateKey } from "@/lib/patient/weeks";
import type { SessionDetail } from "@/components/WeekProgramme";

const DAY = 86_400_000;

export function mockData(now = new Date()) {
  const ago = (days: number, hours = 0) => new Date(now.getTime() - days * DAY - hours * 3_600_000).toISOString();

  const conditions = [
    { id: "c-lomb", name: "Lombalgie chronique" },
    { id: "c-genou", name: "Prothèse de genou" },
    { id: "c-epaule", name: "Épaule douloureuse" },
  ];
  const people: { id: string; name: string; cond: string | null; stage: string | null; created: number; sessions: number[]; pain?: number[]; invite?: boolean; lapsed?: boolean; followUp?: boolean }[] = [
    { id: "p1", name: "Léa Martin", cond: "c-lomb", stage: "subacute", created: 40, sessions: [0, 2, 4, 6, 9, 11], pain: [3, 3, 2] },
    { id: "p2", name: "Thomas Bernard", cond: "c-genou", stage: "acute", created: 30, sessions: [1, 3, 8], pain: [7, 6, 7], followUp: true },
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
    follow_up_at: p.followUp ? ago(1) : null,
  }));
  const profiles = people.filter((p) => !p.invite).map((p) => ({ id: p.id, injury_stage: p.stage, health_data_consent_at: ago(p.created - 1) }));
  const logs = people.flatMap((p) => p.sessions.map((d, i) => ({ id: `${p.id}-l${i}`, patient_id: p.id, completed_at: ago(d, 2) })));
  const feedback = people.flatMap((p) =>
    (p.pain ?? []).map((score, i) => ({ patient_id: p.id, pain_score: score, difficulty: 2, created_at: ago(p.sessions[i] ?? 0, 2) })),
  );
  const recs = people
    .filter((p) => !p.invite)
    .map((p) => ({ patient_id: p.id, workout_id: `w-${p.id}`, week_start_date: ago(p.created).slice(0, 10), week_count: null, times_per_week: 3 }));

  const home = { firstName: "Julien", ...buildDashboardHome({ now, patients, profiles, logs, feedback }) };
  const rows = buildPatientRows({ now, patients, profiles, conditions, logs, feedback, recs });

  const messages = [
    { patient_id: "p2", body: "Bonjour, j'ai eu plus mal au genou après la séance d'hier, est-ce normal ?", created_at: ago(0, 3), sender: "patient", read_by_instructor_at: null },
    { patient_id: "p2", body: "Pensez à bien glacer après chaque séance.", created_at: ago(2), sender: "instructor", read_by_instructor_at: null },
    { patient_id: "p1", body: "Merci pour le nouveau programme !", created_at: ago(1, 5), sender: "patient", read_by_instructor_at: null },
    { patient_id: "p4", body: "Je reprends demain, j'étais en déplacement.", created_at: ago(3), sender: "patient", read_by_instructor_at: ago(2) },
    { patient_id: "p7", body: "Très bien, continuez ainsi.", created_at: ago(4), sender: "instructor", read_by_instructor_at: null },
  ];
  const conversations = buildConversations({ patients, profiles, conditions, messages });
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
export const DEMO_BODY_PARTS = (
  [
    ["genou", "genou-jambe", "Genou & jambe"],
    ["dos", "dos-lombaires", "Dos & lombaires"],
    ["epaule", "epaule", "Épaule"],
    ["hanche", "hanche-fessiers", "Hanche & fessiers"],
    ["cheville", "cheville-pied", "Cheville & pied"],
    ["cervicales", "cervicales-cou", "Cervicales & cou"],
    ["poignet", "poignet-main-coude", "Poignet, main & coude"],
    ["tronc", "tronc-gainage-abdos", "Tronc, gainage & abdominaux"],
    ["equilibre", "equilibre-general", "Équilibre & général"],
  ] as const
).map(([short, slug, label], i) => ({ id: `bp-${short}`, slug, label, position: i }));

// Exercices de la démo : uniquement des exercices qui existent dans la banque
// actuelle (après le tri de la migration 0069), avec leur dessin animé. Les
// anciens noms (« Protected Squat (Quadriceps) »…) ont été retirés de la banque
// et ne doivent plus apparaître dans la démo publique.
export const DEMO_EXERCISES = [
  { name: "Quad Set", bodyPartIds: ["bp-genou"], equipment: [] as string[], instructions: "Allongé sur le dos, jambes tendues et posées au sol. Sans bouger la jambe, contractez fort le muscle de la cuisse en écrasant l'arrière du genou vers le sol, tenez quelques secondes, puis relâchez." },
  { name: "Heel Slide", bodyPartIds: ["bp-genou"], equipment: [], instructions: "Allongé sur le dos, jambes tendues. Faites glisser lentement le talon vers les fesses en pliant le genou aussi loin que possible sans douleur forte, puis tendez à nouveau la jambe." },
  { name: "Straight Leg Raise", bodyPartIds: ["bp-genou", "bp-hanche"], equipment: [], instructions: "Allongé sur le dos, appuyé sur les avant-bras. Verrouillez le genou en contractant la cuisse, levez la jambe tendue jusqu'à environ 45°, puis redescendez lentement." },
  { name: "Terminal Knee Extension (Band)", bodyPartIds: ["bp-genou"], equipment: ["elastiques"], instructions: "Debout, élastique derrière le genou avant, fixé devant vous. Partez genou légèrement plié, puis tendez complètement le genou en poussant contre l'élastique." },
  { name: "Sit-to-Stand", bodyPartIds: ["bp-genou", "bp-hanche"], equipment: [], instructions: "Assis au bord d'une chaise, bras croisés. Penchez le buste en avant et levez-vous sans l'aide des mains, puis rasseyez-vous lentement." },
  { name: "Wall Sit", bodyPartIds: ["bp-genou"], equipment: [], instructions: "Dos contre le mur, descendez jusqu'à la hauteur qui reste confortable pour le genou et tenez la position en respirant calmement." },
  { name: "Glute Bridge", bodyPartIds: ["bp-hanche"], equipment: [], instructions: "Allongé sur le dos, genoux fléchis, pieds au sol. Soulevez le bassin en serrant les fessiers, puis redescendez lentement." },
  { name: "Clamshell", bodyPartIds: ["bp-hanche"], equipment: [], instructions: "Allongé sur le côté, genoux fléchis, pieds joints. Ouvrez le genou du dessus sans faire rouler le bassin, puis refermez lentement." },
  // Au moins un exercice par zone, pour que « Mes exercices » ne paraisse pas vide en démo.
  { name: "Supine Pelvic Tilt", bodyPartIds: ["bp-dos"], equipment: [], instructions: "Allongé sur le dos, genoux fléchis. Plaquez le bas du dos contre le sol en basculant le bassin, tenez quelques secondes, puis relâchez." },
  { name: "Bird Dog", bodyPartIds: ["bp-dos", "bp-tronc"], equipment: [], instructions: "À quatre pattes, dos plat. Tendez un bras devant vous et la jambe opposée derrière vous, sans cambrer, puis revenez et changez de côté." },
  { name: "Cat-Cow Stretch", bodyPartIds: ["bp-dos"], equipment: [], instructions: "À quatre pattes. Arrondissez le dos vers le plafond en rentrant le menton, puis creusez-le doucement en levant la tête. Alternez lentement." },
  { name: "Codman Pendulum", bodyPartIds: ["bp-epaule"], equipment: [], instructions: "Penché en avant, une main sur une table, l'autre bras pendant et relâché. Laissez-le se balancer doucement comme un pendule." },
  { name: "Band Shoulder External Rotation", bodyPartIds: ["bp-epaule"], equipment: ["elastiques"], instructions: "Coude plié à 90° et collé au corps, élastique en main. Tournez l'avant-bras vers l'extérieur sans décoller le coude, puis revenez lentement." },
  { name: "Wall Slides", bodyPartIds: ["bp-epaule"], equipment: [], instructions: "Face au mur, avant-bras posés contre le mur. Faites-les glisser vers le haut en gardant les épaules basses, puis redescendez." },
  { name: "Chin Tuck", bodyPartIds: ["bp-cervicales"], equipment: [], instructions: "Assis bien droit. Rentrez le menton en reculant la tête tout droit, comme pour faire un double menton, tenez quelques secondes." },
  { name: "Calf Raise", bodyPartIds: ["bp-cheville"], equipment: [], instructions: "Debout, l'avant des pieds sur une marche. Montez sur la pointe des pieds le plus haut possible, puis redescendez lentement." },
  { name: "Wrist Curl", bodyPartIds: ["bp-poignet"], equipment: [], instructions: "Avant-bras posé sur une table, paume vers le haut. Laissez le poignet descendre, puis remontez-le lentement." },
  { name: "Plank", bodyPartIds: ["bp-tronc"], equipment: [], instructions: "En appui sur les avant-bras et la pointe des pieds, corps aligné des chevilles à la tête. Tenez la position en respirant." },
  { name: "Single-Leg Stance", bodyPartIds: ["bp-equilibre", "bp-cheville"], equipment: [], instructions: "Debout, mains sur les hanches. Levez un pied et tenez l'équilibre sur l'autre jambe, genou légèrement déverrouillé." },
];

// Séance fictive selon la pathologie du patient affiché.
const SEANCE_BY_CONDITION: Record<string, string> = {
  "Prothèse de genou": "Genou, renforcement doux",
  "Lombalgie chronique": "Lombaires, mobilité du matin",
  "Épaule douloureuse": "Épaule, retour au geste",
};

type FichePatient = ReturnType<ReturnType<typeof mockData>["patientInfo"]>;

export function mockFiche(now = new Date(), patient?: FichePatient) {
  const created = new Date(now.getTime() - 30 * DAY);
  const weeks = buildWeeks(created.toISOString(), now);
  const seanceName = (patient?.conditionName && SEANCE_BY_CONDITION[patient.conditionName]) || "Genou, renforcement doux";
  // Exercices de la séance selon la pathologie (noms réels de la banque).
  const byCondition: Record<string, string[]> = {
    "Lombalgie chronique": ["Supine Pelvic Tilt", "Knee-to-Chest Stretch", "Cat-Cow Stretch", "Bird Dog"],
    "Épaule douloureuse": ["Codman Pendulum", "Band Shoulder External Rotation", "Wall Slides", "Supine Stick Shoulder Flexion"],
  };
  const names = (patient?.conditionName && byCondition[patient.conditionName]) || DEMO_EXERCISES.slice(0, 4).map((e) => e.name);
  const exercises = names.map((name, i) => ({ id: `e${i + 1}`, name }));
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
      { logId: `f-${daysAgo}`, workoutName: seanceName, time: "18:15", durationMinutes: 20, painScore: pain, difficulty: 2, notes: !patient && daysAgo === 1 ? "Douleur au réveil" : null },
    ];
  }
  const adherencePct = patient ? Math.min(100, Math.round((patient.sessionCount / 6) * 100)) : 33;
  const tone = adherencePct >= 70 ? ("ok" as const) : adherencePct >= 40 ? ("warn" as const) : ("danger" as const);
  const last = patient ? patient.lastSessionDaysAgo : 1;
  const lastLabel = last === null ? "Aucune" : last === 0 ? "Aujourd'hui" : last === 1 ? "Hier" : `Il y a ${last} jours`;
  return {
    weeks,
    currentWeekNumber: currentWeekNumber(weeks, now),
    dayDetails,
    assignments: [{ id: "r1", workoutId: "w1", weekStartDate: weeks[0].startDateKey, weekCount: null }],
    workoutsById: { w1: { id: "w1", name: seanceName, exercises } },
    bodyParts: DEMO_BODY_PARTS,
    addableExercises: DEMO_EXERCISES.map((e, i) => ({ id: `a${i}`, name: e.name, bodyPartIds: e.bodyPartIds, equipment: e.equipment })),
    addableWorkouts: [
      ["Genou, phase 1", "Prothèse de genou", "bp-genou"], ["Genou, phase 2", "Prothèse de genou", "bp-genou"], ["Genou, retour au sport", "Prothèse de genou", "bp-genou"],
      ["Lombaires, mobilité du matin", "Lombalgie chronique", "bp-dos"], ["Lombaires, gainage doux", "Lombalgie chronique", "bp-dos"], ["Épaule, retour au geste", "Épaule douloureuse", "bp-epaule"],
    ].map(([name, conditionName, bp], i) => ({ id: `aw${i}`, name, description: "Renforcement progressif, sans douleur.", durationMinutes: 20, timesPerWeek: 3, stageLabel: "Phase " + ((i % 3) + 1), conditionName, editHref: i === 0 ? "/dashboard/seances/x" : null, exerciseNames: exercises.map((e) => e.name), bodyPartIds: [bp] })),
    stats: {
      painLatest: patient ? patient.painLatest : 7,
      painPrevious: patient ? patient.painPrevious : 6,
      adherencePct,
      adherenceTone: tone,
      adherenceLabel: tone === "ok" ? "Bonne" : tone === "warn" ? "Moyenne" : "Faible",
      lastSessionLabel: lastLabel,
      lastSessionDetail: last === null ? "" : "20 min · 4 exercices",
    },
  };
}
