import HistoriqueView from "./HistoriqueView";
import { getLocale, getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/locales";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import { requirePatientAccess } from "@/lib/patient/requirePatientAccess";
import { buildHistoryWeeks, type HistoryWorkout } from "@/lib/patient/historyWeeks";

type WorkoutRow = {
  name: string;
  times_per_week: number | null;
  workout_exercises: { position: number | null; exercises: { name: string } | null }[] | null;
} | null;

const WORKOUT_SELECT = "name, times_per_week, workout_exercises ( position, exercises ( name ) )";

function toWorkout(w: WorkoutRow): HistoryWorkout | null {
  if (!w) return null;
  return {
    name: w.name,
    timesPerWeek: w.times_per_week,
    exercises: [...(w.workout_exercises ?? [])]
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
      .map((we) => we.exercises?.name)
      .filter((n): n is string => !!n),
  };
}

export default async function HistoriquePage() {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  // Barrières du patient (CGU, accès payé, consentement) refaites ici : le
  // layout ne se rejoue pas à chaque navigation (audit du 2026-11-10, B4).
  if (!(await requirePatientAccess())) return null;

  const [{ data: logRows }, { data: recRows }] = await Promise.all([
    supabase
      .from("workout_logs")
      .select(`id, completed_at, workouts ( ${WORKOUT_SELECT} )`)
      .eq("patient_id", user.id)
      .order("completed_at", { ascending: false })
      .limit(200),
    supabase
      .from("patient_recommended_workouts")
      .select(`workout_id, week_start_date, week_count, workouts ( ${WORKOUT_SELECT} )`)
      .eq("patient_id", user.id),
  ]);

  const [locale, t, tc] = await Promise.all([getLocale(), getTranslations("patient.history"), getTranslations("patient.common")]);
  const weeks = buildHistoryWeeks({
    locale: locale as Locale,
    labels: { weekOf: (date) => t("weekOf", { date }), session: tc("session") },
    logs: (logRows ?? []).map((l) => ({
      id: l.id as string,
      completedAt: l.completed_at as string,
      workout: toWorkout(l.workouts as unknown as WorkoutRow),
    })),
    assignments: (recRows ?? []).map((r) => ({
      workoutId: r.workout_id as string,
      weekStartDate: r.week_start_date as string,
      weekCount: (r.week_count as number | null) ?? null,
      workout: toWorkout(r.workouts as unknown as WorkoutRow),
    })),
  });

  return <HistoriqueView weeks={weeks} />;
}
