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
import { categoryFor } from "@/lib/exercise/category";
import { suggestAdaptation } from "@/lib/exercise/adaptation";
import { effectiveGoalReps, type RepOverrideMap } from "@/lib/exercise/overrides";
import { autoEaseGoalReps } from "@/lib/exercise/autoEase";
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
  repOverrides = {},
  recentDifficulty = {},
  showAdaptation = true,
  maxIntensityLevel,
}: {
  workoutId: string;
  patientId: string;
  workoutName: string;
  exercises: SessionExercise[];
  prescription: Prescription;
  /** Instructor decisions, per exercise name. Absent = standard prescription. */
  repOverrides?: RepOverrideMap;
  /** Recent 1-10 difficulty ratings, per exercise name. Drives automatic easing. */
  recentDifficulty?: Record<string, number[]>;
  /** Premium feature: show the adaptation suggestion (trial/subscribed only). */
  showAdaptation?: boolean;
  /** Highest intensity this patient may select, from maxLevelFor(). 0 = ease only. */
  maxIntensityLevel?: number;
}) {
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>("intro");
  const [streak, setStreak] = useState<number | null>(null);
  // End-of-session feeling capture.
  const [pain, setPain] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [fbSent, setFbSent] = useState(false);
  const [fbBusy, setFbBusy] = useState(false);
  // Optional per-exercise feeling, captured on the celebration screen.
  const [exDiff, setExDiff] = useState<number | null>(null);
  const [exNote, setExNote] = useState("");
  // Intensity the patient actually chose for this exercise (-2..+2, 0 = as prescribed).
  const [exLevel, setExLevel] = useState(0);

  const total = exercises.length;
  const current = exercises[idx];

  // The prescription THIS exercise runs under, composed in three steps:
  //   1. the standard prescription from the patient's profile and stage,
  //   2. the instructor's stored decision, if any — which effectiveGoalReps()
  //      refuses to honour when it was an increase decided before a regression,
  //   3. automatic easing from the patient's own recent ratings, which can only
  //      ever lower the result.
  // Softening therefore happens with or without the instructor. Hardening never
  // happens without them.
  const decided = current
    ? effectiveGoalReps(prescription.goalReps, repOverrides[current.name])
    : prescription.goalReps;
  const autoEased = current
    ? autoEaseGoalReps(decided, recentDifficulty[current.name] ?? [])
    : { goalReps: decided, eased: false, reason: "" };
  const currentPrescription: Prescription = current
    ? { ...prescription, goalReps: autoEased.goalReps }
    : prescription;

  // From the just-entered feeling, a non-binding adaptation suggestion. Candidate
  // substitutes = other exercises of the same body area in this workout.
  const suggestion =
    current && exDiff != null
      ? suggestAdaptation({
          difficulty: exDiff,
          goalReps: currentPrescription.goalReps,
          candidates: exercises
            .filter((e) => e.name !== current.name && categoryFor(e.name) === categoryFor(current.name))
            .map((e) => e.name),
        })
      : null;

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

  // Save the optional per-exercise feeling, together with the intensity the
  // patient actually worked at. Skipped when they left everything blank AND ran
  // the exercise exactly as prescribed — there is then nothing to record.
  const saveExerciseFeedback = async () => {
    if (exDiff == null && !exNote.trim() && exLevel === 0) return;
    const supabase = createClient();
    const row = {
      patient_id: patientId,
      workout_id: workoutId,
      exercise_name: current.name,
      difficulty: exDiff,
      notes: exNote.trim() || null,
    };
    // Supabase returns an error object rather than throwing, so a missing column
    // would silently swallow the whole rating. Try with the new column; if
    // migration 0012 has not been run yet, fall back to the row without it.
    const { error } = await supabase
      .from("exercise_feedback")
      .insert({ ...row, intensity_level: exLevel });
    if (error) {
      await supabase.from("exercise_feedback").insert(row);
    }
  };

  const redo = () => {
    setExDiff(null);
    setExNote("");
    setExLevel(0);
    setPhase("camera"); // restart the same exercise from the guided step
  };

  const next = async () => {
    await saveExerciseFeedback();
    setExDiff(null);
    setExNote("");
    setExLevel(0);
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

          {/* Optional per-exercise feeling → richer data to tune future programs. */}
          <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-left">
            <p className="text-sm font-medium text-slate-800">
              Comment s&apos;est passé cet exercice ?{" "}
              <span className="font-normal text-slate-400">(optionnel)</span>
            </p>
            <p className="text-xs text-slate-500">Difficulté ressentie (1 = très facile, 10 = très difficile)</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  onClick={() => setExDiff(exDiff === n ? null : n)}
                  className={`h-9 w-9 rounded-full text-sm font-medium ${
                    exDiff === n
                      ? "bg-teal-600 text-white"
                      : "border border-slate-300 bg-white text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            <textarea
              value={exNote}
              onChange={(e) => setExNote(e.target.value)}
              rows={2}
              placeholder="Une douleur, une gêne, un ressenti… (optionnel)"
              className="mt-3 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900"
            />
          </div>

          {showAdaptation && suggestion && suggestion.direction !== "none" && (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-left text-sm text-amber-900">
              <p className="font-medium">
                💡{" "}
                {suggestion.direction === "easier"
                  ? "Cet exercice vous a paru difficile."
                  : "Cet exercice vous a paru facile."}
              </p>
              <p className="mt-1">La prochaine fois, vous pourriez :</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5">
                {suggestion.newReps && (
                  <li>
                    {suggestion.direction === "easier" ? "réduire" : "augmenter"} à{" "}
                    {suggestion.newReps} répétitions (au lieu de {suggestion.currentReps})
                  </li>
                )}
                {suggestion.substitute && <li>essayer « {suggestion.substitute} »</li>}
              </ul>
              <p className="mt-1 text-amber-700">Parlez-en à votre kiné si besoin.</p>
            </div>
          )}

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <button
              onClick={redo}
              className="rounded-xl border border-slate-300 px-4 py-3 font-medium text-slate-700 hover:bg-slate-50 sm:flex-1"
            >
              🔁 Refaire
            </button>
            <button
              onClick={next}
              className="rounded-xl bg-teal-600 px-4 py-3 font-medium text-white hover:bg-teal-700 sm:flex-1"
            >
              {idx < total - 1 ? "Exercice suivant →" : "Terminer la séance 🏆"}
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-teal-600">
            Exercice {idx + 1}
          </p>
          <h2 className="font-display mt-1 text-2xl font-semibold text-slate-900">
            {current.name}
          </h2>

          {/* A shorter series than usual is not a bug — say why, gently. */}
          {autoEased.eased && (
            <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Série allégée à <span className="font-semibold">{autoEased.goalReps} répétitions</span>{" "}
              — vous avez trouvé cet exercice difficile récemment. Écoutez votre corps, et parlez-en
              à votre praticien.
            </p>
          )}

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
                prescription={currentPrescription}
                analyzer={analyzerForExercise(current.name)}
                onComplete={onExerciseDone}
                onLevelChange={setExLevel}
                exerciseName={current.name}
                instructions={current.instructions}
                maxLevel={maxIntensityLevel}
              />
              <button
                // Finishing by hand: no rep count, and the dial keeps whatever
                // the patient last set — never the click event.
                onClick={() => onExerciseDone()}
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
