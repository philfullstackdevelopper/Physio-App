import { redirect } from "next/navigation";
import HistoriqueDetailView from "./HistoriqueDetailView";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";

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
