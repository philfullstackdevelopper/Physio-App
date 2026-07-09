"use client";

// =============================================================================
// WorkoutSession — step-by-step guided session for one workout.
// For each exercise:  intro → demo video → guided camera → celebration.
// Ends with a final celebration and logs the completed workout.
// =============================================================================

import { useState } from "react";
import Link from "next/link";
import PoseTracker from "@/components/PoseTracker";
import { createClient } from "@/lib/supabase/client";
import type { Prescription } from "@/lib/exercise/prescription";
import { analyzerForExercise } from "@/lib/exercise/analyzers";
import { computeStreak } from "@/lib/exercise/streak";
import ExerciseIllustration from "@/components/ExerciseIllustration";

export interface SessionExercise {
  name: string;
  instructions: string | null;
  mediaUrl: string | null;
}

type Phase = "intro" | "demo" | "camera" | "celebrate" | "finished";

const CHEERS = [
  "Excellent travail !",
  "Continue comme ça 💪",
  "Superbe !",
  "Tu gères !",
  "Impressionnant 🔥",
];

/** Render the exercise demonstration: a video/image if we have one, otherwise
 *  a clean illustrated step-by-step card built from the instructions. */
function Demo({
  url,
  name,
  instructions,
}: {
  url: string | null;
  name: string;
  instructions: string | null;
}) {
  if (url) {
    const yt = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([\w-]{11})/);
    if (yt) {
      return (
        <iframe
          className="aspect-video w-full rounded-xl"
          src={`https://www.youtube.com/embed/${yt[1]}`}
          title="Démonstration"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      );
    }
    if (/\.(mp4|webm|ogg)$/i.test(url)) {
      return <video controls className="aspect-video w-full rounded-xl bg-black" src={url} />;
    }
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="Démonstration" className="w-full rounded-xl" />;
  }

  // Fallback: an illustrated "fiche" — a simple schematic + numbered steps.
  const steps = (instructions ?? "")
    .split(/\.\s+/)
    .map((s) => s.trim().replace(/\.$/, ""))
    .filter(Boolean);
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
      <div className="mx-auto flex h-32 items-center justify-center rounded-lg bg-white">
        <ExerciseIllustration name={name} className="h-28 w-44 text-teal-600" />
      </div>
      {steps.length > 0 ? (
        <ol className="mt-4 space-y-2">
          {steps.map((s, i) => (
            <li key={i} className="flex gap-2 text-sm text-slate-700">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-600 text-xs font-semibold text-white">
                {i + 1}
              </span>
              <span>{s}</span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-3 text-center text-sm text-slate-500">Suivez les consignes de l&apos;exercice.</p>
      )}
    </div>
  );
}

export default function WorkoutSession({
  workoutId,
  patientId,
  workoutName,
  exercises,
  prescription,
}: {
  workoutId: string;
  patientId: string;
  workoutName: string;
  exercises: SessionExercise[];
  prescription: Prescription;
}) {
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>("intro");
  const [streak, setStreak] = useState<number | null>(null);
  // End-of-session feeling capture.
  const [pain, setPain] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [fbSent, setFbSent] = useState(false);
  const [fbBusy, setFbBusy] = useState(false);

  const total = exercises.length;
  const current = exercises[idx];

  const finish = async () => {
    // Log the completed workout (RLS: patient can insert their own logs),
    // then recompute the daily streak to celebrate it.
    try {
      const supabase = createClient();
      await supabase.from("workout_logs").insert({ patient_id: patientId, workout_id: workoutId });
      const { data } = await supabase
        .from("workout_logs")
        .select("completed_at")
        .eq("patient_id", patientId)
        .order("completed_at", { ascending: false })
        .limit(400);
      setStreak(computeStreak((data ?? []).map((l) => l.completed_at as string)));
    } catch {
      /* non-blocking — celebration still shows */
    }
    setPhase("finished");
  };

  const saveFeeling = async () => {
    if (pain == null) return;
    setFbBusy(true);
    try {
      await createClient().from("patient_feedback").insert({
        patient_id: patientId,
        workout_id: workoutId,
        pain_score: pain,
        notes: note.trim() || null,
        completed: true,
      });
      setFbSent(true);
    } catch {
      /* non-blocking */
    } finally {
      setFbBusy(false);
    }
  };

  const onExerciseDone = () => setPhase("celebrate");

  const next = () => {
    if (idx < total - 1) {
      setIdx(idx + 1);
      setPhase("intro");
    } else {
      finish();
    }
  };

  if (total === 0) {
    return (
      <p className="text-center text-sm text-slate-500">
        Cette séance ne contient pas encore d&apos;exercices.
      </p>
    );
  }

  // ---- Final celebration --------------------------------------------------
  if (phase === "finished") {
    return (
      <div className="mx-auto max-w-md rounded-3xl border border-teal-100 bg-white p-8 text-center shadow-sm">
        <div className="text-6xl">🏆</div>
        <h2 className="font-display mt-4 text-3xl font-semibold text-slate-900">
          Séance terminée !
        </h2>
        <p className="mt-2 text-slate-600">
          Bravo, vous avez complété les {total} exercices de « {workoutName} ».
        </p>
        <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-orange-50 px-4 py-1.5 text-sm font-semibold text-orange-600">
          🔥 {streak && streak > 0
            ? `${streak} jour${streak > 1 ? "s" : ""} d'affilée`
            : `${total} exercices terminés`}
        </div>

        {/* Post-session feeling → helps the physio recalibrate */}
        {!fbSent ? (
          <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-left">
            <p className="text-sm font-medium text-slate-800">Comment vous sentez-vous ?</p>
            <p className="text-xs text-slate-500">Votre douleur du moment (1 = aucune, 10 = très forte)</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  onClick={() => setPain(n)}
                  className={`h-9 w-9 rounded-full text-sm font-medium ${
                    pain === n
                      ? "bg-teal-600 text-white"
                      : "border border-slate-300 bg-white text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Un mot sur votre ressenti (optionnel)…"
              className="mt-3 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900"
            />
            <button
              onClick={saveFeeling}
              disabled={pain == null || fbBusy}
              className="mt-2 w-full rounded-lg bg-teal-600 py-2.5 font-medium text-white hover:bg-teal-700 disabled:opacity-50"
            >
              {fbBusy ? "Envoi…" : "Envoyer à mon kiné"}
            </button>
          </div>
        ) : (
          <p className="mt-6 rounded-lg bg-teal-50 p-3 text-sm font-medium text-teal-700">
            Merci ! Votre ressenti a été transmis à votre kiné ✅
          </p>
        )}

        <Link
          href="/patient"
          className="mt-4 block rounded-xl border border-slate-300 py-3 font-medium text-slate-700 hover:bg-slate-50"
        >
          Retour à l&apos;accueil
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4">
      {/* Progress header */}
      <div className="flex items-center gap-3">
        <Link href="/patient" className="text-sm text-slate-400 hover:underline">
          Quitter
        </Link>
        <div className="flex flex-1 gap-1.5">
          {exercises.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full ${
                i < idx || (i === idx && phase === "celebrate")
                  ? "bg-teal-500"
                  : i === idx
                    ? "bg-teal-200"
                    : "bg-slate-200"
              }`}
            />
          ))}
        </div>
        <span className="text-xs font-medium text-slate-400">
          {idx + 1}/{total}
        </span>
      </div>

      {/* ---- Celebration between exercises ---- */}
      {phase === "celebrate" ? (
        <div className="rounded-3xl border border-teal-100 bg-white p-8 text-center shadow-sm">
          <div className="text-6xl">🎉</div>
          <h2 className="font-display mt-3 text-2xl font-semibold text-slate-900">
            {CHEERS[idx % CHEERS.length]}
          </h2>
          <p className="mt-1 text-slate-600">« {current.name} » terminé.</p>
          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-orange-50 px-4 py-1.5 text-sm font-semibold text-orange-600">
            🔥 {idx + 1} d&apos;affilée
          </div>
          <button
            onClick={next}
            className="mt-6 w-full rounded-xl bg-teal-600 py-3 font-medium text-white hover:bg-teal-700"
          >
            {idx < total - 1 ? "Exercice suivant →" : "Terminer la séance 🏆"}
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-teal-600">
            Exercice {idx + 1}
          </p>
          <h2 className="font-display mt-1 text-2xl font-semibold text-slate-900">
            {current.name}
          </h2>

          {/* Step 1: explanation */}
          {phase === "intro" && (
            <>
              {current.instructions && (
                <p className="mt-3 text-slate-600">{current.instructions}</p>
              )}
              <button
                onClick={() => setPhase("demo")}
                className="mt-6 w-full rounded-xl bg-teal-600 py-3 font-medium text-white hover:bg-teal-700"
              >
                Voir la démonstration →
              </button>
            </>
          )}

          {/* Step 2: demo video */}
          {phase === "demo" && (
            <>
              <p className="mt-2 text-sm text-slate-500">Regardez, puis à vous de jouer.</p>
              <div className="mt-3">
                <Demo url={current.mediaUrl} name={current.name} instructions={current.instructions} />
              </div>
              <button
                onClick={() => setPhase("camera")}
                className="mt-6 w-full rounded-xl bg-teal-600 py-3 font-medium text-white hover:bg-teal-700"
              >
                🎥 Je suis prêt, commencer
              </button>
            </>
          )}

          {/* Step 3: guided camera */}
          {phase === "camera" && (
            <div className="mt-4">
              <PoseTracker
                key={idx}
                prescription={prescription}
                analyzer={analyzerForExercise(current.name)}
                onComplete={onExerciseDone}
              />
              <button
                onClick={onExerciseDone}
                className="mt-3 w-full rounded-lg border border-slate-300 bg-white py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                J&apos;ai terminé cet exercice ✓
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
