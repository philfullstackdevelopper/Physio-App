import type { SupabaseClient } from "@supabase/supabase-js";
import { computeAdherence, ADHERENCE_WINDOW_DAYS } from "@/lib/exercise/adherence";

export interface ProgressStats {
  /** Adhérence sur la fenêtre courante (null = rien d'attendu encore). */
  adherencePct: number | null;
  /** Écart en points vs la fenêtre précédente. */
  adherenceDelta: number | null;
  /** Douleur moyenne des 30 derniers jours (null = aucune douleur notée). */
  painAvg: number | null;
  /** Écart vs les 30 jours d'avant. */
  painDelta: number | null;
}

/**
 * Les deux chiffres des bulles de l'Accueil téléphone (maquette du
 * 2026-10-07) : mêmes calculs que « Mes progrès » (app/patient/progres), pour
 * que les deux pages affichent toujours la même chose.
 */
export async function loadProgressStats(supabase: SupabaseClient, patientId: string): Promise<ProgressStats> {
  const now = new Date();
  const since30 = new Date(now.getTime() - 30 * 86_400_000).toISOString();
  const since60 = new Date(now.getTime() - 60 * 86_400_000).toISOString();
  const [{ data: recRows }, { data: logs }, { data: feedback30 }, { data: feedback60 }] = await Promise.all([
    supabase.from("patient_recommended_workouts").select("week_start_date, week_count, workout_id, workouts ( times_per_week )").eq("patient_id", patientId),
    supabase.from("workout_logs").select("completed_at").eq("patient_id", patientId),
    supabase.from("patient_feedback").select("pain_score").eq("patient_id", patientId).gte("created_at", since30),
    supabase.from("patient_feedback").select("pain_score").eq("patient_id", patientId).gte("created_at", since60).lt("created_at", since30),
  ]);

  const assignments = (recRows ?? []).map((r) => ({
    workoutId: r.workout_id as string,
    weekStartDate: r.week_start_date as string,
    weekCount: (r.week_count as number | null) ?? null,
    timesPerWeek: (r.workouts as unknown as { times_per_week: number | null } | null)?.times_per_week ?? null,
  }));
  const completedAt = (logs ?? []).map((l) => l.completed_at as string);
  const adherenceNow = computeAdherence({ completedAt, assignments, now });
  const adherencePrev = computeAdherence({ completedAt, assignments, now: new Date(now.getTime() - ADHERENCE_WINDOW_DAYS * 86_400_000) });

  const avg = (rows: { pain_score: number | null }[] | null) => {
    const vals = (rows ?? []).map((r) => r.pain_score).filter((v): v is number => v != null);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  };
  const painAvg = avg(feedback30 as { pain_score: number | null }[] | null);
  const painPrev = avg(feedback60 as { pain_score: number | null }[] | null);

  return {
    adherencePct: adherenceNow.pct,
    adherenceDelta: adherenceNow.pct !== null && adherencePrev.pct !== null ? adherenceNow.pct - adherencePrev.pct : null,
    painAvg,
    painDelta: painAvg !== null && painPrev !== null ? painAvg - painPrev : null,
  };
}
