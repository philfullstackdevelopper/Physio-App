// Prototype surface — l'Accueil patient avec des données FICTIVES, pour juger
// l'affichage sur téléphone sans se connecter (Philippe, 2026-10-06). Rend le
// vrai composant PatientHomeView et la vraie barre PatientNav dans la même
// coquille que app/patient/layout.tsx : tout changement d'affichage s'y voit
// tel quel. Aucune donnée réelle, aucune requête. Pas lié depuis l'appli.

import PatientNav from "@/components/PatientNav";
import PatientHomeView from "@/components/PatientHomeView";
import { buildPainSeries } from "@/lib/dashboard/painHistory";
import type { SessionDetail } from "@/components/WeekProgramme";
import { buildWeeks, currentWeekNumber, localDateKey } from "@/lib/patient/weeks";

export const metadata = { title: "Aperçu Accueil patient", robots: { index: false } };
// Recalculée à chaque visite : les semaines fictives suivent la vraie date du jour.
export const dynamic = "force-dynamic";

export default function AccueilPatientPrototype() {
  const now = new Date();
  const created = new Date(now);
  created.setDate(created.getDate() - 24);
  const weeks = buildWeeks(created.toISOString(), now);

  // Séances fictives : quelques jours par semaine passée, une cette semaine.
  const dayDetails: Record<string, SessionDetail[]> = {};
  for (const daysAgo of [22, 20, 17, 15, 13, 10, 8, 6, 1]) {
    const d = new Date(now);
    d.setDate(d.getDate() - daysAgo);
    if (d.getTime() < created.getTime()) continue;
    dayDetails[localDateKey(d)] = [
      {
        logId: `demo-${daysAgo}`,
        workoutName: "Renforcement lombaire — niveau 2",
        time: "18:15",
        durationMinutes: 20,
        painScore: 3,
        difficulty: 2,
        notes: null,
      },
    ];
  }

  const today = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Paris" }).format(now);
  const week = currentWeekNumber(weeks, now);

  return (
    <div className="flex min-h-screen flex-col bg-app-bg text-ink max-sm:bg-phone-bg sm:flex-row">
      <PatientNav patientName="Léa Martin" unreadCount={1} pathnameOverride="/patient" />
      <div className="relative min-w-0 flex-1 pb-20 max-sm:pb-[calc(5rem+env(safe-area-inset-bottom))] sm:pb-0">
        <PatientHomeView
          stats={{ adherencePct: 83, adherenceDelta: 12, painAvg: 3.0, painDelta: -2.0, painSeries: buildPainSeries([2,6,10,14,18,22,26].map((d, k) => ({ pain_score: [3,3,2,4,3,5,5][k], created_at: new Date(Date.UTC(2026, 9, 7, 12) - d * 86_400_000).toISOString() }))) }}
          firstName="Léa"
          today={today}
          week={week}
          programmeCard={{
            title: "Renforcement lombaire — niveau 2",
            subtitle: "2 séances à réaliser · 20 minutes environ",
            cta: "Voir mon programme",
            done: false,
          }}
          weekCount={1}
          target={3}
          weekProgress={1 / 3}
          decision={{ concerning: false, held: false }}
          weeks={weeks}
          dayDetails={dayDetails}
          currentWeekNumber={week}
          pending={false}
        />
      </div>
    </div>
  );
}
