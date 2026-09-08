import Link from "next/link";
import { ArrowRight, CheckCircle2, Quote, Stethoscope } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import { loadPatientHome } from "@/lib/patient/home-data";
import { buildWeeks, currentWeekNumber, localDateKey } from "@/lib/patient/weeks";
import { quoteOfTheDay } from "@/lib/patient/quotes";
import WeekProgramme, { type SessionDetail } from "@/components/WeekProgramme";
import MountainScene from "@/components/MountainScene";

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

  const home = await loadPatientHome(supabase, user.id);
  const quote = quoteOfTheDay();

  const { data: patientRow } = await supabase.from("patients").select("created_at").eq("id", user.id).maybeSingle();
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

  // "Mon programme" summary card at the bottom of Accueil (Philippe,
  // 2026-09-08): a quick "what's left this week" recap that links through to
  // the full /patient/programme page, same numbers loadPatientHome already
  // computes for "séance du jour" — no separate query needed.
  const target = home.activeWorkout?.times_per_week ?? null;
  const remaining = target !== null ? Math.max(target - home.weekCount, 0) : null;
  // Hiker's spot on the mountain path (MountainScene's `progress`, 0–1):
  // full climb once the week's target is met, otherwise how far through it.
  const weekProgress = home.weekComplete ? 1 : target ? Math.min(home.weekCount / target, 1) : 0;
  const programmeCard = home.weekComplete
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
    <main className="min-h-screen p-6 sm:p-8">
      {/* This cluster (greeting, onboarding notice, clinical banner) is one
          status group — "here's where you stand today" — so its internal
          gap (space-y-4) stays tight and uniform. The jump to the programme
          zone below is a real change of subject, so it gets a bigger gap
          (mt-8, double this group's own rhythm) rather than the same value
          repeated everywhere (Philippe, 2026-09-08 spacing pass). */}
      <div className="mx-auto max-w-5xl space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <h1 className="text-2xl font-semibold text-ink">
            Bonjour {home.fullName ? home.fullName.split(" ")[0] : ""}
          </h1>

          {/* Daily quote — same for every patient on a given day (Philippe, 2026-09-08). */}
          <div className="relative max-w-sm overflow-hidden rounded-2xl border border-line bg-brand-soft p-4 shadow-sm">
            <MountainScene variant="quote" className="pointer-events-none absolute -bottom-3 -right-3 h-16 w-24 text-brand opacity-40" />
            <div className="relative flex items-start gap-3">
              <Quote className="h-5 w-5 shrink-0 text-brand" strokeWidth={1.75} />
              <div>
                <p className="text-sm italic text-ink">{quote.text}</p>
                {/* text-muted (#64748b) on bg-brand-soft only measures ~4.2:1 —
                    under WCAG AA's 4.5:1 for normal text (Philippe, 2026-09-08
                    audit) — text-ink/70 clears it comfortably on this background. */}
                <p className="mt-1 text-xs text-ink/70">— {quote.author}</p>
              </div>
            </div>
          </div>
        </div>

        {!home.conditionName && (
          <div className="rounded-2xl border border-line bg-surface p-5 text-center shadow-sm">
            <Stethoscope className="mx-auto h-6 w-6 text-brand" strokeWidth={1.75} />
            <p className="mt-2 font-medium text-ink">Votre programme arrive bientôt</p>
            <p className="mt-1 text-sm text-muted">
              Votre kiné prépare vos exercices personnalisés. Vous serez prévenu·e dès qu&apos;ils seront prêts.
            </p>
            <Link href="/patient/onboarding" className="mt-3 inline-block text-sm font-medium text-brand hover:underline">
              Compléter ma situation en attendant
            </Link>
          </div>
        )}

        {/* The brake, explained gently. The patient never sees the clinical wording
            of `decision.reason` — that phrasing is written for the practitioner. */}
        {(home.decision.concerning || home.decision.held) &&
          (home.decision.held && !home.decision.concerning ? (
            <div className="rounded-2xl border border-line bg-surface p-5 pl-4 shadow-sm border-l-[3px] border-l-brand">
              <p className="font-medium text-ink">Vous allez mieux</p>
              <p className="mt-1 text-sm text-muted">
                Vos retours s&apos;améliorent. Nous augmentons vos séances petit à petit, une étape
                par semaine, pour éviter toute rechute.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-line bg-surface p-5 pl-4 shadow-sm border-l-[3px] border-l-warn">
              <p className="font-medium text-ink">
                {home.decision.held ? "Nous avons adapté votre programme" : "Vos derniers retours ont été transmis"}
              </p>
              <p className="mt-1 text-sm text-muted">
                {home.decision.held
                  ? "Vos derniers retours indiquent que les exercices restent difficiles. Nous vous proposons donc des séances plus douces pour le moment — c'est normal, et c'est fait pour vous protéger."
                  : "Vous signalez encore des douleurs importantes. Votre praticien en est informé."}{" "}
                Parlez-en à votre praticien si cela persiste.
              </p>
            </div>
          ))}

      </div>

      {/* Outside the max-w-5xl column on purpose — the timeline uses the whole
          content width (up to the sidebar), not the reading-width column
          everything else on this page uses (Philippe, 2026-09-08). */}
      <div className="mt-8 w-full min-w-0">
        <WeekProgramme weeks={weeks} dayDetails={dayDetails} currentWeekNumber={currentWeekNumber(weeks)} />
      </div>

      {/* Tight gap to the timeline above (mt-4, same value as the status
          cluster's own rhythm) — this card is a continuation/summary of the
          programme zone, not a new subject, so it should read as attached to
          it rather than floating a full "section gap" away. */}
      <div className="mx-auto mt-4 max-w-5xl">
        {/* A gradient bar rather than another white bordered card (Philippe,
            2026-09-08: every other section on this page already is one of
            those — this is the one place to spend some visual boldness).
            The mountain sits as a background motif with the hiker still
            marking progress on it; the thin track below states the same
            number literally, in case the illustration alone isn't legible. */}
        <section
          className={`relative overflow-hidden rounded-2xl bg-gradient-to-r px-6 py-5 shadow-md ${
            programmeCard.done ? "from-ok to-green-700" : "from-brand to-brand-dark"
          }`}
        >
          <MountainScene
            variant="goal"
            progress={weekProgress}
            // -bottom-5 used to crop the trailhead (path start, low progress)
            // right off the visible card — the hiker was invisible until a
            // session or two in (Philippe, 2026-09-08, live check). -bottom-1
            // keeps the whole path on-card at every progress value.
            // Sized down at the smallest breakpoint (Philippe, 2026-09-08
            // spacing pass): at h-32 w-44 the fixed pl-28 reservation left as
            // little as ~160px of card width for the title/subtitle text on a
            // 375px phone once the card's own p-6 was subtracted — this
            // illustration was fighting the text for room on exactly the
            // device most patients actually use it on.
            className="pointer-events-none absolute -bottom-1 left-0 h-24 w-32 text-white/90 sm:h-32 sm:w-44"
          />
          <div className="relative pl-20 sm:pl-36">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-white/75">
                  {programmeCard.done && <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2} />}
                  Semaine {home.week}
                </p>
                <p className="mt-0.5 text-base font-semibold text-white">{programmeCard.title}</p>
                <p className="mt-1 text-sm text-white/85">{programmeCard.subtitle}</p>
              </div>
              <Link
                href="/patient/programme"
                className={`flex shrink-0 items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-semibold shadow-sm transition hover:bg-white/90 ${
                  programmeCard.done ? "text-ok" : "text-brand"
                }`}
              >
                {programmeCard.cta}
                <ArrowRight className="h-4 w-4" strokeWidth={2} />
              </Link>
            </div>
            <div className="mt-4 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-white/20">
              <div className="h-full rounded-full bg-white transition-[width]" style={{ width: `${Math.round(weekProgress * 100)}%` }} />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
