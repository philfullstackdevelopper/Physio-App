import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, Star, Lock, Flame, MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import { isProfileComplete } from "@/lib/exercise/patientProfile";
import { STAGE_LABELS, type InjuryStage } from "@/lib/exercise/prescription";
import { computeStreak } from "@/lib/exercise/streak";
import { stageWithFeedback, careWeek, type Rating } from "@/lib/exercise/stageProgress";
import { startOfTodayISO, daysAgoISO } from "@/lib/week";
import { getCurrentAccess } from "@/lib/billing/context";
import { signout, markMessageRead } from "./actions";

type Workout = {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number | null;
  times_per_week: number | null;
  workout_exercises: { exercises: { name: string } | null }[];
};

/** One workout card. `done` = already completed today (green), `isRec` = the
 *  practitioner's recommended one. */
function WorkoutCard({ w, isRec, done = false }: { w: Workout; isRec: boolean; done?: boolean }) {
  const exNames = (w.workout_exercises ?? [])
    .map((we) => we.exercises?.name)
    .filter(Boolean) as string[];
  return (
    <Link
      href={`/patient/${w.id}`}
      className={`block rounded-2xl border p-5 shadow-sm transition hover:shadow-md ${
        done
          ? "border-teal-300 bg-teal-50"
          : isRec
            ? "border-teal-500 bg-white ring-1 ring-teal-500"
            : "border-slate-100 bg-white"
      }`}
    >
      {done ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-teal-600 px-2.5 py-0.5 text-xs font-medium text-white">
          <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2} />
          Faite aujourd&apos;hui
        </span>
      ) : isRec ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-medium text-teal-700">
          <Star className="h-3.5 w-3.5" strokeWidth={2} />
          Recommandée par votre praticien
        </span>
      ) : null}
      <div className="mt-2 flex items-baseline justify-between gap-3">
        <h3 className="text-lg font-semibold text-slate-900">{w.name}</h3>
        <span className="shrink-0 font-bold text-teal-700">
          <span className="text-3xl tabular-nums">{w.duration_minutes}</span>
          <span className="text-sm font-medium text-slate-400"> min</span>
        </span>
      </div>
      {w.description && <p className="mt-1 text-sm text-slate-500">{w.description}</p>}
      {exNames.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {exNames.map((n, i) => (
            <li key={i} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
              {n}
            </li>
          ))}
        </ul>
      )}
      <span className="mt-4 inline-block text-sm font-medium text-teal-700">
        {done ? "Refaire la séance →" : "Voir la séance →"}
      </span>
    </Link>
  );
}

export default async function PatientHome() {
  const supabase = await createClient();
  const user = await requireUser(supabase);

  // First-login gate: send the patient to onboarding until their situation +
  // profile are recorded.
  const { data: profile } = await supabase
    .from("patient_profiles")
    .select("condition_id, injury_stage, date_of_birth, height_cm, weight_kg, activity_level, updated_at")
    .eq("id", user.id)
    .maybeSingle();
  if (!isProfileComplete(profile)) redirect("/patient/onboarding");

  const { data: patient } = await supabase
    .from("patients")
    .select("full_name, condition_id, recommended_workout_id")
    .eq("id", user.id)
    .maybeSingle();

  // Short notes from the practitioner (e.g. reacting to a recent session).
  // Shown regardless of subscription tier — this is communication, not the
  // paid exercise content the free-tier gate below protects.
  const { data: messages } = await supabase
    .from("patient_messages")
    .select("id, body, created_at, read_at")
    .eq("patient_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10);

  const messagesSection = messages && messages.length > 0 && (
    <section className="mt-6 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <h2 className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
        <MessageCircle className="h-4 w-4 text-teal-600" strokeWidth={1.75} />
        Messages de votre kiné
      </h2>
      <ul className="mt-3 space-y-3">
        {messages.map((m) => (
          <li
            key={m.id as string}
            className={`rounded-xl p-3 text-sm ${
              m.read_at ? "bg-slate-50 text-slate-600" : "bg-teal-50 text-slate-800"
            }`}
          >
            <p>{m.body as string}</p>
            <div className="mt-1.5 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                {new Date(m.created_at as string).toLocaleString("fr-FR")}
              </span>
              {!m.read_at && (
                <form action={markMessageRead}>
                  <input type="hidden" name="message_id" value={m.id as string} />
                  <button type="submit" className="text-xs font-medium text-teal-700 hover:underline">
                    Marquer comme lu
                  </button>
                </form>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );

  // What the patient SEES is driven by the condition ASSIGNED BY THE PRACTITIONER
  // (patients.condition_id). The patient's self-declaration is intake only.
  const assignedConditionId = (patient?.condition_id as string | null) ?? null;
  const { data: condition } = assignedConditionId
    ? await supabase.from("conditions").select("name").eq("id", assignedConditionId).maybeSingle()
    : { data: null };

  // Suggestions depend on the practitioner's condition + the patient's CURRENT
  // stage. The calendar advances that stage on its own, but recent pain and
  // difficulty can hold it back — see stageWithFeedback(). Only the last two
  // weeks count, so an old rough patch doesn't freeze someone indefinitely.
  const declaredStage = profile!.injury_stage as InjuryStage;
  const since = daysAgoISO(14);
  const [{ data: painRows }, { data: diffRows }] = await Promise.all([
    supabase
      .from("patient_feedback")
      .select("pain_score, difficulty, created_at")
      .eq("patient_id", user.id)
      .gte("created_at", since),
    supabase
      .from("exercise_feedback")
      .select("difficulty, created_at")
      .eq("patient_id", user.id)
      .gte("created_at", since),
  ]);
  // Each rating keeps its date so a bad episode can age out one stage per week.
  const rated = (rows: Record<string, unknown>[], field: string): Rating[] =>
    rows
      .filter((r) => r[field] != null)
      .map((r) => ({ value: r[field] as number, at: r.created_at as string }));
  const decision = stageWithFeedback(declaredStage, profile!.updated_at as string, {
    painScores: rated(painRows ?? [], "pain_score"),
    difficulties: [...rated(painRows ?? [], "difficulty"), ...rated(diffRows ?? [], "difficulty")],
  });
  const stage = decision.stage;
  const week = careWeek(declaredStage, profile!.updated_at as string);
  const WORKOUT_FIELDS =
    "id, name, description, duration_minutes, times_per_week, workout_exercises ( exercises ( name ) )";
  let workouts: Workout[] = [];
  if (assignedConditionId) {
    const { data } = await supabase
      .from("workouts")
      .select(WORKOUT_FIELDS)
      .eq("condition_id", assignedConditionId)
      .eq("stage", stage)
      .order("duration_minutes");
    workouts = (data ?? []) as unknown as Workout[];
  }

  // Free-tier patients (no trial, no subscription) get a locked teaser instead
  // of the real program — seeing that a program exists is the hook to subscribe,
  // actually following it is the paid product.
  const access = await getCurrentAccess(supabase, user.id);
  if (access.role === "patient" && access.access.level === "free") {
    const exerciseCount = new Set(
      workouts.flatMap((w) =>
        (w.workout_exercises ?? []).map((we) => we.exercises?.name).filter(Boolean),
      ),
    ).size;
    return (
      <main className="min-h-screen p-6 sm:p-8">
        <div className="mx-auto max-w-2xl">
          <div className="flex items-center justify-between gap-2">
            <Link
              href="/billing"
              className="rounded-xl border border-teal-600 bg-white px-4 py-2 text-sm font-medium text-teal-700 shadow-sm transition hover:bg-teal-50"
            >
              Mon abonnement
            </Link>
            <form action={signout}>
              <button
                type="submit"
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-50"
              >
                Se déconnecter
              </button>
            </form>
          </div>

          <div className="mt-4 text-center">
            <h1 className="font-display text-4xl font-semibold leading-tight text-slate-900 sm:text-5xl">
              Bonjour, {patient?.full_name ? patient.full_name.split(" ")[0] : "Bienvenue"}
            </h1>
          </div>

          {messagesSection}

          <div className="mt-8 rounded-2xl border border-teal-200 bg-teal-50 p-8 text-center">
            <Lock className="mx-auto h-10 w-10 text-teal-600" strokeWidth={1.5} />
            {workouts.length > 0 ? (
              <p className="mt-4 text-lg font-medium text-slate-900">
                Votre kiné vous a assigné un programme de {exerciseCount} exercice
                {exerciseCount > 1 ? "s" : ""}.
              </p>
            ) : (
              <p className="mt-4 text-lg font-medium text-slate-900">
                Votre praticien n&apos;a pas encore configuré votre programme.
              </p>
            )}
            <p className="mt-2 text-sm text-slate-600">
              Abonnez-vous pour voir le détail des exercices, suivre votre progression et démarrer
              vos séances guidées.
            </p>
            <Link
              href="/billing"
              className="mt-6 inline-block rounded-xl bg-teal-600 px-6 py-3 text-lg font-semibold text-white shadow-sm transition hover:bg-teal-700"
            >
              S&apos;abonner pour commencer
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // Daily streak (consecutive days with a completed workout).
  const { data: streakLogs } = await supabase
    .from("workout_logs")
    .select("completed_at, workout_id")
    .eq("patient_id", user.id)
    .order("completed_at", { ascending: false })
    .limit(400);
  const streak = computeStreak((streakLogs ?? []).map((l) => l.completed_at as string));

  // Which workouts were completed TODAY? (reuses the logs already fetched)
  const todayISO = startOfTodayISO();
  const doneTodayIds = new Set(
    (streakLogs ?? [])
      .filter((l) => (l.completed_at as string) >= todayISO)
      .map((l) => l.workout_id as string),
  );
  const doneToday = doneTodayIds.size > 0;

  // A session done today, or the one the practitioner recommends, may belong to
  // another stage than the one we just loaded — the patient's stage can move
  // between two sessions, and the feedback brake moves it more often. The
  // practitioner's recommendation must also never silently vanish just because
  // its stage doesn't match right now — the kiné stays the guide. Fetch those
  // by id so neither case disappears from the page.
  const recId = patient?.recommended_workout_id;
  const missingIds = [...doneTodayIds, ...(recId ? [recId] : [])].filter(
    (id) => !workouts.some((w) => w.id === id),
  );
  if (missingIds.length > 0) {
    const { data } = await supabase.from("workouts").select(WORKOUT_FIELDS).in("id", missingIds);
    workouts = [...workouts, ...((data ?? []) as unknown as Workout[])];
  }

  // Recommended workout first, then by duration.
  const ordered = [...workouts].sort((a, b) => (a.id === recId ? -1 : b.id === recId ? 1 : 0));
  // Split the program: what's already been done today vs. what's left to continue.
  const doneWorkouts = ordered.filter((w) => doneTodayIds.has(w.id));
  const remainingWorkouts = ordered.filter((w) => !doneTodayIds.has(w.id));

  return (
    <main className="min-h-screen p-6 sm:p-8">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between gap-2">
          <Link
            href="/billing"
            className="rounded-xl border border-teal-600 bg-white px-4 py-2 text-sm font-medium text-teal-700 shadow-sm transition hover:bg-teal-50"
          >
            Mon abonnement
          </Link>
          <form action={signout}>
            <button
              type="submit"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-50"
            >
              Se déconnecter
            </button>
          </form>
        </div>

        <div className="mt-4 text-center">
          <h1 className="font-display text-4xl font-semibold leading-tight text-slate-900 sm:text-5xl">
            Bonjour, {patient?.full_name ? patient.full_name.split(" ")[0] : "Bienvenue"}
          </h1>
        </div>

        <div className="mt-4 flex justify-center">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1 text-sm font-semibold text-orange-600">
            <Flame className="h-4 w-4" strokeWidth={2} />
            {streak > 0 ? `${streak} jour${streak > 1 ? "s" : ""} d'affilée` : "Commencez votre série aujourd'hui !"}
          </div>
        </div>

        {messagesSection}

        <div className="mt-2 flex items-center justify-center gap-2 text-center text-sm text-slate-500">
          <span>
            {condition?.name ? (
              <>
                Votre programme :{" "}
                <span className="font-medium text-slate-700">{condition.name}</span>
                <span className="text-slate-400"> (défini par votre praticien)</span>
              </>
            ) : (
              "Programme non encore défini par votre praticien."
            )}
            <span className="text-slate-500"> · {STAGE_LABELS[stage]} (semaine {week})</span>
          </span>
          <Link href="/patient/onboarding" className="font-medium text-teal-700 hover:underline">
            Mettre à jour ma situation
          </Link>
        </div>

        {/* The brake, explained gently. The patient never sees the clinical wording
            of `decision.reason` — that phrasing is written for the practitioner.
            Three cases: still braked, climbing back, or merely flagged. */}
        {(decision.concerning || decision.held) &&
          (decision.held && !decision.concerning ? (
            <div className="mt-6 rounded-2xl border border-teal-200 bg-teal-50 p-5">
              <p className="font-medium text-teal-900">Vous allez mieux</p>
              <p className="mt-1 text-sm text-teal-800">
                Vos retours s&apos;améliorent. Nous augmentons vos séances petit à petit, une étape
                par semaine, pour éviter toute rechute.
              </p>
            </div>
          ) : (
            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <p className="font-medium text-amber-900">
                {decision.held
                  ? "Nous avons adapté votre programme"
                  : "Vos derniers retours ont été transmis"}
              </p>
              <p className="mt-1 text-sm text-amber-800">
                {decision.held
                  ? "Vos derniers retours indiquent que les exercices restent difficiles. Nous vous proposons donc des séances plus douces pour le moment — c'est normal, et c'est fait pour vous protéger."
                  : "Vous signalez encore des douleurs importantes. Votre praticien en est informé."}{" "}
                Parlez-en à votre praticien si cela persiste.
              </p>
            </div>
          ))}

        {doneToday && (
          <>
            <div className="mt-6 rounded-2xl border border-teal-200 bg-teal-50 p-5">
              <p className="flex items-center gap-1.5 font-display text-xl font-semibold text-teal-800">
                <CheckCircle2 className="h-5 w-5 shrink-0" strokeWidth={1.75} />
                Séance faite aujourd&apos;hui !
              </p>
              <p className="mt-1 text-sm text-teal-700">
                Beau travail — revenez demain pour garder votre série.
              </p>
            </div>
            {doneWorkouts.length > 0 && (
              <div className="mt-4 space-y-4">
                {doneWorkouts.map((w) => (
                  <WorkoutCard key={w.id} w={w} isRec={w.id === recId} done />
                ))}
              </div>
            )}
          </>
        )}

        {workouts.length === 0 ? (
          <div className="mt-8 rounded-xl border border-slate-100 bg-white p-6 text-center text-sm text-slate-500 shadow-sm">
            Votre praticien n&apos;a pas encore configuré votre programme. Revenez bientôt !
          </div>
        ) : doneToday ? (
          remainingWorkouts.length > 0 && (
            <>
              <h2 className="mt-8 text-lg font-medium text-slate-900">Pour continuer aujourd&apos;hui</h2>
              <p className="mt-1 text-sm text-slate-400">
                Optionnel — d&apos;autres séances, si vous vous sentez d&apos;attaque.
              </p>
              <div className="mt-4 space-y-4">
                {remainingWorkouts.map((w) => (
                  <WorkoutCard key={w.id} w={w} isRec={w.id === recId} />
                ))}
              </div>
            </>
          )
        ) : (
          <>
            <h2 className="mt-8 text-lg font-medium text-slate-900">
              Routines suggérées pour aujourd&apos;hui
            </h2>
            <div className="mt-4 space-y-4">
              {ordered.map((w) => (
                <WorkoutCard key={w.id} w={w} isRec={w.id === recId} />
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
