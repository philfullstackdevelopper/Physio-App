import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolveWorkoutForWeek } from "@/lib/exercise/activeRecommendation";
import { buildWeeks, currentWeekNumber, localDateKey, thisWeekStartDateKey } from "@/lib/patient/weeks";
import { computeAdherence, adherenceLabel, adherenceTone } from "@/lib/exercise/adherence";
import { buildPainSeries } from "@/lib/dashboard/painHistory";
import { programmeWarning } from "@/lib/dashboard/programmeWarning";
import { relativeDay } from "@/lib/format/relativeDay";
import { initials } from "@/lib/format/initials";
import { STAGE_LABELS, type InjuryStage } from "@/lib/exercise/prescription";
import { ageFromDob } from "@/lib/exercise/patientProfile";
import { EQUIPMENT_LABELS, type EquipmentId } from "@/lib/exercise/equipment";
import { paymentEligibleForDeletion } from "@/lib/patient/paymentStatus";
import { type AddableWorkout } from "@/components/AdjustWorkoutModal";
import KineWeekProgramme, { type KineWorkoutSummary } from "@/components/KineWeekProgramme";
import PatientActionsMenu from "@/components/PatientActionsMenu";
import ConditionSelect from "@/components/ConditionSelect";
import PatientDetailView from "@/components/PatientDetailView";
import type { SessionDetail } from "@/components/WeekProgramme";
import {
  assignCondition,
  addRecommendedWorkout,
  removeRecommendedWorkout,
  adjustPatientWorkout,
  markPaymentLapsed,
  clearPaymentLapsed,
  deletePatient,
} from "./actions";
import { getPatientThread, sendPatientMessage } from "../actions";
import { requireApprovedInstructor } from "@/lib/dashboard/requireApprovedInstructor";

type WorkoutExercise = {
  position: number;
  exercises: { id: string; name: string; exercise_body_parts: { body_part_id: string }[] } | null;
};
type Workout = {
  id: string; name: string; description: string | null; duration_minutes: number | null; times_per_week: number | null;
  stage: string | null; created_by: string | null; condition_id: string | null; patient_id: string | null;
  workout_exercises: WorkoutExercise[];
};

const ACTIVITY_LABELS: Record<string, string> = { sedentary: "Sédentaire", moderate: "Modérée", active: "Active" };
export default async function PatientDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; adjusted?: string }> }) {
  const { id } = await params;
  const { error, adjusted } = await searchParams;
  const supabase = await createClient();
  // Validation du compte vérifiée ICI aussi (audit du 2026-10-08) : le
  // layout ne se ré-exécute pas à chaque navigation (doc Next.js 16).
  const { user } = await requireApprovedInstructor(supabase);
  const now = new Date();

  const { data: patient } = await supabase.from("patients").select("id, full_name, email, condition_id, created_at, payment_lapsed_at").eq("id", id).maybeSingle();
  if (!patient) redirect("/dashboard/patients");
  const firstName = ((patient.full_name as string | null) ?? "").split(" ")[0] || "ce patient";

  const WORKOUT_FIELDS =
    "id, name, description, duration_minutes, times_per_week, stage, created_by, condition_id, patient_id, workout_exercises ( position, exercises ( id, name, exercise_body_parts ( body_part_id ) ) )";
  const since30 = new Date(now.getTime() - 30 * 86_400_000).toISOString();

  // Tout l'historique du patient (séances + ressentis) est chargé une fois :
  // la frise (KineWeekProgramme) navigue entre les semaines côté client sans
  // refaire de requête — plus de filtre par mois ni de `?month=` dans l'URL.
  const [
    { data: conditions }, { data: profile }, { data: allLogs }, { data: recentFeedback },
    { data: allFeedback }, { data: ownWorkouts }, { data: platformWorkouts }, { data: recRows }, { data: allExercises }, { data: hiddenRows },
    { data: bodyParts },
    { count: unreadCount },
  ] = await Promise.all([
    supabase.from("conditions").select("id, name").order("name"),
    supabase.from("patient_profiles").select("declared_body_part_ids, injury_stage, rehab_progress, history, date_of_birth, height_cm, weight_kg, activity_level, equipment, updated_at").eq("id", id).maybeSingle(),
    supabase.from("workout_logs").select("id, completed_at, workout_id, workouts ( name, duration_minutes )").eq("patient_id", id),
    supabase.from("patient_feedback").select("pain_score, created_at").eq("patient_id", id).gte("created_at", since30),
    supabase.from("patient_feedback").select("workout_log_id, pain_score, difficulty, notes").eq("patient_id", id),
    supabase.from("workouts").select(WORKOUT_FIELDS).eq("created_by", user.id),
    supabase.from("workouts").select(WORKOUT_FIELDS).is("created_by", null),
    supabase.from("patient_recommended_workouts").select("id, week_start_date, week_count, workout_id, created_at").eq("patient_id", id).order("week_start_date", { ascending: false }),
    supabase.from("exercises").select("id, name, exercise_body_parts(body_part_id)").order("name"),
    supabase.from("instructor_hidden_exercises").select("exercise_id").eq("instructor_id", user.id),
    supabase.from("body_parts").select("id, slug, label, position").order("position"),
    supabase.from("patient_messages").select("id", { count: "exact", head: true }).eq("patient_id", id).eq("sender", "patient").is("read_by_instructor_at", null),
  ]);

  const conditionName = (cid: string | null) => conditions?.find((c) => c.id === cid)?.name;
  const stage = (profile?.injury_stage as InjuryStage | null) ?? null;

  // Séances : les miennes (hors copies d'autres patients), la plateforme, et les copies de CE patient.
  const own = (ownWorkouts ?? []) as unknown as Workout[];
  const pool = [...own.filter((w) => w.patient_id === null), ...((platformWorkouts ?? []) as unknown as Workout[])];
  const copies = own.filter((w) => w.patient_id === id);
  const workoutById = new Map([...pool, ...copies].map((w) => [w.id, w]));

  // Full history of what's ever been recommended (needed for adherence below,
  // which tracks compliance over time, not just the current séance) — the
  // one currently in effect is resolved separately right after.
  const recommended = (recRows ?? [])
    .map((r) => ({ recId: r.id as string, weekStartDate: r.week_start_date as string, weekCount: (r.week_count as number | null) ?? null, createdAt: r.created_at as string, workout: workoutById.get(r.workout_id as string) }))
    .filter((r): r is { recId: string; weekStartDate: string; weekCount: number | null; createdAt: string; workout: Workout } => r.workout != null);

  const activeWorkoutId = resolveWorkoutForWeek(
    recommended.map((r) => ({ workoutId: r.workout.id, weekStartDate: r.weekStartDate, weekCount: r.weekCount })),
    thisWeekStartDateKey(),
  );
  const activeRec = recommended.find((r) => r.workout.id === activeWorkoutId) ?? null;
  const active = activeRec?.workout ?? null;
  const activeExercises = active
    ? [...active.workout_exercises]
        .sort((a, b) => a.position - b.position)
        .map((we) => we.exercises)
        .filter((e): e is NonNullable<typeof e> => !!e)
        .map((e) => ({ id: e.id, name: e.name }))
    : [];

  // Stats.
  const completed = (allLogs ?? []).map((l) => l.completed_at as string);
  const lastLog = (allLogs ?? []).reduce<{ completed_at: string; workout_id: string } | null>((best, l) => (!best || (l.completed_at as string) > best.completed_at ? { completed_at: l.completed_at as string, workout_id: l.workout_id as string } : best), null);
  const lastWorkout = lastLog ? workoutById.get(lastLog.workout_id) : undefined;
  const adherence = computeAdherence({
    completedAt: completed,
    assignments: recommended.map((r) => ({ workoutId: r.workout.id, weekStartDate: r.weekStartDate, weekCount: r.weekCount, timesPerWeek: r.workout.times_per_week })),
    now,
  });
  const tone = adherenceTone(adherence.pct);
  const pain = buildPainSeries((recentFeedback ?? []) as { pain_score: number | null; created_at: string }[], now);

  // Frise : semaines depuis la création du compte patient, et le détail de
  // chaque jour (séance, heure, douleur, difficulté, notes) indexé par date
  // locale — même structure que côté patient (app/patient/page.tsx).
  const weeks = buildWeeks((patient.created_at as string | null) ?? now.toISOString(), now);
  const feedbackByLogId = new Map((allFeedback ?? []).filter((f) => f.workout_log_id).map((f) => [f.workout_log_id as string, f]));
  const dayDetails: Record<string, SessionDetail[]> = {};
  for (const l of allLogs ?? []) {
    const completedAt = new Date(l.completed_at as string);
    const f = feedbackByLogId.get(l.id as string);
    const w = l.workouts as unknown as { name: string; duration_minutes: number | null } | null;
    (dayDetails[localDateKey(completedAt)] ??= []).push({
      logId: l.id as string,
      workoutName: w?.name ?? null,
      time: completedAt.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
      durationMinutes: w?.duration_minutes ?? null,
      painScore: (f?.pain_score as number | null) ?? null,
      difficulty: (f?.difficulty as number | null) ?? null,
      notes: (f?.notes as string | null) ?? null,
    });
  }
  // La frise résout elle-même la séance effective de chaque semaine à partir
  // de la liste complète des assignations + un résumé de chaque séance.
  const assignments = recommended.map((r) => ({ id: r.recId, workoutId: r.workout.id, weekStartDate: r.weekStartDate, weekCount: r.weekCount }));
  const workoutSummaries: Record<string, KineWorkoutSummary> = {};
  for (const r of recommended) {
    workoutSummaries[r.workout.id] ??= {
      id: r.workout.id,
      name: r.workout.name,
      exercises: [...r.workout.workout_exercises]
        .sort((a, b) => a.position - b.position)
        .map((we) => we.exercises)
        .filter((e): e is NonNullable<typeof e> => !!e)
        .map((e) => ({ id: e.id, name: e.name })),
    };
  }
  const warning = programmeWarning({
    weeks,
    currentWeekNumber: currentWeekNumber(weeks, now),
    assignments,
    exerciseCountByWorkoutId: Object.fromEntries(Object.values(workoutSummaries).map((w) => [w.id, w.exercises.length])),
  });

  // Modale « Ajuster » : exercices ajoutables = tous − masqués − déjà dans la séance.
  // v1 : calculé pour la séance de la SEMAINE COURANTE uniquement. Si le kiné
  // ajuste une autre semaine dont la séance est différente, la liste peut
  // proposer un exercice déjà présent (applyAdjustment l'ignore alors) ou
  // masquer un exercice absent de cette séance-là — acceptable pour l'instant.
  const hiddenIds = new Set((hiddenRows ?? []).map((r) => r.exercise_id as string));
  const inActive = new Set(activeExercises.map((e) => e.id));
  const addableExercises = (allExercises ?? [])
    .filter((e) => !hiddenIds.has(e.id) && !inActive.has(e.id))
    .map((e) => ({
      id: e.id as string,
      name: e.name as string,
      bodyPartIds: (e.exercise_body_parts ?? []).map((t) => t.body_part_id as string),
    }));

  // Modale « Choisir une séance » : tout le pool ; la frise retire elle-même la
  // séance déjà effective pour la semaine sélectionnée (KineWeekProgramme).
  // Pas d'exclusion de l'historique — migration 0047 a explicitement supprimé
  // la contrainte d'unicité (patient_id, workout_id) pour permettre qu'une
  // séance déjà utilisée revienne plus tard.
  // La condition actuelle du patient remonte toujours en tête de liste — c'est
  // dans ce groupe qu'un kiné cherche une alternative neuf fois sur dix.
  const stageOrder = new Map(Object.keys(STAGE_LABELS).map((s, i) => [s, i]));
  const patientConditionName = conditionName(patient.condition_id) ?? null;
  const addableWorkouts: AddableWorkout[] = pool
    .sort((a, b) => {
      const ca = conditionName(a.condition_id) ?? "";
      const cb = conditionName(b.condition_id) ?? "";
      if (ca !== cb) {
        if (ca === patientConditionName) return -1;
        if (cb === patientConditionName) return 1;
        return ca.localeCompare(cb, "fr");
      }
      return (stageOrder.get(a.stage ?? "") ?? 99) - (stageOrder.get(b.stage ?? "") ?? 99);
    })
    .map((w) => ({
      id: w.id,
      name: w.name,
      description: w.description,
      durationMinutes: w.duration_minutes,
      timesPerWeek: w.times_per_week,
      stageLabel: w.stage ? STAGE_LABELS[w.stage as InjuryStage] : null,
      conditionName: conditionName(w.condition_id) ?? null,
      editHref: w.created_by === user.id ? `/dashboard/seances/${w.id}` : null,
      exerciseNames: [...w.workout_exercises].sort((a, b) => a.position - b.position).map((we) => we.exercises?.name).filter((n): n is string => !!n),
      // Union of every one of this séance's exercises' tagged body parts —
      // lets the picker filter a séance by area without forcing it into a
      // single category (see lib/exercise/category.ts's primaryBodyPart,
      // which does the opposite for a single exercise).
      bodyPartIds: [...new Set(w.workout_exercises.flatMap((we) => (we.exercises?.exercise_body_parts ?? []).map((t) => t.body_part_id)))],
    }));

  const profileUpdated = profile?.updated_at ? new Date(profile.updated_at as string).toLocaleDateString("fr-FR") : null;

  const lastWorkoutExercises = lastWorkout?.workout_exercises.length ?? 0;

  return (
    <PatientDetailView
      name={(patient.full_name as string | null) ?? "Patient"}
      warning={warning}
      paymentLapsed={!!patient.payment_lapsed_at}
      error={error}
      adjusted={adjusted === "1"}
      stats={{
        painLatest: pain.latest,
        painPrevious: pain.previous,
        adherencePct: adherence.pct,
        adherenceTone: tone,
        adherenceLabel: adherenceLabel(adherence.pct),
        lastSessionLabel: relativeDay(lastLog?.completed_at ?? null, now),
        lastSessionDetail: lastWorkout
          ? `${lastWorkout.duration_minutes ?? "—"} min · ${lastWorkoutExercises} exercice${lastWorkoutExercises > 1 ? "s" : ""}`
          : null,
      }}
      actionsMenu={
      <PatientActionsMenu
        patientId={patient.id}
        patientName={firstName}
        paymentLapsedAt={patient.payment_lapsed_at as string | null}
        paymentEligibleForDeletion={paymentEligibleForDeletion(patient.payment_lapsed_at as string | null, now)}
        redirectTo={`/dashboard/patients/${patient.id}`}
        markPaymentLapsed={markPaymentLapsed}
        clearPaymentLapsed={clearPaymentLapsed}
        deletePatient={deletePatient}
        messages={{
          patient: { id: patient.id, name: (patient.full_name as string | null) ?? "Patient", initials: initials(patient.full_name as string | null) },
          unreadCount: unreadCount ?? 0,
          getThread: getPatientThread,
          sendMessage: sendPatientMessage,
        }}
        conditionMissing={!patient.condition_id}
        conditionSlot={
          <form action={assignCondition} className="flex flex-wrap items-center gap-2">
            <input type="hidden" name="patient_id" value={patient.id} />
            <ConditionSelect currentConditionId={(patient.condition_id as string | null) ?? null} conditions={conditions ?? []} />
          </form>
        }
        profileSlot={
      profile ? (
        <div className="mt-2 space-y-1">
          <p className="text-sm text-ink">
            {[
              ageFromDob(profile.date_of_birth as string | null) != null ? `${ageFromDob(profile.date_of_birth as string | null)} ans` : null,
              profile.height_cm != null ? `${profile.height_cm} cm` : null,
              profile.weight_kg != null ? `${profile.weight_kg} kg` : null,
              profile.activity_level ? `activité ${ACTIVITY_LABELS[profile.activity_level as string] ?? profile.activity_level}` : null,
              stage ? STAGE_LABELS[stage] : null,
            ].filter(Boolean).join(" · ")}
          </p>
          {((profile.declared_body_part_ids as string[] | null) ?? []).length > 0 && (
            <div className="mt-1.5">
              <span className="text-sm text-muted">Le patient signale vouloir travailler : </span>
              <span className="inline-flex flex-wrap gap-1 align-middle">
                {(profile.declared_body_part_ids as string[]).map((bpId) => (
                  <span key={bpId} className="rounded-full bg-app-bg px-2 py-0.5 text-xs font-medium text-ink">
                    {bodyParts?.find((bp) => bp.id === bpId)?.label ?? bpId}
                  </span>
                ))}
              </span>
            </div>
          )}
          {profile.rehab_progress && <p className="text-sm text-muted"><span>Avancement{profileUpdated ? ` (mis à jour le ${profileUpdated})` : ""} :</span> {profile.rehab_progress as string}</p>}
          {profile.history && <p className="text-sm text-muted"><span>Historique :</span> {profile.history as string}</p>}
          {((profile.equipment as EquipmentId[] | null) ?? []).length > 0 && (
            <div className="mt-1.5">
              <span className="text-sm text-muted">Équipement disponible : </span>
              <span className="inline-flex flex-wrap gap-1 align-middle">
                {(profile.equipment as EquipmentId[]).map((eq) => (
                  <span key={eq} className="rounded-full bg-app-bg px-2 py-0.5 text-xs font-medium text-ink">
                    {EQUIPMENT_LABELS[eq] ?? eq}
                  </span>
                ))}
              </span>
            </div>
          )}
        </div>
      ) : (
        <p className="mt-2 text-sm text-muted">Le patient n&apos;a pas encore complété son admission.</p>
      )
        }
      />
      }
      programme={
      <KineWeekProgramme
        weeks={weeks}
        currentWeekNumber={currentWeekNumber(weeks, now)}
        dayDetails={dayDetails}
        assignments={assignments}
        workoutsById={workoutSummaries}
        patientId={patient.id}
        patientFirstName={firstName}
        addableExercises={addableExercises}
        bodyParts={bodyParts ?? []}
        addableWorkouts={addableWorkouts}
        adjustAction={adjustPatientWorkout}
        assignAction={addRecommendedWorkout}
        removeAction={removeRecommendedWorkout}
      />
      }
    />
  );
}
