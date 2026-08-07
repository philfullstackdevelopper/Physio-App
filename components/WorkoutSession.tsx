"use client";

// =============================================================================
// WorkoutSession — step-by-step guided session for one workout.
// For each exercise:  intro → demo video → guided camera → celebration.
// Ends with a final celebration and logs the completed workout.
// =============================================================================

import { useState } from "react";
import Link from "next/link";
import { Trophy, Flame, CheckCircle2, PartyPopper, Lightbulb, RotateCcw, Video, Check } from "lucide-react";
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
  "Continue comme ça !",
  "Superbe !",
  "Tu gères !",
  "Impressionnant !",
];

// Coarse difficulty scale for the end-of-session recap — five labelled levels
// instead of 1-10 buttons repeated per exercise, which got cluttered fast.
// Values still line up with the adaptation engine's 1-10 thresholds.
const DIFFICULTY_LEVELS: { value: number; label: string }[] = [
  { value: 2, label: "Très facile" },
  { value: 4, label: "Facile" },
  { value: 5, label: "Normal" },
  { value: 8, label: "Difficile" },
  { value: 10, label: "Très difficile" },
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
  // Intensity the patient actually chose for this exercise (-2..+2, 0 = as prescribed).
  const [exLevel, setExLevel] = useState(0);
  // Intensity level per exercise, captured automatically as each one finishes.
  const [intensityByExercise, setIntensityByExercise] = useState<Record<string, number>>({});
  // Per-exercise feeling, filled in on the end-of-session recap (optional, per exercise) —
  // no longer asked between exercises, to keep the workout's rhythm.
  const [perExerciseFeedback, setPerExerciseFeedback] = useState<
    Record<string, { difficulty: number | null; note: string }>
  >({});
  const [perExerciseOpen, setPerExerciseOpen] = useState<Record<string, boolean>>({});

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

  // Non-binding adaptation suggestion for a given exercise, computed on demand
  // from whatever difficulty the patient enters on the end-of-session recap.
  const suggestionFor = (name: string) => {
    const difficulty = perExerciseFeedback[name]?.difficulty;
    if (difficulty == null) return null;
    const decided = effectiveGoalReps(prescription.goalReps, repOverrides[name]);
    const eased = autoEaseGoalReps(decided, recentDifficulty[name] ?? []);
    return suggestAdaptation({
      difficulty,
      goalReps: eased.goalReps,
      candidates: exercises
        .filter((e) => e.name !== name && categoryFor(e.name) === categoryFor(name))
        .map((e) => e.name),
    });
  };

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
      const supabase = createClient();
      await supabase.from("patient_feedback").insert({
        patient_id: patientId,
        workout_id: workoutId,
        pain_score: pain,
        notes: note.trim() || null,
        completed: true,
      });
      // One row per exercise that has something worth recording: a rating, a
      // note, or an intensity the patient actually changed. Sent all together
      // at session end now, instead of one round-trip per exercise.
      await Promise.all(
        exercises.map(async (e) => {
          const fb = perExerciseFeedback[e.name];
          const intensity = intensityByExercise[e.name] ?? 0;
          if (fb?.difficulty == null && !fb?.note?.trim() && intensity === 0) return;
          const row = {
            patient_id: patientId,
            workout_id: workoutId,
            exercise_name: e.name,
            difficulty: fb?.difficulty ?? null,
            notes: fb?.note?.trim() || null,
          };
          // Supabase returns an error object rather than throwing, so a missing
          // column would silently swallow the whole row. Try with the new
          // column; if migration 0012 has not been run yet, fall back.
          const { error } = await supabase
            .from("exercise_feedback")
            .insert({ ...row, intensity_level: intensity });
          if (error) {
            await supabase.from("exercise_feedback").insert(row);
          }
        }),
      );
      setFbSent(true);
    } catch {
      /* non-blocking */
    } finally {
      setFbBusy(false);
    }
  };

  const onExerciseDone = () => setPhase("celebrate");

  const redo = () => {
    setExLevel(0);
    setPhase("camera"); // restart the same exercise from the guided step
  };

  const next = () => {
    setIntensityByExercise((m) => ({ ...m, [current.name]: exLevel }));
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
        <Trophy className="mx-auto h-14 w-14 text-amber-500" strokeWidth={1.5} />
        <h2 className="font-display mt-4 text-3xl font-semibold text-slate-900">
          Séance terminée !
        </h2>
        <p className="mt-2 text-slate-600">
          Bravo, vous avez complété les {total} exercices de « {workoutName} ».
        </p>
        <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-orange-50 px-4 py-1.5 text-sm font-semibold text-orange-600">
          <Flame className="h-4 w-4" strokeWidth={2} />
          {streak && streak > 0
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
            <div className="mt-5 border-t border-slate-200 pt-4">
              <p className="text-sm font-medium text-slate-800">Vos exercices</p>
              <p className="text-xs text-slate-500">
                Une note ou une difficulté pour un exercice en particulier, si besoin (optionnel)
              </p>
              <div className="mt-2 space-y-1.5">
                {exercises.map((e) => {
                  const open = !!perExerciseOpen[e.name];
                  const fb = perExerciseFeedback[e.name];
                  const suggestion = showAdaptation ? suggestionFor(e.name) : null;
                  return (
                    <div key={e.name} className="rounded-xl border border-slate-200 bg-white">
                      <button
                        type="button"
                        onClick={() => setPerExerciseOpen((m) => ({ ...m, [e.name]: !open }))}
                        className="flex w-full items-center justify-between px-3 py-2.5 text-left text-sm font-medium text-slate-700"
                      >
                        <span className="flex items-center gap-2">
                          {e.name}
                          {(fb?.difficulty != null || fb?.note?.trim()) && (
                            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-teal-500" />
                          )}
                        </span>
                        <span className="text-slate-400">{open ? "−" : "+"}</span>
                      </button>
                      {open && (
                        <div className="border-t border-slate-100 px-3 pb-3 pt-2">
                          <div className="flex flex-wrap gap-1.5">
                            {DIFFICULTY_LEVELS.map((lvl) => (
                              <button
                                key={lvl.value}
                                type="button"
                                onClick={() =>
                                  setPerExerciseFeedback((m) => ({
                                    ...m,
                                    [e.name]: {
                                      difficulty: m[e.name]?.difficulty === lvl.value ? null : lvl.value,
                                      note: m[e.name]?.note ?? "",
                                    },
                                  }))
                                }
                                className={`rounded-full px-3 py-1 text-xs font-medium ${
                                  fb?.difficulty === lvl.value
                                    ? "bg-teal-600 text-white"
                                    : "border border-slate-300 text-slate-600 hover:bg-slate-100"
                                }`}
                              >
                                {lvl.label}
                              </button>
                            ))}
                          </div>
                          <textarea
                            value={fb?.note ?? ""}
                            onChange={(ev) =>
                              setPerExerciseFeedback((m) => ({
                                ...m,
                                [e.name]: { difficulty: m[e.name]?.difficulty ?? null, note: ev.target.value },
                              }))
                            }
                            rows={2}
                            placeholder="Une douleur, une gêne… (optionnel)"
                            className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900"
                          />
                          {suggestion && suggestion.direction !== "none" && (
                            <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-amber-50 p-2 text-xs text-amber-900">
                              <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
                              {suggestion.direction === "easier"
                                ? "Cet exercice vous a paru difficile — vous pourriez réduire l'intensité la prochaine fois."
                                : "Cet exercice vous a paru facile — vous pourriez augmenter l'intensité la prochaine fois."}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <button
              onClick={saveFeeling}
              disabled={pain == null || fbBusy}
              className="mt-4 w-full rounded-lg bg-teal-600 py-2.5 font-medium text-white hover:bg-teal-700 disabled:opacity-50"
            >
              {fbBusy ? "Envoi…" : "Envoyer à mon kiné"}
            </button>
          </div>
        ) : (
          <p className="mt-6 flex items-center justify-center gap-1.5 rounded-lg bg-teal-50 p-3 text-sm font-medium text-teal-700">
            <CheckCircle2 className="h-4 w-4 shrink-0" strokeWidth={1.75} />
            Merci ! Votre ressenti a été transmis à votre kiné
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
          <PartyPopper className="mx-auto h-12 w-12 text-teal-600" strokeWidth={1.5} />
          <h2 className="font-display mt-3 text-2xl font-semibold text-slate-900">
            {CHEERS[idx % CHEERS.length]}
          </h2>
          <p className="mt-1 text-slate-600">« {current.name} » terminé.</p>
          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-orange-50 px-4 py-1.5 text-sm font-semibold text-orange-600">
            <Flame className="h-4 w-4" strokeWidth={2} />
            {idx + 1} d&apos;affilée
          </div>

          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <button
              onClick={redo}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 px-4 py-3 font-medium text-slate-700 hover:bg-slate-50 sm:flex-1"
            >
              <RotateCcw className="h-4 w-4" strokeWidth={1.75} />
              Refaire
            </button>
            <button
              onClick={next}
              className="rounded-xl bg-teal-600 px-4 py-3 font-medium text-white hover:bg-teal-700 sm:flex-1"
            >
              {idx < total - 1 ? "Exercice suivant →" : "Terminer la séance"}
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
                className="mt-6 flex w-full items-center justify-center gap-1.5 rounded-xl bg-teal-600 py-3 font-medium text-white hover:bg-teal-700"
              >
                <Video className="h-4 w-4" strokeWidth={1.75} />
                Je suis prêt, commencer
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
                className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                <Check className="h-4 w-4" strokeWidth={1.75} />
                J&apos;ai terminé cet exercice
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
