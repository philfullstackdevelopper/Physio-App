import { redirect } from "next/navigation";
import HistoriqueDetailView from "./HistoriqueDetailView";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import { getTierBilling } from "@/lib/billing/context";
import { formatHistoryDay, historyDaysVisibleFor } from "@/lib/patient/historyWindow";

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
}: {
  params: Promise<{ logId: string }>;
}) {
  const { logId } = await params;
  const supabase = await createClient();
  const user = await requireUser(supabase);

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

  // Même fenêtre que la liste (lib/patient/historyWindow.ts) : en Essentiel,
  // une séance au-delà des N derniers jours avec séance est verrouillée — la
  // liste la grisait, mais son URL restait ouvrable ici (Philippe, 2026-10-07).
  const historyDaysVisible = historyDaysVisibleFor((await getTierBilling(supabase, user.id)).subPlan);
  if (historyDaysVisible !== null) {
    const { data: newer } = await supabase
      .from("workout_logs")
      .select("completed_at")
      .eq("patient_id", user.id)
      .gte("completed_at", log.completed_at)
      .order("completed_at", { ascending: false })
      .limit(200);
    const thisDay = formatHistoryDay(log.completed_at);
    const daysBefore = new Set((newer ?? []).map((l) => formatHistoryDay(l.completed_at as string)));
    daysBefore.delete(thisDay);
    // Liste tronquée (200 séances, comme la page Historique) : le jour est
    // forcément hors fenêtre.
    if ((newer?.length ?? 0) >= 200 || daysBefore.size >= historyDaysVisible) redirect("/patient/historique");
  }

  // Feedback recorded for THIS specific session, not just "around that time" —
  // linked by workout_log_id (older sessions predating that link show none).
  const { data: sessionFeedback } = await supabase
    .from("patient_feedback")
    .select("pain_score, notes")
    .eq("workout_log_id", logId)
    .maybeSingle();

  const exercises = [...(log.workouts?.workout_exercises ?? [])].sort((a, b) => a.position - b.position);

  return (
    <HistoriqueDetailView
      name={log.workouts?.name ?? "Séance"}
      dateLabel={new Date(log.completed_at).toLocaleString("fr-FR", {
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
      exercises={exercises.map((we) => we.exercises?.name ?? "Exercice")}
    />
  );
}
