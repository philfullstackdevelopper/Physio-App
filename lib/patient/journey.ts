import type { SupabaseClient } from "@supabase/supabase-js";
import { buildWeeks, currentWeekNumber, localDateKey, type WeekInfo } from "@/lib/patient/weeks";
import type { SessionDetail } from "@/components/WeekProgramme";

/**
 * Le parcours du patient semaine par semaine : les semaines depuis la création
 * du compte et, pour chaque jour, les séances réalisées (heure, durée, douleur,
 * difficulté, note). Partagé par l'Accueil (frise, ordinateur) et Mes progrès
 * (frise verticale, téléphone) pour qu'ils lisent exactement les mêmes données.
 */
export async function loadPatientJourney(
  supabase: SupabaseClient,
  patientId: string,
): Promise<{ weeks: WeekInfo[]; dayDetails: Record<string, SessionDetail[]>; currentWeekNumber: number }> {
  const { data: patientRow } = await supabase.from("patients").select("created_at").eq("id", patientId).maybeSingle();
  const weeks = buildWeeks((patientRow?.created_at as string | undefined) ?? new Date().toISOString());
  const rangeStartISO = weeks[0].startISO;
  const rangeEndISO = weeks[weeks.length - 1].endISO;

  const { data: rangeLogs } = await supabase
    .from("workout_logs")
    .select("id, completed_at, workouts ( name, duration_minutes )")
    .eq("patient_id", patientId)
    .gte("completed_at", rangeStartISO)
    .lt("completed_at", rangeEndISO);

  const rangeLogIds = (rangeLogs ?? []).map((l) => l.id as string);
  const { data: rangeFeedback } = rangeLogIds.length
    ? await supabase.from("patient_feedback").select("workout_log_id, pain_score, difficulty, notes").in("workout_log_id", rangeLogIds)
    : { data: [] };
  const feedbackByLogId = new Map((rangeFeedback ?? []).filter((f) => f.workout_log_id).map((f) => [f.workout_log_id as string, f]));

  const dayDetails: Record<string, SessionDetail[]> = {};
  for (const l of rangeLogs ?? []) {
    const completedAt = new Date(l.completed_at as string);
    const key = localDateKey(completedAt);
    const f = feedbackByLogId.get(l.id as string);
    const workout = l.workouts as unknown as { name: string; duration_minutes: number | null } | null;
    (dayDetails[key] ??= []).push({
      logId: l.id as string,
      workoutName: workout?.name ?? null,
      time: completedAt.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" }),
      durationMinutes: workout?.duration_minutes ?? null,
      painScore: (f?.pain_score as number | null) ?? null,
      difficulty: (f?.difficulty as number | null) ?? null,
      notes: (f?.notes as string | null) ?? null,
    });
  }

  return { weeks, dayDetails, currentWeekNumber: currentWeekNumber(weeks) };
}
