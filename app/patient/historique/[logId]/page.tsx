import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { intlTag } from "@/lib/i18n/translator";
import type { Locale } from "@/i18n/locales";
import HistoriqueDetailView from "./HistoriqueDetailView";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import { requirePatientAccess } from "@/lib/patient/requirePatientAccess";

type LogDetail = {
  id: string;
  completed_at: string;
  workouts: {
    name: string;
    workout_exercises: { position: number; exercises: { name: string } | null }[];
  } | null;
};

export default async function HistoriqueDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ logId: string }>;
  searchParams: Promise<{ depuis?: string }>;
}) {
  const { logId } = await params;
  // Ouvert depuis la frise de l'accueil (components/WeekProgramme.tsx,
  // « ?depuis=accueil ») : le lien retour y ramène ; sinon, à l'historique.
  const { depuis } = await searchParams;
  const tNav = await getTranslations("patient.nav");
  const back = depuis === "accueil" ? { href: "/patient", label: tNav("home") } : undefined;
  const supabase = await createClient();
  const user = await requireUser(supabase);
  // Barrières du patient (CGU, accès payé, consentement) refaites ici : le
  // layout ne se rejoue pas à chaque navigation (audit du 2026-11-10, B4).
  if (!(await requirePatientAccess())) return null;

  // Explicit patient_id filter, not just RLS, so a wrong/foreign id 404s
  // cleanly instead of relying only on the database to say no.
  const { data: logData } = await supabase
    .from("workout_logs")
    .select(
      "id, completed_at, workouts ( name, workout_exercises ( position, exercises ( name ) ) )",
    )
    .eq("id", logId)
    .eq("patient_id", user.id)
    .maybeSingle();
  if (!logData) redirect("/patient/historique");
  const log = logData as unknown as LogDetail;

  // Feedback recorded for THIS specific session, not just "around that time" —
  // linked by workout_log_id (older sessions predating that link show none).
  // Avec, le suivi par exercice (exercise_results, migration 0080) : fait ou
  // passé. Avant, tout était coché « fait », même un exercice passé
  // (Philippe, 2026-11-06 : audit, on corrige).
  const [{ data: sessionFeedback }, { data: resultRows }] = await Promise.all([
    supabase.from("patient_feedback").select("pain_score, notes").eq("workout_log_id", logId).maybeSingle(),
    supabase
      .from("exercise_results")
      .select("exercise_name, position, status")
      .eq("workout_log_id", logId)
      .eq("patient_id", user.id)
      .order("position"),
  ]);

  // Séance enregistrée avec son suivi par exercice : la liste vient de là
  // (ce qui a vraiment été proposé ce jour-là). Séance plus ancienne, sans
  // suivi : la liste actuelle de la séance, tout coché, comme avant.
  const tc = await getTranslations("patient.common");
  const locale = (await getLocale()) as Locale;
  const exercises =
    resultRows && resultRows.length > 0
      ? resultRows.map((r) => ({ name: r.exercise_name as string, skipped: r.status === "skipped" }))
      : [...(log.workouts?.workout_exercises ?? [])]
          .sort((a, b) => a.position - b.position)
          .map((we) => ({ name: we.exercises?.name ?? tc("exercise"), skipped: false }));

  return (
    <HistoriqueDetailView
      name={log.workouts?.name ?? tc("session")}
      dateLabel={new Date(log.completed_at).toLocaleString(intlTag(locale), {
        weekday: "long",
        day: "numeric",
        month: "long",
        hour: "2-digit",
        minute: "2-digit",
      })}
      feedback={
        sessionFeedback
          ? { pain_score: sessionFeedback.pain_score as number, notes: (sessionFeedback.notes as string | null) ?? null }
          : null
      }
      exercises={exercises}
      back={back}
    />
  );
}
