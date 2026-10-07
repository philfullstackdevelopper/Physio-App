import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import { loadPatientHome } from "@/lib/patient/home-data";
import { loadPatientJourney } from "@/lib/patient/journey";
import { loadProgressStats } from "@/lib/patient/progressStats";
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

  const home = await loadPatientHome(supabase, user.id);
  // Date du jour sous la salutation, heure de Paris (le serveur peut tourner en UTC).
  const today = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Europe/Paris",
  }).format(new Date());

  const [{ weeks, dayDetails, currentWeekNumber: currentWeek }, stats] = await Promise.all([
    loadPatientJourney(supabase, user.id),
    loadProgressStats(supabase, user.id),
  ]);

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
      stats={stats}
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
      currentWeekNumber={currentWeek}
      pending={!home.activeWorkout}
    />
  );
}
