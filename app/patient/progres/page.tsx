import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import { computeAdherence, ADHERENCE_WINDOW_DAYS } from "@/lib/exercise/adherence";
import { buildPainSeries } from "@/lib/dashboard/painHistory";
import ProgresView from "./ProgresView";
import { requirePatientAccess } from "@/lib/patient/requirePatientAccess";

export default async function ProgresPage() {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  await requirePatientAccess(supabase, user.id);

  const now = new Date();
  const since30 = new Date(now.getTime() - 30 * 86_400_000).toISOString();
  const since60 = new Date(now.getTime() - 60 * 86_400_000).toISOString();
  const [{ data: recRows }, { data: logs }, { data: feedback30 }, { data: feedback60 }, { data: patient }] = await Promise.all([
    supabase.from("patient_recommended_workouts").select("week_start_date, week_count, workout_id, workouts ( times_per_week )").eq("patient_id", user.id),
    supabase.from("workout_logs").select("completed_at").eq("patient_id", user.id),
    supabase.from("patient_feedback").select("pain_score, created_at").eq("patient_id", user.id).gte("created_at", since30),
    supabase.from("patient_feedback").select("pain_score, created_at").eq("patient_id", user.id).gte("created_at", since60).lt("created_at", since30),
    supabase.from("patients").select("condition_id").eq("id", user.id).maybeSingle(),
  ]);
  const { data: condition } = patient?.condition_id
    ? await supabase.from("conditions").select("name").eq("id", patient.condition_id as string).maybeSingle()
    : { data: null };

  const assignments = (recRows ?? []).map((r) => ({
    workoutId: r.workout_id as string,
    weekStartDate: r.week_start_date as string,
    weekCount: (r.week_count as number | null) ?? null,
    timesPerWeek: (r.workouts as unknown as { times_per_week: number | null } | null)?.times_per_week ?? null,
  }));
  const completedAt = (logs ?? []).map((l) => l.completed_at as string);

  const adherenceNow = computeAdherence({ completedAt, assignments, now });
  const adherencePrev = computeAdherence({ completedAt, assignments, now: new Date(now.getTime() - ADHERENCE_WINDOW_DAYS * 86_400_000) });
  const adherenceDelta = adherenceNow.pct !== null && adherencePrev.pct !== null ? adherenceNow.pct - adherencePrev.pct : null;

  const pain = buildPainSeries((feedback30 ?? []) as { pain_score: number | null; created_at: string }[]);
  const avg = (rows: { pain_score: number | null }[]) => {
    const vals = rows.map((r) => r.pain_score).filter((v): v is number => v != null);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  };
  const painAvgNow = avg((feedback30 ?? []) as { pain_score: number | null }[]);
  const painAvgPrev = avg((feedback60 ?? []) as { pain_score: number | null }[]);
  const painDelta = painAvgNow !== null && painAvgPrev !== null ? painAvgNow - painAvgPrev : null;

  const conditionName = (condition?.name as string | undefined) ?? null;
  // Téléphone : on ne montre que les tuiles qui ont un chiffre, et le
  // graphique seulement s'il y a au moins une douleur notée.
  const phoneTileCount = [adherenceNow.pct, painAvgNow, adherenceDelta].filter((v) => v !== null).length;
  const hasPain = (feedback30 ?? []).some((f) => f.pain_score != null);

  return (
    <ProgresView
      conditionName={conditionName}
      hasPain={hasPain}
      phoneTileCount={phoneTileCount}
      adherenceNow={adherenceNow}
      adherenceDelta={adherenceDelta}
      painAvgNow={painAvgNow}
      painDelta={painDelta}
      pain={pain}
    />
  );
}
