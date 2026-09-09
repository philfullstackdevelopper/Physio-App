// =============================================================================
// Une ligne par patient pour le tableau « Mes patients » : phase, dernière
// séance, adhérence, signal. `buildPatientRows` est pur (testé) ;
// `loadPatientRows` fait les requêtes et l'appelle.
// =============================================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import { STAGE_LABELS, STAGE_SHORT, type InjuryStage } from "../exercise/prescription.ts";
import { assessSignals, type ProgressSignals } from "../exercise/stageProgress.ts";
import { computeAdherence, adherenceLabel, adherenceTone, type Adherence } from "../exercise/adherence.ts";
import { computeSignal, type Signal } from "./patientSignal.ts";
import { relativeDay } from "../format/relativeDay.ts";
import { initials } from "../format/initials.ts";

export interface PatientRowsInput {
  now?: Date;
  patients: { id: string; full_name: string | null; condition_id: string | null; created_at: string }[];
  profiles: { id: string; injury_stage: string | null }[];
  conditions: { id: string; name: string }[];
  logs: { patient_id: string; completed_at: string }[];
  /** 14 derniers jours. */
  feedback: { patient_id: string; pain_score: number | null; difficulty: number | null; created_at: string }[];
  recs: { patient_id: string; workout_id: string; week_start_date: string; times_per_week: number | null }[];
}

export interface PatientRow {
  id: string;
  name: string;
  initials: string;
  conditionId: string | null;
  conditionName: string | null;
  stage: InjuryStage | null;
  stageShort: string | null;
  stageLabel: string | null;
  lastSessionAt: string | null;
  lastSessionLabel: string;
  adherence: Adherence;
  adherenceLabel: "Bonne" | "Moyenne" | "Faible" | null;
  adherenceTone: "ok" | "warn" | "danger" | "muted";
  signal: Signal;
}

const SIGNAL_RANK: Record<Signal["kind"], number> = { pain: 0, inactive: 1, ok: 2 };

export function buildPatientRows({ now = new Date(), patients, profiles, conditions, logs, feedback, recs }: PatientRowsInput): PatientRow[] {
  const conditionName = new Map(conditions.map((c) => [c.id, c.name]));
  const stageOf = new Map(profiles.map((p) => [p.id, (p.injury_stage as InjuryStage | null) ?? null]));

  const logsBy = new Map<string, string[]>();
  for (const l of logs) (logsBy.get(l.patient_id) ?? logsBy.set(l.patient_id, []).get(l.patient_id)!).push(l.completed_at);

  const recsBy = new Map<string, { workoutId: string; weekStartDate: string; timesPerWeek: number | null }[]>();
  for (const r of recs)
    (recsBy.get(r.patient_id) ?? recsBy.set(r.patient_id, []).get(r.patient_id)!).push({
      workoutId: r.workout_id,
      weekStartDate: r.week_start_date,
      timesPerWeek: r.times_per_week,
    });

  const signalsBy = new Map<string, ProgressSignals & { lastPain: number | null; lastPainAt: string }>();
  for (const f of feedback) {
    const b = signalsBy.get(f.patient_id) ?? signalsBy.set(f.patient_id, { painScores: [], difficulties: [], lastPain: null, lastPainAt: "" }).get(f.patient_id)!;
    if (f.pain_score != null) {
      b.painScores.push({ value: f.pain_score, at: f.created_at });
      if (f.created_at > b.lastPainAt) { b.lastPain = f.pain_score; b.lastPainAt = f.created_at; }
    }
    if (f.difficulty != null) b.difficulties.push({ value: f.difficulty, at: f.created_at });
  }

  const rows = patients.map<PatientRow>((p) => {
    const completed = logsBy.get(p.id) ?? [];
    const lastSessionAt = completed.length ? completed.reduce((a, b) => (a > b ? a : b)) : null;
    const stage = stageOf.get(p.id) ?? null;
    const sig = signalsBy.get(p.id) ?? { painScores: [], difficulties: [], lastPain: null, lastPainAt: "" };
    const assessment = assessSignals({ painScores: sig.painScores, difficulties: sig.difficulties });
    const adherence = computeAdherence({ completedAt: completed, assignments: recsBy.get(p.id) ?? [], now });
    return {
      id: p.id,
      name: p.full_name ?? "Patient",
      initials: initials(p.full_name),
      conditionId: p.condition_id,
      conditionName: p.condition_id ? (conditionName.get(p.condition_id) ?? null) : null,
      stage,
      stageShort: stage ? STAGE_SHORT[stage] : null,
      stageLabel: stage ? STAGE_LABELS[stage] : null,
      lastSessionAt,
      lastSessionLabel: relativeDay(lastSessionAt, now),
      adherence,
      adherenceLabel: adherenceLabel(adherence.pct),
      adherenceTone: adherenceTone(adherence.pct),
      signal: computeSignal({
        concerning: assessment.concerning,
        severe: assessment.severe,
        lastPain: sig.lastPain,
        lastSessionAt,
        createdAt: p.created_at,
        now,
      }),
    };
  });

  return rows.sort(
    (a, b) =>
      SIGNAL_RANK[a.signal.kind] - SIGNAL_RANK[b.signal.kind] ||
      Number(b.signal.severe) - Number(a.signal.severe) ||
      a.name.localeCompare(b.name, "fr"),
  );
}

/** Toutes les requêtes en parallèle ; RLS limite chaque table aux patients du kiné connecté. */
export async function loadPatientRows(supabase: SupabaseClient, now: Date = new Date()): Promise<PatientRow[]> {
  const since14 = new Date(now.getTime() - 14 * 86_400_000).toISOString();
  const [{ data: patients }, { data: profiles }, { data: conditions }, { data: logs }, { data: feedback }, { data: recs }] =
    await Promise.all([
      supabase.from("patients").select("id, full_name, condition_id, created_at"),
      supabase.from("patient_profiles").select("id, injury_stage"),
      supabase.from("conditions").select("id, name"),
      supabase.from("workout_logs").select("patient_id, completed_at"),
      supabase.from("patient_feedback").select("patient_id, pain_score, difficulty, created_at").gte("created_at", since14),
      supabase.from("patient_recommended_workouts").select("patient_id, workout_id, week_start_date, workouts ( times_per_week )"),
    ]);

  return buildPatientRows({
    now,
    patients: (patients ?? []) as PatientRowsInput["patients"],
    profiles: (profiles ?? []) as PatientRowsInput["profiles"],
    conditions: (conditions ?? []) as PatientRowsInput["conditions"],
    logs: (logs ?? []) as PatientRowsInput["logs"],
    feedback: (feedback ?? []) as PatientRowsInput["feedback"],
    recs: (recs ?? []).map((r) => ({
      patient_id: r.patient_id as string,
      workout_id: r.workout_id as string,
      week_start_date: r.week_start_date as string,
      times_per_week: ((r.workouts as unknown as { times_per_week: number | null } | null)?.times_per_week ?? null),
    })),
  });
}
