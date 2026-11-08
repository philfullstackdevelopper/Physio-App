import { getLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { intlTag } from "@/lib/i18n/translator";
import type { Locale } from "@/i18n/locales";
import { requireUser } from "@/lib/supabase/require-user";
import { loadPatientHome } from "@/lib/patient/home-data";
import { buildWeeks, currentWeekNumber, localDateKey } from "@/lib/patient/weeks";
import type { SessionDetail } from "@/components/WeekProgramme";
import PatientHomeView, { type ProgrammeCard } from "@/components/PatientHomeView";
import { loadUnpaidReviews } from "@/lib/billing/feeNotes";
import { nativeAppPlatform } from "@/lib/app/nativeAppServer";
import ReviewPaymentNotice from "./suivi/ReviewPaymentNotice";

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
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("patient.home");

  // En parallèle (audit du 2026-10-08) : ces trois lectures sont indépendantes.
  const [home, { data: patientRow }, unpaid, native] = await Promise.all([
    loadPatientHome(supabase, user.id),
    supabase.from("patients").select("created_at").eq("id", user.id).maybeSingle(),
    // Honoraires du kiné refusés / à confirmer (audit Stripe du 2026-11-08) :
    // bandeau « Payer » au-dessus de l'accueil, seulement s'il y en a. Jamais
    // dans l'appli mobile (pas de paiement dans l'appli : règles des stores).
    loadUnpaidReviews(supabase, user.id),
    nativeAppPlatform(),
  ]);
  // Date du jour sous la salutation, heure de Paris (le serveur peut tourner en UTC).
  const today = new Intl.DateTimeFormat(intlTag(locale), {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Europe/Paris",
  }).format(new Date());

  const weeks = buildWeeks((patientRow?.created_at as string | undefined) ?? new Date().toISOString(), new Date(), locale);
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
      time: completedAt.toLocaleTimeString(intlTag(locale), { hour: "2-digit", minute: "2-digit" }),
      durationMinutes: workout?.duration_minutes ?? null,
      painScore: (f?.pain_score as number | null) ?? null,
      difficulty: (f?.difficulty as number | null) ?? null,
      notes: (f?.notes as string | null) ?? null,
    };
    (dayDetails[key] ??= []).push(entry);
  }

  // "Mon programme" summary card, top right of Accueil since 2026-10-01
  // (was at the bottom, Philippe 2026-09-08): a quick "what's left this week" recap that links through to
  // the full /patient/programme page, same numbers loadPatientHome already
  // computes — no separate query needed.
  const target = home.activeWorkout?.times_per_week ?? null;
  const remaining = target !== null ? Math.max(target - home.weekCount, 0) : null;
  // Hiker's spot on the mountain path (MountainScene's `progress`, 0–1):
  // full climb once the week's target is met, otherwise how far through it.
  const weekProgress = home.weekComplete ? 1 : target ? Math.min(home.weekCount / target, 1) : 0;
  const programmeCard: ProgrammeCard = home.weekComplete
    ? {
        title: t("weekDoneTitle"),
        subtitle: t("weekDoneSubtitle"),
        cta: t("reviewProgramme"),
        done: true,
      }
    : home.activeWorkout
      ? {
          title: home.activeWorkout.name,
          subtitle: [
            remaining !== null ? t("remaining", { count: remaining }) : null,
            home.activeWorkout.duration_minutes != null ? t("aboutMinutes", { minutes: home.activeWorkout.duration_minutes }) : null,
          ]
            .filter(Boolean)
            .join(" · "),
          cta: t("seeProgramme"),
          done: false,
        }
      : {
          title: t("yourProgramme"),
          subtitle: t("noSessionYet"),
          cta: t("seeProgramme"),
          done: false,
        };

  const view = (
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
  if (native || unpaid.length === 0) return view;
  const tSuivi = await getTranslations("billing.suivi");
  return (
    <>
      <div className="px-4 pt-3 sm:px-8 sm:pt-5">
        <ReviewPaymentNotice reviews={unpaid} kineName={tSuivi("kineFallback")} />
      </div>
      {view}
    </>
  );
}
