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

  const home = { firstName: "Philippe", ...buildDashboardHome({ now, patients, profiles, logs, feedback }) };
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

  const thread = messages
    .filter((m) => m.patient_id === "p2")
    .sort((a, b) => (a.created_at < b.created_at ? -1 : 1))
    .map((m, i) => ({ id: `m${i}`, body: m.body, created_at: m.created_at, sender: m.sender, read_at: m.sender === "instructor" ? ago(1) : null }));

  return { home, rows, conditions, conversations, unreadRows, thread, unreadCount: unreadRows.length };
}

// Fiche patient fictive (Thomas Bernard) : 5 semaines, une séance assignée
// depuis le début, une douleur élevée la semaine dernière.
export function mockFiche(now = new Date()) {
  const created = new Date(now.getTime() - 30 * DAY);
  const weeks = buildWeeks(created.toISOString(), now);
  const exercises = [
    { id: "e1", name: "Pont fessier (coxarthrose)" },
    { id: "e2", name: "Mini Wall Sit (Shallow)" },
    { id: "e3", name: "Controlled Mini-Squat (Knee Arthritis)" },
    { id: "e4", name: "Light Closed-Chain Quad Strengthening" },
  ];
  const dayDetails: Record<string, SessionDetail[]> = {};
  for (const [daysAgo, pain] of [[1, 7], [3, 6], [8, 7], [10, 4], [15, 3], [17, 3], [22, 2], [24, 3]] as const) {
    const d = new Date(now.getTime() - daysAgo * DAY);
    dayDetails[localDateKey(d)] = [
      { logId: `f-${daysAgo}`, workoutName: "Genou — renforcement doux", time: "18:15", durationMinutes: 20, painScore: pain, difficulty: 2, notes: daysAgo === 1 ? "Douleur au réveil" : null },
    ];
  }
  return {
    weeks,
    currentWeekNumber: currentWeekNumber(weeks, now),
    dayDetails,
    assignments: [{ id: "r1", workoutId: "w1", weekStartDate: weeks[0].startDateKey, weekCount: null }],
    workoutsById: { w1: { id: "w1", name: "Genou — renforcement doux", exercises } },
    addableExercises: [{ id: "e5", name: "Assisted Partial Squat", bodyPartIds: [] }],
    addableWorkouts: [],
    stats: {
      painLatest: 7,
      painPrevious: 6,
      adherencePct: 33,
      adherenceTone: "danger" as const,
      adherenceLabel: "Faible",
      lastSessionLabel: "Hier",
      lastSessionDetail: "20 min · 4 exercices",
    },
  };
}
