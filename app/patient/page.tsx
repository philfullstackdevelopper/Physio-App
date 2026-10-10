import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import { loadPatientHome } from "@/lib/patient/home-data";
import { buildWeeks, currentWeekNumber, localDateKey } from "@/lib/patient/weeks";
import type { SessionDetail } from "@/components/WeekProgramme";
import { getTierBilling } from "@/lib/billing/context";
import { historyDaysVisibleFor } from "@/lib/patient/historyWindow";
import PatientHomeView, { type ProgrammeCard } from "@/components/PatientHomeView";

// Philippe, 2026-09-08: Accueil is now the week-by-week programme browser
// (moved here from /patient/programme, which is now reserved for "what's
// assigned right now" — see that page). The old dashboard (stat tiles,
// pain chart, last message, "Programme du jour" card) is dropped: adherence
// % and the pain trend already live on /patient/progres, and the last
// message already lives on /patient/messages — this page no longer
// duplicates them. The clinical brake/improvement banner stays: it's a
// safety notice, not a dashboard widget, and shouldn't get buried.
export default async function PatientDashboard() {
  const supabase = await createClient();
  const user = await requireUser(supabase);

  // En parallèle (audit du 2026-10-08) : ces trois lectures sont indépendantes.
  const [home, { data: patientRow }, billing] = await Promise.all([
    loadPatientHome(supabase, user.id),
    supabase.from("patients").select("created_at").eq("id", user.id).maybeSingle(),
    getTierBilling(supabase, user.id),
  ]);
  // Date du jour sous la salutation, heure de Paris (le serveur peut tourner en UTC).
  const today = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Europe/Paris",
  }).format(new Date());

  const weeks = buildWeeks((patientRow?.created_at as string | undefined) ?? new Date().toISOString());
  const rangeStartISO = weeks[0].startISO;
  const rangeEndISO = weeks[weeks.length - 1].endISO;

  const { data: rangeLogs } = await supabase
    .from("workout_logs")
    .select("id, completed_at, workouts ( name, duration_minutes )")
    .eq("patient_id", user.id)
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
    const entry: SessionDetail = {
      logId: l.id as string,
      workoutName: workout?.name ?? null,
      time: completedAt.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
      durationMinutes: workout?.duration_minutes ?? null,
      painScore: (f?.pain_score as number | null) ?? null,
      difficulty: (f?.difficulty as number | null) ?? null,
      notes: (f?.notes as string | null) ?? null,
    };
    (dayDetails[key] ??= []).push(entry);
  }

  // Offre Essentiel : historique limité (lib/patient/historyWindow.ts). La
  // frise de l'Accueil le contournait (audit du 2026-10-08) — les jours plus
  // anciens que la fenêtre restent marqués « séance faite », mais sans le
  // ressenti (douleur, difficulté, notes), comme sur la page Historique.
  const historyDaysVisible = historyDaysVisibleFor(billing.subPlan);
  if (historyDaysVisible !== null) {
    const daysWithSessions = Object.keys(dayDetails).sort().reverse();
    for (const key of daysWithSessions.slice(historyDaysVisible)) {
      dayDetails[key] = dayDetails[key].map((s) => ({ ...s, painScore: null, difficulty: null, notes: null }));
    }
  }

  // "Mon programme" summary card, top right of Accueil since 2026-10-01
  // (was at the bottom, Philippe 2026-09-08): a quick "what's left this week" recap that links through to
  // the full /patient/programme page, same numbers loadPatientHome already
  // computes for "séance du jour" — no separate query needed.
  const target = home.activeWorkout?.times_per_week ?? null;
  const remaining = target !== null ? Math.max(target - home.weekCount, 0) : null;
  // Hiker's spot on the mountain path (MountainScene's `progress`, 0–1):
  // full climb once the week's target is met, otherwise how far through it.
  const weekProgress = home.weekComplete ? 1 : target ? Math.min(home.weekCount / target, 1) : 0;
  const programmeCard: ProgrammeCard = home.weekComplete
    ? {
        title: "Programme de la semaine terminé",
        subtitle: "Bravo, vous avez réalisé tout ce qui était prévu cette semaine.",
        cta: "Revoir mon programme",
        done: true,
      }
    : home.activeWorkout
      ? {
          title: home.activeWorkout.name,
          subtitle: [
            remaining !== null ? `${remaining} séance${remaining > 1 ? "s" : ""} à réaliser` : null,
            home.activeWorkout.duration_minutes != null ? `${home.activeWorkout.duration_minutes} minutes environ` : null,
          ]
            .filter(Boolean)
            .join(" · "),
          cta: "Voir mon programme",
          done: false,
        }
      : {
          title: "Votre programme",
          subtitle: "Votre kiné n'a pas encore assigné de séance.",
          cta: "Voir mon programme",
          done: false,
        };

  return (
    <PatientHomeView
      firstName={home.fullName ? home.fullName.split(" ")[0] : ""}
      today={today}
      week={home.week}
      programmeCard={programmeCard}
      weekCount={home.weekCount}
      target={target}
      weekProgress={weekProgress}
      decision={home.decision}
      weeks={weeks}
      dayDetails={dayDetails}
      currentWeekNumber={currentWeekNumber(weeks)}
      pending={!home.activeWorkout}
    />
  );
}
