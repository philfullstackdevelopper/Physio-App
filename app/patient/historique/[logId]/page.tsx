import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, CheckCircle2 } from "lucide-react";
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
  const [{ data: sessionFeedback }, { data: exerciseFeedback }] = await Promise.all([
    supabase.from("patient_feedback").select("pain_score, notes").eq("workout_log_id", logId).maybeSingle(),
    supabase.from("exercise_feedback").select("exercise_name, difficulty, notes").eq("workout_log_id", logId),
  ]);

  const exercises = [...(log.workouts?.workout_exercises ?? [])].sort((a, b) => a.position - b.position);
  const feedbackByExercise = new Map((exerciseFeedback ?? []).map((f) => [f.exercise_name as string, f]));
  const hasFeedback = !!sessionFeedback || (exerciseFeedback ?? []).length > 0;

  return (
    <main className="min-h-screen p-6 sm:p-8">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/patient/historique"
          className="flex items-center gap-1 text-sm text-slate-500 hover:underline"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={2} />
          Historique
        </Link>

        <h1 className="font-display mt-3 text-2xl font-semibold text-slate-900">
          {log.workouts?.name ?? "Séance"}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {new Date(log.completed_at).toLocaleString("fr-FR", {
            weekday: "long",
            day: "numeric",
            month: "long",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>

        {sessionFeedback && (
          <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 pl-3.5 border-l-2 border-l-blue-600">
            <p className="text-sm font-medium text-slate-900">
              Douleur ressentie : {sessionFeedback.pain_score}/10
            </p>
            {sessionFeedback.notes && (
              <p className="mt-1 text-sm text-slate-600">« {sessionFeedback.notes} »</p>
            )}
          </div>
        )}

        <h2 className="mt-6 text-sm font-medium text-slate-700">Exercices réalisés</h2>
        <ol className="mt-3 space-y-2">
          {exercises.map((we, i) => {
            const name = we.exercises?.name ?? "Exercice";
            const fb = feedbackByExercise.get(name);
            return (
              <li
                key={i}
                className="flex items-start gap-3 rounded-xl border border-slate-100 bg-white p-4 shadow-sm"
              >
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" strokeWidth={2} />
                <div className="flex-1">
                  <p className="font-medium text-slate-900">{name}</p>
                  {fb?.difficulty != null && (
                    <p className="mt-0.5 text-xs text-slate-500">Difficulté ressentie : {fb.difficulty}/10</p>
                  )}
                  {fb?.notes && <p className="mt-0.5 text-xs text-slate-500">« {fb.notes} »</p>}
                </div>
              </li>
            );
          })}
        </ol>

        {!hasFeedback && (
          <p className="mt-6 text-center text-xs text-slate-400">
            Aucun ressenti enregistré pour cette séance.
          </p>
        )}
      </div>
    </main>
  );
}
