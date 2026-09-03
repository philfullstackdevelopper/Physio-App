import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isProfileComplete } from "@/lib/exercise/patientProfile";
import { type InjuryStage } from "@/lib/exercise/prescription";
import { computeStreak } from "@/lib/exercise/streak";
import { stageWithFeedback, careWeek, type Rating } from "@/lib/exercise/stageProgress";
import { pickActiveWorkout } from "@/lib/exercise/activeRecommendation";
import { startOfTodayISO, startOfWeekISO, daysAgoISO } from "@/lib/week";

export type Workout = {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number | null;
  times_per_week: number | null;
  workout_exercises: { exercises: { name: string } | null }[];
};

const WORKOUT_FIELDS =
  "id, name, description, duration_minutes, times_per_week, workout_exercises ( exercises ( name ) )";

export interface PatientHome {
  fullName: string | null;
  conditionName: string | null;
  stage: InjuryStage;
  week: number;
  decision: ReturnType<typeof stageWithFeedback>;
  /** The one workout the patient should do right now — null if the kiné
   *  hasn't recommended anything, or every recommended target is already
   *  met this week. */
  activeWorkout: Workout | null;
  /** True once every recommended workout's weekly target is met — distinct
   *  from "no recommendations at all" (activeWorkout is null either way). */
  weekComplete: boolean;
  /** Times the active workout was completed this week. */
  weekCount: number;
  /** Active workout completed today. */
  doneToday: boolean;
  streak: number;
}

/** Shared load for the patient home surfaces (dashboard + séance du jour):
 *  profile -> stage -> the kiné's ordered recommendations -> which one is
 *  active -> streak, in one place so the surfaces can never disagree.
 *  Redirects to onboarding if the profile isn't complete yet. */
export async function loadPatientHome(supabase: SupabaseClient, userId: string): Promise<PatientHome> {
  const since = daysAgoISO(14);
  const [{ data: profile }, { data: patient }, { data: feedbackRows }, { data: logs }] = await Promise.all([
    supabase
      .from("patient_profiles")
      .select("condition_id, injury_stage, date_of_birth, height_cm, weight_kg, activity_level, updated_at")
      .eq("id", userId)
      .maybeSingle(),
    supabase.from("patients").select("full_name, condition_id").eq("id", userId).maybeSingle(),
    // The only feedback kept product-wide: one post-session pain/difficulty
    // rating (patient_feedback). Feeds the stage brake below.
    supabase
      .from("patient_feedback")
      .select("pain_score, difficulty, created_at")
      .eq("patient_id", userId)
      .gte("created_at", since),
    supabase
      .from("workout_logs")
      .select("completed_at, workout_id")
      .eq("patient_id", userId)
      .order("completed_at", { ascending: false })
      .limit(400),
  ]);
  if (!isProfileComplete(profile)) redirect("/patient/onboarding");

  // What the patient SEES is driven by the condition ASSIGNED BY THE PRACTITIONER
  // (patients.condition_id). The patient's self-declaration is intake only.
  const assignedConditionId = (patient?.condition_id as string | null) ?? null;

  const declaredStage = profile!.injury_stage as InjuryStage;
  const rated = (rows: Record<string, unknown>[], field: string): Rating[] =>
    rows
      .filter((r) => r[field] != null)
      .map((r) => ({ value: r[field] as number, at: r.created_at as string }));
  const decision = stageWithFeedback(declaredStage, profile!.updated_at as string, {
    painScores: rated(feedbackRows ?? [], "pain_score"),
    difficulties: rated(feedbackRows ?? [], "difficulty"),
  });
  const stage = decision.stage;
  const week = careWeek(declaredStage, profile!.updated_at as string);

  const [{ data: condition }, { data: recRows }] = await Promise.all([
    assignedConditionId
      ? supabase.from("conditions").select("name").eq("id", assignedConditionId).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("patient_recommended_workouts")
      .select(`priority, workouts ( ${WORKOUT_FIELDS} )`)
      .eq("patient_id", userId),
  ]);

  const recommended = (recRows ?? [])
    .map((r) => ({ priority: r.priority as number, workout: r.workouts as unknown as Workout | null }))
    .filter((r): r is { priority: number; workout: Workout } => r.workout != null);

  const weekStart = startOfWeekISO();
  const weekCounts: Record<string, number> = {};
  for (const l of logs ?? []) {
    if ((l.completed_at as string) >= weekStart) {
      const id = l.workout_id as string;
      weekCounts[id] = (weekCounts[id] ?? 0) + 1;
    }
  }

  const activeId = pickActiveWorkout(
    recommended.map((r) => ({ workoutId: r.workout.id, priority: r.priority, timesPerWeek: r.workout.times_per_week })),
    weekCounts,
  );
  const activeWorkout = recommended.find((r) => r.workout.id === activeId)?.workout ?? null;

  const streak = computeStreak((logs ?? []).map((l) => l.completed_at as string));
  const todayISO = startOfTodayISO();
  const doneToday = activeWorkout
    ? (logs ?? []).some((l) => l.workout_id === activeWorkout.id && (l.completed_at as string) >= todayISO)
    : false;

  return {
    fullName: (patient?.full_name as string | undefined) ?? null,
    conditionName: (condition?.name as string | undefined) ?? null,
    stage,
    week,
    decision,
    activeWorkout,
    weekComplete: recommended.length > 0 && activeId === null,
    weekCount: activeWorkout ? (weekCounts[activeWorkout.id] ?? 0) : 0,
    doneToday,
    streak,
  };
}
