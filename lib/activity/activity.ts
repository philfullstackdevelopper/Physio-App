// Vue « Activité » de /admin (Philippe, 2026-11-16 : « comment ils arrivent,
// s'ils utilisent l'appli, et les relancer s'ils ne l'utilisent pas »).
// Logique pure (testée dans activity.test.ts) : à partir des lignes lues en
// base (lib/db/activity.ts) et des dates de connexion de Clerk
// (lib/admin/clerkActivity.ts), classe chaque personne et compte le parcours.

export type PatientActivityDb = {
  patient_id: string;
  instructor_id: string;
  email: string | null;
  created_at: string | Date;
  joined_via_link: boolean;
  terms_accepted_at: string | Date | null;
  subscription_status: string | null;
  has_programme: boolean;
  first_session_at: string | Date | null;
  last_session_at: string | Date | null;
  sessions_7d: number;
  sessions_30d: number;
  sessions_total: number;
  push_platforms: string[] | null;
  is_test: boolean;
};

export type InstructorActivityDb = {
  instructor_id: string;
  full_name: string | null;
  email: string | null;
  status: string;
  created_at: string | Date;
  first_patient_at: string | Date | null;
  last_programme_at: string | Date | null;
  push_platforms: string[] | null;
  is_test: boolean;
};

/** Ce que Clerk sait de la personne (dernière visite, dernière connexion). */
export type SeenInfo = { lastActiveAt: string | null; lastSignInAt: string | null };

/** Patient : actif (séance ≤ 7 j), ralentit (8–14 j), inactif (> 14 j),
 *  pas commencé (aucune séance). Kiné : actif (venu ≤ 7 j), ralentit (8–30 j),
 *  inactif (> 30 j ou jamais revenu). */
export type ActivityLevel = "actif" | "ralentit" | "inactif" | "pas_commence";

export type PatientStage = "ajoute" | "cgu" | "carte" | "programme" | "seance";

export const PATIENT_STAGES: { key: PatientStage; label: string }[] = [
  { key: "ajoute", label: "Ajouté par son kiné" },
  { key: "cgu", label: "CGU acceptées" },
  { key: "carte", label: "Carte enregistrée" },
  { key: "programme", label: "Programme reçu" },
  { key: "seance", label: "1re séance faite" },
];

export type KineStage = "inscrit" | "valide" | "patient" | "programme";

export const KINE_STAGES: { key: KineStage; label: string }[] = [
  { key: "inscrit", label: "Inscrit" },
  { key: "valide", label: "Compte validé" },
  { key: "patient", label: "1er patient ajouté" },
  { key: "programme", label: "1er programme donné" },
];

export type PatientActivity = {
  id: string;
  instructorId: string;
  instructorName: string;
  /** Pseudonyme : l'admin n'a pas besoin du nom du patient pour suivre
   *  l'usage ni pour le relancer (minimisation des données de santé). */
  code: string;
  createdAt: string;
  via: "lien" | "invitation";
  stage: PatientStage;
  level: ActivityLevel;
  subscription: string | null;
  lastSessionAt: string | null;
  sessions7d: number;
  sessions30d: number;
  sessionsTotal: number;
  lastSeenAt: string | null;
  notifiable: boolean;
  platforms: string[];
  isTest: boolean;
};

export type KineActivity = {
  id: string;
  name: string;
  email: string;
  status: string;
  createdAt: string;
  stage: KineStage;
  level: ActivityLevel;
  patients: number;
  activePatients: number;
  sessions7d: number;
  lastProgrammeAt: string | null;
  lastSeenAt: string | null;
  notifiable: boolean;
  platforms: string[];
  isTest: boolean;
};

const DAY = 86_400_000;

function iso(v: string | Date | null | undefined): string | null {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function daysSince(v: string | null, now: Date): number | null {
  if (!v) return null;
  return Math.floor((now.getTime() - new Date(v).getTime()) / DAY);
}

/** La plus récente de deux dates (null si aucune). */
export function latest(a: string | null, b: string | null): string | null {
  if (!a) return b;
  if (!b) return a;
  return a > b ? a : b;
}

export function patientLevel(lastSessionAt: string | null, now: Date): ActivityLevel {
  const d = daysSince(lastSessionAt, now);
  if (d === null) return "pas_commence";
  if (d <= 7) return "actif";
  if (d <= 14) return "ralentit";
  return "inactif";
}

export function kineLevel(lastSeenAt: string | null, now: Date): ActivityLevel {
  const d = daysSince(lastSeenAt, now);
  if (d === null) return "inactif";
  if (d <= 7) return "actif";
  if (d <= 30) return "ralentit";
  return "inactif";
}

const PAYING = new Set(["trialing", "active", "past_due"]);

export function patientStage(r: PatientActivityDb): PatientStage {
  if (r.sessions_total > 0) return "seance";
  if (r.has_programme) return "programme";
  if (r.subscription_status && PAYING.has(r.subscription_status)) return "carte";
  if (r.terms_accepted_at) return "cgu";
  return "ajoute";
}

export function buildActivity(
  patientsDb: PatientActivityDb[],
  kinesDb: InstructorActivityDb[],
  seenByEmail: Map<string, SeenInfo>,
  now: Date = new Date(),
): { patients: PatientActivity[]; kines: KineActivity[] } {
  const seen = (email: string | null) => {
    const s = email ? seenByEmail.get(email.trim().toLowerCase()) : undefined;
    return latest(s?.lastActiveAt ?? null, s?.lastSignInAt ?? null);
  };
  const kineName = new Map(kinesDb.map((k) => [k.instructor_id, k.full_name?.trim() || k.email || "Kiné"]));
  const perKine = new Map<string, number>();

  const patients: PatientActivity[] = patientsDb.map((r) => {
    const n = (perKine.get(r.instructor_id) ?? 0) + 1;
    perKine.set(r.instructor_id, n);
    const last = iso(r.last_session_at);
    const platforms = r.push_platforms ?? [];
    return {
      id: r.patient_id,
      instructorId: r.instructor_id,
      instructorName: kineName.get(r.instructor_id) ?? "Kiné",
      code: `P-${r.patient_id.slice(0, 4).toUpperCase()}`,
      createdAt: iso(r.created_at) ?? new Date(0).toISOString(),
      via: r.joined_via_link ? "lien" : "invitation",
      stage: patientStage(r),
      level: patientLevel(last, now),
      subscription: r.subscription_status,
      lastSessionAt: last,
      sessions7d: r.sessions_7d,
      sessions30d: r.sessions_30d,
      sessionsTotal: r.sessions_total,
      lastSeenAt: seen(r.email),
      notifiable: platforms.length > 0,
      platforms,
      isTest: r.is_test,
    };
  });

  const kines: KineActivity[] = kinesDb.map((k) => {
    const mine = patients.filter((p) => p.instructorId === k.instructor_id);
    const lastProgrammeAt = iso(k.last_programme_at);
    const platforms = k.push_platforms ?? [];
    const stage: KineStage = lastProgrammeAt
      ? "programme"
      : k.first_patient_at
        ? "patient"
        : k.status === "approved" || k.status === "suspended"
          ? "valide"
          : "inscrit";
    const lastSeenAt = seen(k.email);
    return {
      id: k.instructor_id,
      name: k.full_name?.trim() || "—",
      email: k.email ?? "",
      status: k.status,
      createdAt: iso(k.created_at) ?? new Date(0).toISOString(),
      stage,
      // Un kiné qui a donné un programme récemment est actif même si Clerk
      // ne l'a pas vu (appli mobile restée connectée).
      level: kineLevel(latest(lastSeenAt, lastProgrammeAt), now),
      patients: mine.length,
      activePatients: mine.filter((p) => p.level === "actif").length,
      sessions7d: mine.reduce((s, p) => s + p.sessions7d, 0),
      lastProgrammeAt,
      lastSeenAt,
      notifiable: platforms.length > 0,
      platforms,
      isTest: k.is_test,
    };
  });

  return { patients, kines };
}

/** Combien de personnes ont atteint chaque étape (une étape atteinte compte
 *  aussi pour toutes les précédentes). */
export function funnel<S extends string>(stages: { key: S; label: string }[], reached: S[]): { key: S; label: string; count: number }[] {
  const index = new Map(stages.map((s, i) => [s.key, i]));
  return stages.map((s, i) => ({
    ...s,
    count: reached.filter((r) => (index.get(r) ?? -1) >= i).length,
  }));
}

/** Patients à relancer : un programme en main, mais pas de séance depuis
 *  plus de 7 jours (ou jamais), et une notification possible. */
export function patientNeedsNudge(p: PatientActivity): boolean {
  return p.notifiable && (p.stage === "programme" || p.stage === "seance") && p.level !== "actif";
}

/** Kinés à relancer : compte validé, pas venus depuis plus de 7 jours, et une
 *  notification possible. */
export function kineNeedsNudge(k: KineActivity): boolean {
  return k.notifiable && k.status === "approved" && k.level !== "actif";
}
