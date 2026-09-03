// =============================================================================
// Tout ce que le tableau de bord affiche, calculé en un endroit testable.
// Les règles (douleur ≥ PAIN_HOLD, inactif ≥ 7 jours, 2 notes minimum) sont
// celles de stageProgress.ts et patientSignal.ts — jamais redéfinies ici.
// =============================================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import { assessSignals, PAIN_HOLD, type ProgressSignals } from "../exercise/stageProgress.ts";
import { computeSignal } from "./patientSignal.ts";
import { relativeDay, daysBetween } from "../format/relativeDay.ts";
import { initials } from "../format/initials.ts";
import { getInstructor } from "./instructor.ts";

export interface DashboardHomeInput {
  now?: Date;
  patients: { id: string; full_name: string | null; created_at: string }[];
  logs: { id: string; patient_id: string; completed_at: string }[];
  /** 14 derniers jours. */
  feedback: { patient_id: string; pain_score: number | null; difficulty: number | null; created_at: string }[];
}

export interface Tile { value: number; delta: number | null }
export interface ToTreatRow { id: string; name: string; initials: string; kind: "pain" | "inactive"; label: string; score: number | null; severe: boolean }
export interface RecentRow { logId: string; patientId: string; name: string; initials: string; whenLabel: string }

export interface DashboardHome {
  firstName: string;
  todayLabel: string;
  sessionsToday: Tile;
  painToday: Tile;
  inactiveCount: number;
  patientCount: number;
  toTreat: ToTreatRow[];
  surveillerCount: number;
  recent: RecentRow[];
  banner: string | null;
}

const TODAY_FMT = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" });

export function buildDashboardHome({ now = new Date(), patients, logs, feedback }: DashboardHomeInput): Omit<DashboardHome, "firstName"> {
  const nameOf = new Map(patients.map((p) => [p.id, p.full_name ?? "Patient"]));
  const isToday = (iso: string) => daysBetween(iso, now) === 0;
  const isYesterday = (iso: string) => daysBetween(iso, now) === 1;

  const sessionsToday = logs.filter((l) => isToday(l.completed_at)).length;
  const sessionsYesterday = logs.filter((l) => isYesterday(l.completed_at)).length;
  const painRows = feedback.filter((f) => f.pain_score != null && f.pain_score >= PAIN_HOLD);
  const painToday = painRows.filter((f) => isToday(f.created_at)).length;
  const painYesterday = painRows.filter((f) => isYesterday(f.created_at)).length;

  // Signal par patient (même fonction que le tableau des patients).
  const lastSession = new Map<string, string>();
  for (const l of logs) if ((lastSession.get(l.patient_id) ?? "") < l.completed_at) lastSession.set(l.patient_id, l.completed_at);
  const signalsBy = new Map<string, ProgressSignals & { lastPain: number | null; lastPainAt: string }>();
  for (const f of feedback) {
    const b = signalsBy.get(f.patient_id) ?? signalsBy.set(f.patient_id, { painScores: [], difficulties: [], lastPain: null, lastPainAt: "" }).get(f.patient_id)!;
    if (f.pain_score != null) {
      b.painScores.push({ value: f.pain_score, at: f.created_at });
      if (f.created_at > b.lastPainAt) { b.lastPain = f.pain_score; b.lastPainAt = f.created_at; }
    }
    if (f.difficulty != null) b.difficulties.push({ value: f.difficulty, at: f.created_at });
  }

  const toTreat: ToTreatRow[] = [];
  for (const p of patients) {
    const sig = signalsBy.get(p.id) ?? { painScores: [], difficulties: [], lastPain: null, lastPainAt: "" };
    const a = assessSignals({ painScores: sig.painScores, difficulties: sig.difficulties });
    const s = computeSignal({ concerning: a.concerning, severe: a.severe, lastPain: sig.lastPain, lastSessionAt: lastSession.get(p.id) ?? null, createdAt: p.created_at, now });
    if (s.kind === "ok") continue;
    toTreat.push({
      id: p.id,
      name: p.full_name ?? "Patient",
      initials: initials(p.full_name),
      kind: s.kind,
      label: s.kind === "pain" ? "Douleur signalée" : s.label,
      score: s.score,
      severe: s.severe,
    });
  }
  toTreat.sort((x, y) => (x.kind === y.kind ? Number(y.severe) - Number(x.severe) || x.name.localeCompare(y.name, "fr") : x.kind === "pain" ? -1 : 1));

  const recent: RecentRow[] = [...logs]
    .sort((a, b) => (a.completed_at < b.completed_at ? 1 : -1))
    .slice(0, 5)
    .map((l) => ({ logId: l.id, patientId: l.patient_id, name: nameOf.get(l.patient_id) ?? "Patient", initials: initials(nameOf.get(l.patient_id)), whenLabel: relativeDay(l.completed_at, now) }));

  const latestPainToday = painRows.filter((f) => isToday(f.created_at)).sort((a, b) => (a.created_at < b.created_at ? 1 : -1))[0];
  const banner = latestPainToday ? `${nameOf.get(latestPainToday.patient_id) ?? "Un patient"} a signalé une douleur pendant sa séance.` : null;

  const todayRaw = TODAY_FMT.format(now);
  return {
    todayLabel: todayRaw.charAt(0).toUpperCase() + todayRaw.slice(1),
    sessionsToday: { value: sessionsToday, delta: sessionsToday - sessionsYesterday },
    painToday: { value: painToday, delta: painToday - painYesterday },
    inactiveCount: toTreat.filter((r) => r.kind === "inactive").length,
    patientCount: patients.length,
    toTreat,
    surveillerCount: toTreat.length,
    recent,
    banner,
  };
}

export async function loadDashboardHome(supabase: SupabaseClient, userId: string, now: Date = new Date()): Promise<DashboardHome> {
  const since14 = new Date(now.getTime() - 14 * 86_400_000).toISOString();
  const [instructor, { data: patients }, { data: logs }, { data: feedback }] = await Promise.all([
    getInstructor(supabase, userId),
    supabase.from("patients").select("id, full_name, created_at"),
    supabase.from("workout_logs").select("id, patient_id, completed_at"),
    supabase.from("patient_feedback").select("patient_id, pain_score, difficulty, created_at").gte("created_at", since14),
  ]);
  const firstName = instructor?.full_name ? instructor.full_name.split(" ")[0] : "";
  return {
    firstName,
    ...buildDashboardHome({
      now,
      patients: (patients ?? []) as DashboardHomeInput["patients"],
      logs: (logs ?? []) as DashboardHomeInput["logs"],
      feedback: (feedback ?? []) as DashboardHomeInput["feedback"],
    }),
  };
}
