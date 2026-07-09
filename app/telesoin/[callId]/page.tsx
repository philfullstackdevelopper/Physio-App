import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { startOfWeekISO } from "@/lib/week";
import { computeStreak } from "@/lib/exercise/streak";
import VideoCall from "@/components/VideoCall";
import TelesoinDossier, { type DossierData, type DossierExercise } from "@/components/TelesoinDossier";
import { endCall } from "../actions";

export default async function CallPage({ params }: { params: Promise<{ callId: string }> }) {
  const { callId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: call } = await supabase
    .from("video_calls")
    .select("id, kine_id, patient_id, room_name, status")
    .eq("id", callId)
    .maybeSingle();
  if (!call) redirect("/telesoin");

  const isKine = call.kine_id === user.id;
  const isPatient = call.patient_id === user.id;
  if (!isKine && !isPatient) redirect("/telesoin");

  const { data: patient } = await supabase
    .from("patients")
    .select("full_name")
    .eq("id", call.patient_id)
    .maybeSingle();
  const patientName = (patient?.full_name as string) ?? "Patient";
  const displayName = isKine ? "Kiné" : patientName;

  // Build the live dossier for the kiné only.
  let dossier: DossierData | null = null;
  if (isKine) {
    const [{ data: logs }, { data: exFb }, { data: fb }] = await Promise.all([
      supabase.from("workout_logs").select("completed_at").eq("patient_id", call.patient_id),
      supabase
        .from("exercise_feedback")
        .select("exercise_name, difficulty, notes, created_at")
        .eq("patient_id", call.patient_id)
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("patient_feedback")
        .select("pain_score, difficulty, notes, recorded_for")
        .eq("patient_id", call.patient_id)
        .order("recorded_for", { ascending: false })
        .limit(5),
    ]);

    const weekStart = startOfWeekISO();
    const allLogs = logs ?? [];
    const totalSessions = allLogs.length;
    const weekSessions = allLogs.filter((l) => (l.completed_at as string) >= weekStart).length;
    const streak = computeStreak(allLogs.map((l) => l.completed_at as string));

    const map: Record<
      string,
      { name: string; count: number; diffSum: number; diffCount: number; lastNote: string | null }
    > = {};
    for (const r of exFb ?? []) {
      const name = r.exercise_name as string;
      const e = (map[name] ??= { name, count: 0, diffSum: 0, diffCount: 0, lastNote: null });
      e.count += 1;
      if (r.difficulty != null) {
        e.diffSum += r.difficulty as number;
        e.diffCount += 1;
      }
      if (e.lastNote === null && r.notes) e.lastNote = r.notes as string;
    }
    const exercises: DossierExercise[] = Object.values(map)
      .map((e) => ({
        name: e.name,
        count: e.count,
        avgDifficulty: e.diffCount ? e.diffSum / e.diffCount : null,
        lastNote: e.lastNote,
      }))
      .sort((a, b) => (b.avgDifficulty ?? -1) - (a.avgDifficulty ?? -1));

    const recentFeedback = (fb ?? []).map((f) => ({
      recordedFor: f.recorded_for as string,
      pain: f.pain_score as number,
      difficulty: (f.difficulty as number | null) ?? null,
      notes: (f.notes as string | null) ?? null,
    }));
    const avgPain = recentFeedback.length
      ? Math.round((recentFeedback.reduce((s, f) => s + f.pain, 0) / recentFeedback.length) * 10) / 10
      : null;

    dossier = { totalSessions, weekSessions, streak, avgPain, exercises, recentFeedback };
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between gap-3">
          <Link href="/telesoin" className="text-sm text-slate-500 hover:underline">
            ← Télésoin
          </Link>
          {isKine && call.status !== "ended" && (
            <form action={endCall}>
              <input type="hidden" name="call_id" value={call.id as string} />
              <button className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                Terminer l&apos;appel
              </button>
            </form>
          )}
        </div>

        {call.status === "ended" ? (
          <p className="mt-6 rounded-lg bg-slate-100 p-4 text-sm text-slate-600">Cet appel est terminé.</p>
        ) : (
          <div className="mt-4 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
            <VideoCall roomName={call.room_name as string} displayName={displayName} />
            {isKine && dossier ? (
              <TelesoinDossier patientName={patientName} data={dossier} />
            ) : (
              <div className="rounded-xl border border-slate-100 bg-white p-5 text-sm text-slate-600 shadow-sm">
                Vous êtes en appel avec votre kiné. Autorisez la caméra et le micro si votre
                navigateur le demande.
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
