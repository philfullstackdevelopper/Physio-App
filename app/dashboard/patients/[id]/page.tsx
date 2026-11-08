import { redirect } from "next/navigation";
import { isPickableExercise, isPickableSeance } from "@/lib/exercise/filmedExercises";
import { fitsPatient } from "@/lib/exercise/kineExercises";
import { createClient } from "@/lib/supabase/server";
import { resolveWorkoutForWeek } from "@/lib/exercise/activeRecommendation";
import { buildWeeks, currentWeekNumber, localDateKey, thisWeekStartDateKey } from "@/lib/patient/weeks";
import { computeAdherence, adherenceLabel, adherenceTone } from "@/lib/exercise/adherence";
import { buildPainSeries } from "@/lib/dashboard/painHistory";
import { programmeWarning } from "@/lib/dashboard/programmeWarning";
import { summarizeExercises, type ExerciseResultRow } from "@/lib/dashboard/exerciseWatch";
import { buildExerciseGrid, type GridResultRow } from "@/lib/dashboard/exerciseGrid";
import ExerciseGridButton from "@/components/ExerciseGridButton";
import { recommendVariants, type VariantSeance } from "@/lib/exercise/variants";
import { relativeDay } from "@/lib/format/relativeDay";
import { initials } from "@/lib/format/initials";
import { STAGE_LABELS, stageLabel, doseFromRow, goalPartsFor, type InjuryStage } from "@/lib/exercise/prescription";
import { ageFromDob } from "@/lib/exercise/patientProfile";
import { equipmentLabels, type EquipmentId } from "@/lib/exercise/equipment";
import { bodyPartLabel } from "@/lib/exercise/category";
import { getTranslations } from "next-intl/server";
import { getLibI18n } from "@/lib/dashboard/libI18n";
import { intlTag } from "@/lib/i18n/translator";
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
  deletePatient,
} from "./actions";
import { getPatientThread, sendPatientMessage } from "../actions";
import { duplicateSeance } from "../../seances/actions";
import { requireApprovedInstructor } from "@/lib/dashboard/requireApprovedInstructor";

type WorkoutExercise = {
  position: number;
  /** Doses (migration 0080). */
  sets?: number | null;
  reps?: number | null;
  hold_seconds?: number | null;
  exercises: { id: string; name: string; equipment: string[] | null; exercise_body_parts: { body_part_id: string }[] } | null;
};
type Workout = {
  id: string; name: string; description: string | null; duration_minutes: number | null; times_per_week: number | null;
  stage: string | null; created_by: string | null; condition_id: string | null; patient_id: string | null; created_at?: string | null;
  workout_exercises: WorkoutExercise[];
};

const ACTIVITY_LEVELS = ["sedentary", "moderate", "active"];
export default async function PatientDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; adjusted?: string }> }) {
  const { id } = await params;
  const { error, adjusted } = await searchParams;
  const supabase = await createClient();
  // Validation du compte vérifiée ICI aussi (audit du 2026-10-08) : le
  // layout ne se ré-exécute pas à chaque navigation (doc Next.js 16).
  const { user } = await requireApprovedInstructor(supabase);
  const now = new Date();
  const i18n = await getLibI18n();
  const locale = i18n.locale;
  const t = await getTranslations("dashboard.patientDetail");
  const tStage = await getTranslations("exercise.stage");
  const EQUIPMENT_LABELS = equipmentLabels(await getTranslations("exercise.equipment"));
  const tBodyParts = await getTranslations("exercise.bodyParts");

  const { data: patient } = await supabase.from("patients").select("id, full_name, email, condition_id, created_at").eq("id", id).maybeSingle();
  if (!patient) redirect("/dashboard/patients");
  const firstName = ((patient.full_name as string | null) ?? "").split(" ")[0] || t("thisPatient");

  const WORKOUT_FIELDS =
    "id, name, description, duration_minutes, times_per_week, stage, created_by, condition_id, patient_id, created_at, workout_exercises ( position, sets, reps, hold_seconds, exercises ( id, name, equipment, exercise_body_parts ( body_part_id ) ) )";
  const since30 = new Date(now.getTime() - 30 * 86_400_000).toISOString();

  // Tout l'historique du patient (séances + ressentis) est chargé une fois :
  // la frise (KineWeekProgramme) navigue entre les semaines côté client sans
  // refaire de requête — plus de filtre par mois ni de `?month=` dans l'URL.
  const [
    { data: conditions }, { data: profile }, { data: allLogs }, { data: recentFeedback },
    { data: allFeedback }, { data: ownWorkouts }, { data: platformWorkouts }, { data: recRows }, { data: allExercises }, { data: hiddenRows },
    { data: bodyParts },
    { count: unreadCount },
    { data: resultRows },
    { data: seenRow },
  ] = await Promise.all([
    supabase.from("conditions").select("id, name").order("name"),
    supabase.from("patient_profiles").select("declared_body_part_ids, injury_stage, rehab_progress, history, date_of_birth, height_cm, weight_kg, activity_level, equipment, updated_at").eq("id", id).maybeSingle(),
    supabase.from("workout_logs").select("id, completed_at, workout_id, workouts ( name, duration_minutes )").eq("patient_id", id),
    supabase.from("patient_feedback").select("pain_score, created_at").eq("patient_id", id).gte("created_at", since30),
    supabase.from("patient_feedback").select("workout_log_id, pain_score, difficulty, notes").eq("patient_id", id),
    supabase.from("workouts").select(WORKOUT_FIELDS).eq("created_by", user.id),
    supabase.from("workouts").select(WORKOUT_FIELDS).is("created_by", null),
    supabase.from("patient_recommended_workouts").select("id, week_start_date, week_count, workout_id, created_at").eq("patient_id", id).order("week_start_date", { ascending: false }),
    supabase.from("exercises").select("id, name, created_by, equipment, patient_id, search_keywords, instructions, exercise_body_parts(body_part_id)").order("name"),
    supabase.from("instructor_hidden_exercises").select("exercise_id").eq("instructor_id", user.id),
    supabase.from("body_parts").select("id, slug, label, position").order("position"),
    supabase.from("patient_messages").select("id", { count: "exact", head: true }).eq("patient_id", id).eq("sender", "patient").is("read_by_instructor_at", null),
    // Suivi par exercice et retours « vus » (migration 0080) : requêtes à part,
    // une erreur (migration pas encore passée) laisse simplement ces infos vides.
    supabase.from("exercise_results").select("workout_log_id, exercise_name, position, status, pain, difficulty, created_at").eq("patient_id", id),
    supabase.from("patients").select("feedback_seen_at").eq("id", id).maybeSingle(),
  ]);

  const conditionName = (cid: string | null) => conditions?.find((c) => c.id === cid)?.name;
  // Répétitions, maintien ou durée (lu dans la consigne) : seuls les exercices
  // en répétitions reçoivent la dose de la phase quand on les ajoute.
  const doseKindById = new Map((allExercises ?? []).map((e) => [e.id as string, goalPartsFor((e.instructions as string | null) ?? null).kind]));
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
  const pain = buildPainSeries((recentFeedback ?? []) as { pain_score: number | null; created_at: string }[], now, undefined, locale);

  // Frise : semaines depuis la création du compte patient, et le détail de
  // chaque jour (séance, heure, douleur, difficulté, notes) indexé par date
  // locale — même structure que côté patient (app/patient/page.tsx).
  const weeks = buildWeeks((patient.created_at as string | null) ?? now.toISOString(), now, locale);
  const resultsByLogId = new Map<string, NonNullable<SessionDetail["exercises"]>>();
  for (const r of [...(resultRows ?? [])].sort((a, b) => (a.position as number) - (b.position as number))) {
    const list = resultsByLogId.get(r.workout_log_id as string) ?? [];
    list.push({ name: r.exercise_name as string, status: r.status as "done" | "skipped", pain: (r.pain as number | null) ?? null, difficulty: (r.difficulty as number | null) ?? null });
    resultsByLogId.set(r.workout_log_id as string, list);
  }
  const exerciseWatch = summarizeExercises(
    ((resultRows ?? []) as ExerciseResultRow[]).filter((r) => r.created_at >= since30),
    i18n.t,
  )
    .filter((s) => s.watch)
    .map((s) => ({ name: s.name, reason: s.watch! }));
  const feedbackByLogId = new Map((allFeedback ?? []).filter((f) => f.workout_log_id).map((f) => [f.workout_log_id as string, f]));
  const dayDetails: Record<string, SessionDetail[]> = {};
  for (const l of allLogs ?? []) {
    const completedAt = new Date(l.completed_at as string);
    const f = feedbackByLogId.get(l.id as string);
    const w = l.workouts as unknown as { name: string; duration_minutes: number | null } | null;
    (dayDetails[localDateKey(completedAt)] ??= []).push({
      logId: l.id as string,
      workoutName: w?.name ?? null,
      time: completedAt.toLocaleTimeString(intlTag(locale), { hour: "2-digit", minute: "2-digit" }),
      durationMinutes: w?.duration_minutes ?? null,
      painScore: (f?.pain_score as number | null) ?? null,
      difficulty: (f?.difficulty as number | null) ?? null,
      notes: (f?.notes as string | null) ?? null,
      exercises: resultsByLogId.get(l.id as string),
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
      conditionId: r.workout.condition_id ?? null,
      stage: r.workout.stage ?? null,
      isPatientCopy: r.workout.patient_id === id,
      exercises: [...r.workout.workout_exercises]
        .sort((a, b) => a.position - b.position)
        .filter((we) => !!we.exercises)
        .map((we) => ({ id: we.exercises!.id, name: we.exercises!.name, equipment: we.exercises!.equipment ?? [], dose: doseFromRow(we), doseKind: doseKindById.get(we.exercises!.id) })),
    };
  }
  const warning = programmeWarning({
    weeks,
    currentWeekNumber: currentWeekNumber(weeks, now),
    assignments,
    exerciseCountByWorkoutId: Object.fromEntries(Object.values(workoutSummaries).map((w) => [w.id, w.exercises.length])),
  }, i18n.t);

  // Fenêtre de séance : exercices ajoutables = tous − masqués. Ceux déjà dans
  // la séance affichée sont retirés par la fenêtre elle-même (SeanceComposer).
  const hiddenIds = new Set((hiddenRows ?? []).map((r) => r.exercise_id as string));
  const addableExercises = (allExercises ?? [])
    .filter((e) => !hiddenIds.has(e.id) && isPickableExercise(e) && fitsPatient(e, id))
    .map((e) => ({
      id: e.id as string,
      name: e.name as string,
      equipment: (e.equipment as string[] | null) ?? [],
      bodyPartIds: (e.exercise_body_parts ?? []).map((t) => t.body_part_id as string),
      // Noms des exercices plateforme en anglais : la recherche en français passe par ces mots-clés.
      searchKeywords: (e.search_keywords as string[] | null) ?? null,
      doseKind: doseKindById.get(e.id as string),
    }));

  // « Récents » : les exercices des séances que le kiné a composées ou
  // ajustées dernièrement (les plus récentes d'abord), sans doublon.
  const recentIds = [...new Set(
    [...own]
      .sort((a, b) => String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")))
      .flatMap((w) => [...w.workout_exercises].sort((a, b) => a.position - b.position).map((we) => we.exercises?.id))
      .filter((x): x is string => !!x),
  )].slice(0, 24);

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
    .filter((w) => isPickableSeance(w))
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
      conditionId: w.condition_id ?? null,
      stage: w.stage ?? null,
      description: w.description,
      durationMinutes: w.duration_minutes,
      timesPerWeek: w.times_per_week,
      stageLabel: w.stage ? stageLabel(w.stage as InjuryStage, tStage) : null,
      conditionName: conditionName(w.condition_id) ?? null,
      editHref: w.created_by === user.id ? `/dashboard/seances/${w.id}` : null,
      exerciseNames: [...w.workout_exercises].sort((a, b) => a.position - b.position).map((we) => we.exercises?.name).filter((n): n is string => !!n),
      exercises: [...w.workout_exercises]
        .sort((a, b) => a.position - b.position)
        .filter((we) => !!we.exercises)
        .map((we) => ({ id: we.exercises!.id, name: we.exercises!.name, equipment: we.exercises!.equipment ?? [], dose: doseFromRow(we), doseKind: doseKindById.get(we.exercises!.id) })),
      // Union of every one of this séance's exercises' tagged body parts —
      // lets the picker filter a séance by area without forcing it into a
      // single category (see lib/exercise/category.ts's primaryBodyPart,
      // which does the opposite for a single exercise).
      bodyPartIds: [...new Set(w.workout_exercises.flatMap((we) => (we.exercises?.exercise_body_parts ?? []).map((t) => t.body_part_id)))],
    }));

  // Séance → format des « changements recommandés » (lib/exercise/variants.ts).
  const toVariantSeance = (w: Workout): VariantSeance => ({
    conditionId: w.condition_id ?? null,
    stage: w.stage ?? null,
    exercises: [...w.workout_exercises]
      .sort((a, b) => a.position - b.position)
      .filter((we) => !!we.exercises)
      .map((we) => ({
        id: we.exercises!.id,
        name: we.exercises!.name,
        bodyPartIds: (we.exercises!.exercise_body_parts ?? []).map((t) => t.body_part_id),
      })),
  });

  const profileUpdated = profile?.updated_at ? new Date(profile.updated_at as string).toLocaleDateString(intlTag(locale)) : null;

  const lastWorkoutExercises = lastWorkout?.workout_exercises.length ?? 0;


  // Ouvrir la fiche = voir les retours du patient : les séances plus récentes
  // que la dernière visite ne sont plus « non lues » (migration 0080).
  const latestLogAt = (allLogs ?? []).reduce<string | null>((m, l) => (!m || (l.completed_at as string) > m ? (l.completed_at as string) : m), null);
  const seenAt = (seenRow?.feedback_seen_at as string | null | undefined) ?? null;
  if (seenRow && latestLogAt && (!seenAt || latestLogAt > seenAt)) {
    await supabase.from("patients").update({ feedback_seen_at: new Date().toISOString() }).eq("id", id);
  }

  return (
    <PatientDetailView
      name={(patient.full_name as string | null) ?? "Patient"}
      warning={warning}
      exerciseWatch={exerciseWatch}
      exerciseGrid={
        <ExerciseGridButton
          patientName={firstName}
          grid={buildExerciseGrid(
            (resultRows ?? []) as GridResultRow[],
            (allLogs ?? []).map((l) => ({ id: l.id as string, completed_at: l.completed_at as string })),
            undefined,
            i18n.t,
          )}
        />
      }
      error={error}
      adjusted={adjusted === "1"}
      stats={{
        painLatest: pain.latest,
        painPrevious: pain.previous,
        adherencePct: adherence.pct,
        adherenceTone: tone,
        adherenceLabel: adherenceLabel(adherence.pct, await getTranslations("exercise.adherence")),
        lastSessionLabel: relativeDay(lastLog?.completed_at ?? null, now, i18n),
        lastSessionDetail: lastWorkout
          ? t("lastSessionDetail", { minutes: lastWorkout.duration_minutes ?? "—", count: lastWorkoutExercises })
          : null,
      }}
      actionsMenu={
      <PatientActionsMenu
        patientId={patient.id}
        patientName={firstName}
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
              ageFromDob(profile.date_of_birth as string | null) != null ? t("age", { years: ageFromDob(profile.date_of_birth as string | null)! }) : null,
              profile.height_cm != null ? `${profile.height_cm} cm` : null,
              profile.weight_kg != null ? `${profile.weight_kg} kg` : null,
              profile.activity_level ? t("activityLine", { level: ACTIVITY_LEVELS.includes(profile.activity_level as string) ? t(`activity.${profile.activity_level as string}`) : (profile.activity_level as string) }) : null,
              stage ? stageLabel(stage, tStage) : null,
            ].filter(Boolean).join(" · ")}
          </p>
          {((profile.declared_body_part_ids as string[] | null) ?? []).length > 0 && (
            <div className="mt-1.5">
              <span className="text-sm text-muted">{t("wantsToWork")}</span>
              <span className="inline-flex flex-wrap gap-1 align-middle">
                {(profile.declared_body_part_ids as string[]).map((bpId) => (
                  <span key={bpId} className="rounded-full bg-app-bg px-2 py-0.5 text-xs font-medium text-ink">
                    {(() => { const bp = bodyParts?.find((b) => b.id === bpId); return bp ? bodyPartLabel(bp, locale, tBodyParts) : bpId; })()}
                  </span>
                ))}
              </span>
            </div>
          )}
          {profile.rehab_progress && <p className="text-sm text-muted"><span>{profileUpdated ? t("progressUpdated", { date: profileUpdated }) : t("progress")}</span> {profile.rehab_progress as string}</p>}
          {profile.history && <p className="text-sm text-muted"><span>{t("history")}</span> {profile.history as string}</p>}
          {((profile.equipment as EquipmentId[] | null) ?? []).length > 0 && (
            <div className="mt-1.5">
              <span className="text-sm text-muted">{t("equipment")}</span>
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
        <p className="mt-2 text-sm text-muted">{t("noIntake")}</p>
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
        // Matériel déclaré à l'onboarding — liste vide = pas encore renseigné (« aucun matériel » est une case à part) → null, aucun signalement.
        patientEquipment={((profile?.equipment as string[] | null | undefined) ?? []).length > 0 ? (profile!.equipment as string[]) : null}
        addableExercises={addableExercises}
        bodyParts={bodyParts ?? []}
        addableWorkouts={addableWorkouts}
        patientConditionId={(patient.condition_id as string | null) ?? null}
        patientStage={stage}
        recentIds={recentIds}
        saveAsMineAction={duplicateSeance}
        adjustAction={adjustPatientWorkout}
        assignAction={addRecommendedWorkout}
        removeAction={removeRecommendedWorkout}
        recommendations={
          active
            ? {
                forWorkoutId: active.id,
                items: recommendVariants({
                  current: toVariantSeance(active),
                  pool: pool.map(toVariantSeance),
                  pickable: new Set(addableExercises.map((e) => e.id)),
                  watch: new Map(exerciseWatch.map((w) => [w.name, w.reason])),
                }),
              }
            : null
        }
      />
      }
    />
  );
}
