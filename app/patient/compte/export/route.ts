import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";

// RGPD droit d'accès / à la portabilité: a patient downloads everything
// EasyPhysio holds about them, as one JSON file. Extend this as new
// patient-owned tables are added — it's a flat list of "select * where
// patient_id/id = me", nothing clever.
export async function GET() {
  const supabase = await createClient();
  const user = await requireUser(supabase);

  const [profile, patientRow, feedback, recommendedWorkouts, workoutLogs, documents, messages] =
    await Promise.all([
      supabase.from("patient_profiles").select("*").eq("id", user.id).maybeSingle(),
      supabase.from("patients").select("*").eq("id", user.id).maybeSingle(),
      supabase.from("patient_feedback").select("*").eq("patient_id", user.id),
      supabase.from("patient_recommended_workouts").select("*").eq("patient_id", user.id),
      supabase.from("workout_logs").select("*").eq("patient_id", user.id),
      // File names/paths only — not the file bytes themselves.
      supabase
        .from("patient_documents")
        .select("id, file_name, uploaded_at")
        .eq("patient_id", user.id),
      supabase.from("patient_messages").select("*").eq("patient_id", user.id),
    ]);

  const payload = {
    exported_at: new Date().toISOString(),
    account_email: user.email,
    profile: profile.data,
    patient_record: patientRow.data,
    feedback: feedback.data,
    recommended_workouts: recommendedWorkouts.data,
    workout_logs: workoutLogs.data,
    documents: documents.data,
    messages: messages.data,
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="physio-app-mes-donnees-${user.id}.json"`,
    },
  });
}
