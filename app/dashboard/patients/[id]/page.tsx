import Link from "next/link";
import { redirect } from "next/navigation";
import { Flame, FileText, MessageCircle, ChevronUp, ChevronDown, X } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import { startOfWeekISO, resolveMonthInfo } from "@/lib/week";
import { gradeDay } from "@/lib/exercise/dayGrade";
import { pickActiveWorkout } from "@/lib/exercise/activeRecommendation";
import { type CalendarDay } from "@/components/PatientCalendar";
import PatientOverviewPanel from "@/components/PatientOverviewPanel";
import AddWorkoutModal, { type AddableWorkout } from "@/components/AddWorkoutModal";
import { STAGE_LABELS, type InjuryStage } from "@/lib/exercise/prescription";
import { ageFromDob } from "@/lib/exercise/patientProfile";
import { computeStreak } from "@/lib/exercise/streak";
import {
  assignCondition,
  addRecommendedWorkout,
  removeRecommendedWorkout,
  moveRecommendedWorkout,
  sendMessage,
} from "./actions";

type WorkoutExercise = {
  position: number;
  exercises: { name: string } | null;
};
type Workout = {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number | null;
  times_per_week: number | null;
  stage: string | null;
  created_by: string | null;
  condition_id: string | null;
  workout_exercises: WorkoutExercise[];
};

const ACTIVITY_LABELS: Record<string, string> = {
  sedentary: "Sédentaire",
  moderate: "Modérée",
  active: "Active",
};

export default async function PatientDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; month?: string }>;
}) {
  const { id } = await params;
  const { error, month: monthParam } = await searchParams;

  const supabase = await createClient();
  const user = await requireUser(supabase);

  const { data: patient } = await supabase
    .from("patients")
    .select("id, full_name, email, condition_id")
    .eq("id", id)
    .maybeSingle();
  if (!patient) redirect("/dashboard/patients");

  const { data: conditions } = await supabase.from("conditions").select("id, name").order("name");
  const conditionName = (cid: string | null) => conditions?.find((c) => c.id === cid)?.name;

  // Messages already sent to this patient (most recent first).
  const { data: messages } = await supabase
    .from("patient_messages")
    .select("id, body, created_at, read_at, read_by_instructor_at, sender")
    .eq("patient_id", id)
    .order("created_at", { ascending: false })
    .limit(10);

  // Opening this page is what "reading" the thread means for the instructor
  // — mark any patient-authored messages read right here, rather than adding
  // a separate button/action for it. This page is already fully dynamic
  // (auth-gated, no caching), so a write during the GET is a deliberate,
  // low-stakes simplification, not a caching hazard.
  const unreadFromPatient = (messages ?? []).filter((m) => m.sender === "patient" && !m.read_by_instructor_at);
  if (unreadFromPatient.length > 0) {
    await supabase
      .from("patient_messages")
      .update({ read_by_instructor_at: new Date().toISOString() })
      .eq("patient_id", id)
      .eq("instructor_id", user.id)
      .eq("sender", "patient")
      .is("read_by_instructor_at", null);
  }

  // Patient's declared situation + profile (intake).
  const { data: profile } = await supabase
    .from("patient_profiles")
    .select("condition_id, injury_stage, rehab_progress, history, date_of_birth, height_cm, weight_kg, activity_level, updated_at")
    .eq("id", id)
    .maybeSingle();
  const profileUpdated = profile?.updated_at
    ? new Date(profile.updated_at as string).toLocaleDateString("fr-FR")
    : null;

  // Medical documents (private) → signed URLs the instructor can open.
  const { data: docs } = await supabase
    .from("patient_documents")
    .select("id, file_name, storage_path, uploaded_at")
    .eq("patient_id", id)
    .order("uploaded_at", { ascending: false });
  const docLinks: { id: string; file_name: string; url: string | null }[] = [];
  for (const d of docs ?? []) {
    const { data } = await supabase.storage
      .from("patient-documents")
      .createSignedUrl(d.storage_path, 3600);
    docLinks.push({ id: d.id, file_name: d.file_name, url: data?.signedUrl ?? null });
  }

  // Adherence + this week's completions per workout (used both by the
  // recommended list and to decide which one is "active").
  const { data: allLogs } = await supabase
    .from("workout_logs")
    .select("completed_at, workout_id")
    .eq("patient_id", id);
  const totalSessions = allLogs?.length ?? 0;
  const weekStart = startOfWeekISO();
  const weekSessions = (allLogs ?? []).filter((l) => (l.completed_at as string) >= weekStart).length;
  const streak = computeStreak((allLogs ?? []).map((l) => l.completed_at as string));
  const weekCount: Record<string, number> = {};
  for (const l of allLogs ?? []) {
    if ((l.completed_at as string) >= weekStart) {
      weekCount[l.workout_id as string] = (weekCount[l.workout_id as string] ?? 0) + 1;
    }
  }

  // Calendar — one color per day of the viewed month (defaults to the current
  // one; ?month=YYYY-MM navigates). A day's color comes from the worst
  // pain/difficulty reported for a session completed that day (see
  // lib/exercise/dayGrade.ts); no session that day = grey.
  const month = resolveMonthInfo(monthParam);
  const { data: monthLogs } = await supabase
    .from("workout_logs")
    .select("id, completed_at, workouts ( name )")
    .eq("patient_id", id)
    .gte("completed_at", month.startISO)
    .lt("completed_at", month.endISO);
  const monthLogIds = (monthLogs ?? []).map((l) => l.id as string);
  const { data: monthFeedback } = monthLogIds.length
    ? await supabase
        .from("patient_feedback")
        .select("workout_log_id, pain_score, difficulty, notes")
        .in("workout_log_id", monthLogIds)
    : { data: [] };

  const logsByDay = new Map<number, { id: string; workoutName: string | null; time: string }[]>();
  for (const l of monthLogs ?? []) {
    const completedAt = new Date(l.completed_at as string);
    const day = completedAt.getDate();
    const entry = {
      id: l.id as string,
      workoutName: (l.workouts as unknown as { name: string } | null)?.name ?? null,
      time: completedAt.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
    };
    if (!logsByDay.has(day)) logsByDay.set(day, []);
    logsByDay.get(day)!.push(entry);
  }
  type MonthFeedback = { pain_score: number | null; difficulty: number | null; notes: string | null };
  const feedbackByLogId = new Map<string, MonthFeedback>();
  for (const f of monthFeedback ?? []) {
    if (f.workout_log_id) {
      feedbackByLogId.set(f.workout_log_id as string, {
        pain_score: f.pain_score as number | null,
        difficulty: f.difficulty as number | null,
        notes: f.notes as string | null,
      });
    }
  }

  const calendarDays: CalendarDay[] = Array.from({ length: month.daysInMonth }, (_, i) => {
    const day = i + 1;
    const logsThatDay = logsByDay.get(day) ?? [];
    const feedbackThatDay = logsThatDay.map((l) => {
      const f = feedbackByLogId.get(l.id);
      return { painScore: f?.pain_score ?? null, difficulty: f?.difficulty ?? null };
    });
    const grade = gradeDay(logsThatDay.length > 0, feedbackThatDay);
    const detail = logsThatDay.length
      ? logsThatDay
          .map((l) => {
            const f = feedbackByLogId.get(l.id);
            const parts = [l.workoutName ?? "Séance", `terminée à ${l.time}`];
            if (f?.pain_score != null) parts.push(`douleur ${f.pain_score}/10`);
            if (f?.difficulty != null) parts.push(`difficulté ${f.difficulty}/10`);
            if (f?.notes) parts.push(`« ${f.notes} »`);
            return parts.join(" · ");
          })
          .join(" ; ")
      : null;
    return { day, grade, detail };
  });

  // Every séance the kiné can prescribe: their own (any condition) plus the
  // read-only platform templates — same pool as "Mes séances", not narrowed
  // to the patient's assigned condition (that field is informational only;
  // see lib/patient/home-data.ts, which reads recommendations directly and
  // never filters by condition).
  const WORKOUT_FIELDS =
    "id, name, description, duration_minutes, times_per_week, stage, created_by, condition_id, workout_exercises ( position, exercises ( name ) )";
  const [{ data: ownWorkoutsData }, { data: platformWorkoutsData }] = await Promise.all([
    supabase.from("workouts").select(WORKOUT_FIELDS).eq("created_by", user.id),
    supabase.from("workouts").select(WORKOUT_FIELDS).is("created_by", null),
  ]);
  const stageOrder = new Map(Object.keys(STAGE_LABELS).map((s, i) => [s, i]));
  const workouts = ([...(ownWorkoutsData ?? []), ...(platformWorkoutsData ?? [])] as unknown as Workout[]).sort(
    (a, b) =>
      (conditionName(a.condition_id) ?? "").localeCompare(conditionName(b.condition_id) ?? "", "fr") ||
      (stageOrder.get(a.stage ?? "") ?? 99) - (stageOrder.get(b.stage ?? "") ?? 99),
  );

  // The kiné's ordered recommendation list, in priority order.
  const { data: recRows } = await supabase
    .from("patient_recommended_workouts")
    .select("id, priority, workout_id")
    .eq("patient_id", id)
    .order("priority");
  const workoutById = new Map(workouts.map((w) => [w.id, w]));
  const recommended = (recRows ?? [])
    .map((r) => ({ recId: r.id as string, priority: r.priority as number, workout: workoutById.get(r.workout_id as string) }))
    .filter((r): r is { recId: string; priority: number; workout: Workout } => r.workout != null);

  const activeWorkoutId = pickActiveWorkout(
    recommended.map((r) => ({ workoutId: r.workout.id, priority: r.priority, timesPerWeek: r.workout.times_per_week })),
    weekCount,
  );

  const recommendedIds = new Set(recommended.map((r) => r.workout.id));
  const addableWorkouts: AddableWorkout[] = workouts
    .filter((w) => !recommendedIds.has(w.id))
    .map((w) => ({
      id: w.id,
      name: w.name,
      description: w.description,
      durationMinutes: w.duration_minutes,
      timesPerWeek: w.times_per_week,
      stageLabel: w.stage ? STAGE_LABELS[w.stage as InjuryStage] : null,
      conditionName: conditionName(w.condition_id) ?? null,
      editHref: w.created_by === user.id ? `/dashboard/seances/${w.id}` : null,
      exerciseNames: (w.workout_exercises ?? [])
        .slice()
        .sort((a, b) => a.position - b.position)
        .map((we) => we.exercises?.name)
        .filter((n): n is string => !!n),
    }));

  const stageLabel = profile?.injury_stage ? STAGE_LABELS[profile.injury_stage as InjuryStage] : null;

  const recommendedPanel = (
    <div>
      <h2 className="font-display text-xl font-semibold text-[color:var(--ink)]">Séances recommandées</h2>
      {recommended.length === 0 ? (
        <p className="mt-2 text-sm text-[color:var(--ink-muted)]">
          Aucune séance recommandée pour l&apos;instant — ajoutez-en une ci-dessous.
        </p>
      ) : (
        <ul className="mt-3">
          {recommended.map((r, i) => {
            const isActive = r.workout.id === activeWorkoutId;
            const done = weekCount[r.workout.id] ?? 0;
            const target = r.workout.times_per_week;
            return (
              <li
                key={r.recId}
                className={`flex items-start gap-3 border-t border-[color:var(--hairline)] py-3 first:border-t-0 first:pt-0 ${
                  isActive ? "-mx-3 rounded-xl border-t-0 bg-[color:var(--ink-accent)]/[0.06] px-3" : ""
                }`}
              >
                <span className="font-display mt-0.5 w-5 shrink-0 text-lg text-[color:var(--ink-muted)]">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  {r.workout.created_by === user.id ? (
                    <Link
                      href={`/dashboard/seances/${r.workout.id}`}
                      className="truncate text-sm font-semibold text-[color:var(--ink)] underline decoration-[color:var(--hairline)] underline-offset-2 hover:decoration-[color:var(--ink-accent)]"
                    >
                      {r.workout.name}
                    </Link>
                  ) : (
                    <p className="truncate text-sm font-semibold text-[color:var(--ink)]">{r.workout.name}</p>
                  )}
                  <p className="text-xs text-[color:var(--ink-muted)]">
                    {r.workout.duration_minutes} min · {target ? `${target}×/semaine` : "objectif libre"}
                  </p>
                  <p className="mt-0.5 text-xs text-[color:var(--ink-muted)]">
                    Cette semaine : {done}
                    {target ? `/${target}` : ""}
                    {isActive && <span className="ml-1.5 font-medium text-[color:var(--ink-accent)]">· en cours</span>}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <div className="flex gap-0.5">
                    <form action={moveRecommendedWorkout}>
                      <input type="hidden" name="patient_id" value={patient.id} />
                      <input type="hidden" name="rec_id" value={r.recId} />
                      <input type="hidden" name="direction" value="up" />
                      <button
                        type="submit"
                        disabled={i === 0}
                        aria-label="Monter"
                        className="rounded p-1 text-[color:var(--ink-muted)] hover:bg-black/5 hover:text-[color:var(--ink)] disabled:opacity-30"
                      >
                        <ChevronUp className="h-3.5 w-3.5" strokeWidth={2} />
                      </button>
                    </form>
                    <form action={moveRecommendedWorkout}>
                      <input type="hidden" name="patient_id" value={patient.id} />
                      <input type="hidden" name="rec_id" value={r.recId} />
                      <input type="hidden" name="direction" value="down" />
                      <button
                        type="submit"
                        disabled={i === recommended.length - 1}
                        aria-label="Descendre"
                        className="rounded p-1 text-[color:var(--ink-muted)] hover:bg-black/5 hover:text-[color:var(--ink)] disabled:opacity-30"
                      >
                        <ChevronDown className="h-3.5 w-3.5" strokeWidth={2} />
                      </button>
                    </form>
                  </div>
                  <form action={removeRecommendedWorkout}>
                    <input type="hidden" name="patient_id" value={patient.id} />
                    <input type="hidden" name="rec_id" value={r.recId} />
                    <button
                      type="submit"
                      aria-label="Retirer"
                      className="rounded p-1 text-[color:var(--ink-muted)] hover:bg-[color:var(--grade-red-bg)] hover:text-[color:var(--grade-red-fg)]"
                    >
                      <X className="h-3.5 w-3.5" strokeWidth={2} />
                    </button>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <AddWorkoutModal patientId={patient.id} addable={addableWorkouts} addAction={addRecommendedWorkout} />
    </div>
  );

  return (
    <main className="rehab-panel min-h-screen">
      <div className="mx-auto max-w-4xl p-6 sm:p-8">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <div>
            <Link href="/dashboard/patients" className="text-sm text-[color:var(--ink-muted)] transition-colors duration-150 hover:text-[color:var(--ink)]">
              ← Mes patients
            </Link>
            <h1 className="font-display text-2xl font-semibold leading-tight text-[color:var(--ink)]">
              {patient.full_name} <span className="text-base font-normal text-[color:var(--ink-muted)]">{patient.email}</span>
            </h1>
          </div>
          <div className="flex items-center gap-3 text-sm text-[color:var(--ink-soft)]">
            <span>{totalSessions} séance{totalSessions > 1 ? "s" : ""}</span>
            <span className="text-[color:var(--hairline)]">/</span>
            <span>{weekSessions} cette semaine</span>
            <span className="text-[color:var(--hairline)]">/</span>
            <span className="flex items-center gap-1">
              <Flame className="h-3.5 w-3.5 text-[color:var(--ink-muted)]" strokeWidth={1.5} />
              {streak}
            </span>
          </div>
        </div>

        {error && (
          <p className="mt-4 rounded-xl p-3 text-sm" style={{ background: "var(--grade-red-bg)", color: "var(--grade-red-fg)" }}>
            {error}
          </p>
        )}

        <PatientOverviewPanel
          recommendedPanel={recommendedPanel}
          monthLabel={month.label}
          prevMonthKey={month.prevMonthKey}
          nextMonthKey={month.nextMonthKey}
          leadingBlanks={month.leadingBlanks}
          days={calendarDays}
          todayDay={month.todayDay}
        />

        {/* Messages au patient */}
        <section className="mt-6">
          <h2 className="flex items-center gap-1.5 font-medium text-[color:var(--ink)]">
            <MessageCircle className="h-4 w-4 text-[color:var(--ink-muted)]" strokeWidth={1.5} />
            Messages
          </h2>
          {messages && messages.length > 0 && (
            <ul className="mt-3 flex max-h-56 flex-col gap-2 overflow-y-auto">
              {[...messages].reverse().map((m) => {
                const mine = m.sender === "instructor";
                return (
                  <li key={m.id as string} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                        mine
                          ? "rounded-br-md bg-[color:var(--ink-accent)] text-white"
                          : "rounded-bl-md bg-[color:var(--hairline)]/40 text-[color:var(--ink-soft)]"
                      }`}
                    >
                      <p>{m.body as string}</p>
                      <p className={`mt-0.5 text-xs ${mine ? "text-white/70" : "text-[color:var(--ink-muted)]"}`}>
                        {new Date(m.created_at as string).toLocaleString("fr-FR")}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          <form action={sendMessage} className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input type="hidden" name="patient_id" value={patient.id} />
            <textarea
              name="body"
              required
              rows={2}
              placeholder="Écrire un message…"
              className="flex-1 rounded-lg border border-[color:var(--hairline)] bg-white px-3 py-2 text-sm text-[color:var(--ink)] focus:border-[color:var(--ink-accent)] focus:outline-none focus:ring-2 focus:ring-[color:var(--ink-accent)]/20"
            />
            <button
              type="submit"
              className="self-end rounded-lg bg-[color:var(--ink-accent)] px-4 py-2 text-sm font-medium text-white transition-opacity duration-150 hover:opacity-90 sm:self-auto"
            >
              Envoyer
            </button>
          </form>
        </section>

        {/* Condition + situation déclarée — collapsed by default to keep the
            page short; the kiné opens it when they need the intake detail. */}
        <details className="mt-6 border-t border-[color:var(--hairline)] pt-4">
          <summary className="cursor-pointer list-none font-display text-lg font-semibold text-[color:var(--ink)]">
            Condition &amp; situation déclarée
            <span className="ml-2 font-sans text-sm font-normal text-[color:var(--ink-muted)]">
              {conditionName(patient.condition_id) ?? "Aucune condition assignée"}
            </span>
          </summary>

          <form action={assignCondition} className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input type="hidden" name="patient_id" value={patient.id} />
            <select
              name="condition_id"
              defaultValue={patient.condition_id ?? ""}
              required
              className="flex-1 rounded-lg border border-[color:var(--hairline)] bg-white px-3 py-2 text-[color:var(--ink)] focus:border-[color:var(--ink-accent)] focus:outline-none focus:ring-2 focus:ring-[color:var(--ink-accent)]/20"
            >
              <option value="" disabled>
                Choisir une condition…
              </option>
              {conditions?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded-lg bg-[color:var(--ink-accent)] px-4 py-2 font-medium text-white transition-opacity duration-150 hover:opacity-90"
            >
              Assigner
            </button>
          </form>

          {profile ? (
            <div className="mt-4 space-y-2 border-t border-[color:var(--hairline)] pt-4 text-sm">
              <p className="text-[color:var(--ink-soft)]">
                <span className="text-[color:var(--ink-muted)]">Ce que le patient déclare :</span>{" "}
                <span className="font-medium text-[color:var(--ink)]">{conditionName(profile.condition_id) ?? "—"}</span>
                {stageLabel && <span className="text-[color:var(--ink-muted)]"> · {stageLabel}</span>}
              </p>
              <p className="text-[color:var(--ink-soft)]">
                <span className="text-[color:var(--ink-muted)]">Profil :</span>{" "}
                {ageFromDob(profile.date_of_birth) ?? "—"} ans · {profile.height_cm ?? "—"} cm ·{" "}
                {profile.weight_kg ?? "—"} kg · activité {ACTIVITY_LABELS[profile.activity_level ?? ""] ?? "—"}
              </p>
              {profile.rehab_progress && (
                <p className="text-[color:var(--ink-soft)]">
                  <span className="text-[color:var(--ink-muted)]">
                    Avancement{profileUpdated ? ` (mis à jour le ${profileUpdated})` : ""} :
                  </span>{" "}
                  {profile.rehab_progress}
                </p>
              )}
              {profile.history && (
                <p className="text-[color:var(--ink-soft)]">
                  <span className="text-[color:var(--ink-muted)]">Historique :</span> {profile.history}
                </p>
              )}
            </div>
          ) : (
            <p className="mt-4 border-t border-[color:var(--hairline)] pt-4 text-sm text-[color:var(--ink-muted)]">
              Le patient n&apos;a pas encore complété son admission.
            </p>
          )}

          {docLinks.length > 0 && (
            <div className="mt-4 border-t border-[color:var(--hairline)] pt-4">
              <p className="text-sm font-medium text-[color:var(--ink-soft)]">Documents médicaux</p>
              <ul className="mt-2 space-y-1.5">
                {docLinks.map((d) => (
                  <li key={d.id}>
                    {d.url ? (
                      <a
                        href={d.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-sm font-medium text-[color:var(--ink-accent)] transition-opacity duration-150 hover:underline"
                      >
                        <FileText className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                        {d.file_name}
                      </a>
                    ) : (
                      <span className="flex items-center gap-1.5 text-sm text-[color:var(--ink-muted)]">
                        <FileText className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                        {d.file_name}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </details>
      </div>
    </main>
  );
}
