import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";

// RGPD droit d'accès / à la portabilité: a patient downloads everything
// EasyPhysio holds about them, as one JSON file. Extend this as new
// patient-owned tables are added — it's a flat list of "select * where
// patient_id/id = me", nothing clever.
// Lecture par pages de 1000 lignes (audit du 2026-10-08) : si PostgREST
// limite le nombre de lignes par réponse (réglage db-max-rows du serveur),
// une seule requête rendait un export incomplet SANS erreur.
const PAGE = 1000;
async function readAll(
  page: (from: number, to: number) => PromiseLike<{ data: unknown[] | null; error: unknown }>,
): Promise<{ data: unknown[] | null; error: unknown }> {
  const rows: unknown[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await page(from, from + PAGE - 1);
    if (error) return { data: null, error };
    rows.push(...(data ?? []));
    if ((data ?? []).length < PAGE) return { data: rows, error: null };
  }
}

export async function GET() {
  const supabase = await createClient();
  const user = await requireUser(supabase);

  const [profile, patientRow, feedback, recommendedWorkouts, workoutLogs, messages, subscription, personalWorkouts] =
    await Promise.all([
      supabase.from("patient_profiles").select("*").eq("id", user.id).maybeSingle(),
      supabase.from("patients").select("*").eq("id", user.id).maybeSingle(),
      readAll((a, b) => supabase.from("patient_feedback").select("*").eq("patient_id", user.id).order("created_at").range(a, b)),
      readAll((a, b) => supabase.from("patient_recommended_workouts").select("*").eq("patient_id", user.id).order("week_start_date").range(a, b)),
      readAll((a, b) => supabase.from("workout_logs").select("*").eq("patient_id", user.id).order("completed_at").range(a, b)),
      readAll((a, b) => supabase.from("patient_messages").select("*").eq("patient_id", user.id).order("created_at").range(a, b)),
      // Ajoutés le 2026-10-07 (audit) : l'abonnement, et les séances
      // « Ajuster la séance » copiées spécialement pour ce patient (0044).
      supabase.from("subscriptions").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("workouts").select("*, workout_exercises ( * )").eq("patient_id", user.id),
    ]);

  // Une requête en échec ne doit pas apparaître comme « aucune donnée » dans
  // un export RGPD : on refuse plutôt l'export, le patient peut réessayer.
  const failed = [profile, patientRow, feedback, recommendedWorkouts, workoutLogs, messages, subscription, personalWorkouts].some(
    (r) => r.error,
  );
  if (failed) {
    return new NextResponse("L'export de vos données a échoué. Merci de réessayer dans quelques instants.", {
      status: 500,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const payload = {
    exported_at: new Date().toISOString(),
    account_email: user.email,
    profile: profile.data,
    patient_record: patientRow.data,
    feedback: feedback.data,
    recommended_workouts: recommendedWorkouts.data,
    personal_workouts: personalWorkouts.data,
    workout_logs: workoutLogs.data,
    messages: messages.data,
    subscription: subscription.data,
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="easyphysio-mes-donnees-${user.id}.json"`,
    },
  });
}
