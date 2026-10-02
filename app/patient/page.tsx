import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import WavingHand from "@/components/WavingHand";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import { loadPatientHome } from "@/lib/patient/home-data";
import { buildWeeks, currentWeekNumber, localDateKey } from "@/lib/patient/weeks";
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
  // Date du jour sous la salutation, heure de Paris (le serveur peut tourner en UTC).
  const today = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Europe/Paris",
  }).format(new Date());

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

  // "Mon programme" summary card, top right of Accueil since 2026-10-01
  // (was at the bottom, Philippe 2026-09-08): a quick "what's left this week" recap that links through to
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
        {/* Deux cartes symétriques, même largeur et même hauteur (grille,
            étirées) : salutation à gauche, « Mon programme » à droite
            (Philippe, 2026-10-01). */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="group flex items-center rounded-2xl border border-line bg-surface px-5 py-4 shadow-md">
            <div className="min-w-0">
              <h1 className="flex items-center gap-2 text-2xl font-semibold text-ink">
                <span className="truncate">Bonjour {home.fullName ? home.fullName.split(" ")[0] : ""}</span>
                <WavingHand className="h-9 w-9 shrink-0" />
              </h1>
              <p className="mt-0.5 text-sm capitalize text-muted">{today}</p>
            </div>
          </div>

          {/* Carte « Mon programme » en haut à droite, à la place de la citation
              du jour (Philippe, 2026-10-01) — elle était en bas de page, sous
              la frise. Dégradé plutôt qu'une carte blanche de plus : c'est
              l'endroit où la page s'autorise un peu d'audace visuelle. La
              montagne garde le randonneur qui marque la progression ; la fine
              barre dit la même chose en clair. */}
          <section
            className={`group relative w-full overflow-hidden rounded-2xl bg-gradient-to-r px-5 py-4 shadow-md transition duration-200 ease-out hover:-translate-y-0.5 hover:shadow-xl ${
              programmeCard.done ? "from-ok to-green-700" : "from-brand to-brand-dark"
            }`}
          >
            <MountainScene
              variant="goal"
              progress={weekProgress}
              className="pointer-events-none absolute -bottom-1 left-0 h-20 w-28 text-white/90"
            />
            <div className="relative pl-24">
              {/* Pas de « Semaine 0 » quand aucun programme n'a commencé. */}
              {home.week > 0 && (
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-white/75">
                  {programmeCard.done && <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2} />}
                  Semaine {home.week}
                </p>
              )}
              <p className="mt-0.5 text-base font-semibold text-white">{programmeCard.title}</p>
              <p className="mt-0.5 text-sm text-white/85">{programmeCard.subtitle}</p>
              <div className="mt-3 flex items-center justify-between gap-3">
                <div className="h-1.5 w-full max-w-[8rem] overflow-hidden rounded-full bg-white/20">
                  <div className="h-full rounded-full bg-white transition-[width]" style={{ width: `${Math.round(weekProgress * 100)}%` }} />
                </div>
                <Link
                  href="/patient/programme"
                  className={`flex shrink-0 items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-sm font-semibold shadow-sm transition hover:bg-white/90 motion-safe:animate-[ctaPulse_2.4s_ease-out_infinite] motion-safe:group-hover:animate-none ${
                    programmeCard.done ? "text-ok" : "text-brand"
                  }`}
                >
                  {programmeCard.cta}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={2} />
                </Link>
              </div>
            </div>
          </section>
        </div>

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
        {/* Pas encore de programme : c'est le titre de cette section qui
            l'annonce (pending), plus de bloc séparé au-dessus. */}
        <WeekProgramme
          weeks={weeks}
          dayDetails={dayDetails}
          currentWeekNumber={currentWeekNumber(weeks)}
          // « En attente » = aucune séance attribuée cette semaine — PAS
          // « pas de condition » : le kiné peut attribuer une séance sans
          // condition, et le patient restait alors bloqué sur « Votre
          // programme arrive bientôt » (Philippe, 2026-10-01, patient Padraig).
          pending={!home.activeWorkout}
        />
      </div>

    </main>
  );
}
