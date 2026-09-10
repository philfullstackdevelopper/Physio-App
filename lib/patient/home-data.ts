import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isProfileComplete } from "@/lib/exercise/patientProfile";
import { hasActiveTier } from "@/lib/billing/access";
import { type InjuryStage } from "@/lib/exercise/prescription";
import { computeStreak } from "@/lib/exercise/streak";
import { stageWithFeedback, careWeek, type Rating } from "@/lib/exercise/stageProgress";
import { resolveWorkoutForWeek } from "@/lib/exercise/activeRecommendation";
import { thisWeekStartDateKey } from "@/lib/patient/weeks";
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
  const [{ data: profile }, { data: patient }, { data: feedbackRows }, { data: logs }, { data: sub }] = await Promise.all([
    supabase
      .from("patient_profiles")
      .select("condition_id, injury_stage, date_of_birth, height_cm, weight_kg, activity_level, updated_at")
      .eq("id", userId)
      .maybeSingle(),
    supabase.from("patients").select("full_name, condition_id, trial_ends_at").eq("id", userId).maybeSingle(),
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
    supabase.from("subscriptions").select("plan, status, current_period_end").eq("user_id", userId).maybeSingle(),
  ]);
  if (!isProfileComplete(profile)) redirect("/patient/onboarding");
  // Then the offer (Philippe, 2026-09-10: onboarding → offre → app). Same
  // pure rule as app/patient/abonnement/page.tsx and the séance page, so the
  // three surfaces can never disagree on who is let in.
  if (
    !hasActiveTier({
      trialEndsAt: (patient?.trial_ends_at as string | null) ?? null,
      subPlan: (sub?.plan as string | null) ?? null,
      subStatus: (sub?.status as string | null) ?? null,
      subCurrentPeriodEnd: (sub?.current_period_end as string | null) ?? null,
    })
  ) {
    redirect("/patient/abonnement");
  }

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
      .select(`week_start_date, workouts ( ${WORKOUT_FIELDS} )`)
      .eq("patient_id", userId),
  ]);

  const recommended = (recRows ?? [])
    .map((r) => ({ weekStartDate: r.week_start_date as string, workout: r.workouts as unknown as Workout | null }))
    .filter((r): r is { weekStartDate: string; workout: Workout } => r.workout != null);

  const weekStart = startOfWeekISO();
  const weekCounts: Record<string, number> = {};
  for (const l of logs ?? []) {
    if ((l.completed_at as string) >= weekStart) {
      const id = l.workout_id as string;
      weekCounts[id] = (weekCounts[id] ?? 0) + 1;
    }
  }

  const activeId = resolveWorkoutForWeek(
    recommended.map((r) => ({ workoutId: r.workout.id, weekStartDate: r.weekStartDate })),
    thisWeekStartDateKey(),
  );
  const activeWorkout = recommended.find((r) => r.workout.id === activeId)?.workout ?? null;

  const streak = computeStreak((logs ?? []).map((l) => l.completed_at as string));
  const todayISO = startOfTodayISO();
  const doneToday = activeWorkout
    ? (logs ?? []).some((l) => l.workout_id === activeWorkout.id && (l.completed_at as string) >= todayISO)
    : false;
  const weekCount = activeWorkout ? (weekCounts[activeWorkout.id] ?? 0) : 0;
  // There's no more "rotate to the next recommendation once this one's quota
  // is met" (see lib/exercise/activeRecommendation.ts) — the single active
  // séance stays active either way, so "week complete" is now just "its own
  // target is met", not "nothing left to resolve to".
  const weekTarget = activeWorkout?.times_per_week ?? null;
  const weekComplete = weekTarget !== null && weekTarget > 0 && weekCount >= weekTarget;

  return {
    fullName: (patient?.full_name as string | undefined) ?? null,
    conditionName: (condition?.name as string | undefined) ?? null,
    stage,
    week,
    decision,
    activeWorkout,
    weekComplete,
    weekCount,
    doneToday,
    streak,
  };
}
