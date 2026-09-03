"use client";

// =============================================================================
// WorkoutSession — step-by-step guided session for one workout.
// For each exercise: one clear screen (demo + instructions) → celebration.
// Ends with a final celebration and logs the completed workout.
// =============================================================================

import { useRef, useState } from "react";
import Link from "next/link";
import { Flame, CheckCircle2, Check, Play, Pause } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Prescription } from "@/lib/exercise/prescription";
import { fetchStreak } from "@/lib/exercise/streak";
import { getYoutubeEmbedId, isVideoFileUrl, isImageFileUrl } from "@/lib/exercise/media";
import { parseSteps } from "@/lib/exercise/steps";
import ExerciseIllustration from "@/components/ExerciseIllustration";

export interface SessionExercise {
  name: string;
  instructions: string | null;
  mediaUrl: string | null;
  /** Where in the clip the movement actually starts — skip any intro. */
  mediaStartSeconds?: number;
}

type Phase = "exercise" | "celebrate" | "finished";

/** A self-hosted demo clip: loops automatically so the movement is always
 *  visible, with one custom play/pause control (Physitrack-style) instead of
 *  the raw browser control bar. Autoplay requires the clip to start muted.
 *  Skips straight to `startSeconds` (past any intro) and loops that segment
 *  — native `loop` would replay from 0, so looping is handled by hand. */
function VideoDemo({ url, name, startSeconds = 0 }: { url: string; name: string; startSeconds?: number }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(true);
  // A clip that fails to load (mislink, deleted file) must degrade to the
  // illustration rather than sit as a black unplayable player.
  const [failed, setFailed] = useState(false);

  const seekToStart = () => {
    const v = videoRef.current;
    if (v && startSeconds > 0) v.currentTime = startSeconds;
  };

  const toggle = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play();
      setPlaying(true);
    } else {
      v.pause();
      setPlaying(false);
    }
  };

  if (failed) {
    return <IllustrationDemo name={name} />;
  }

  return (
    <div className="relative">
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        onError={() => setFailed(true)}
        onLoadedMetadata={seekToStart}
        onEnded={(e) => {
          const v = e.currentTarget;
          v.currentTime = startSeconds;
          v.play();
        }}
        className="aspect-video w-full rounded-xl bg-black object-cover"
        src={url}
      />
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? "Mettre en pause" : "Lire la vidéo"}
        className="absolute bottom-3 right-3 flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white shadow-sm transition hover:bg-black/75"
      >
        {playing ? (
          <Pause className="h-4 w-4" strokeWidth={2} fill="currentColor" />
        ) : (
          <Play className="ml-0.5 h-4 w-4" strokeWidth={2} fill="currentColor" />
        )}
      </button>
    </div>
  );
}

/** Text-only visual: the line-art illustration, framed like a player would be
 *  so the screen keeps its shape whether or not a clip exists yet. */
function IllustrationDemo({ name }: { name: string }) {
  return (
    <div className="flex aspect-video w-full items-center justify-center rounded-xl border border-slate-200 bg-slate-50">
      <ExerciseIllustration name={name} className="h-40 w-56 text-blue-600" />
    </div>
  );
}

/** The exercise's visual demonstration: a video/image if we have one, otherwise
 *  a clean line-art illustration. Purely visual — instructions render separately.
 *  Anything that isn't a recognizable video/image link (e.g. a stray search-page
 *  URL) falls back to the illustration rather than showing a broken embed. */
function Demo({ url, name, startSeconds = 0 }: { url: string | null; name: string; startSeconds?: number }) {
  if (url) {
    const ytId = getYoutubeEmbedId(url);
    if (ytId) {
      return (
        <iframe
          className="aspect-video w-full rounded-xl"
          src={`https://www.youtube.com/embed/${ytId}?autoplay=1&mute=1&loop=1&playlist=${ytId}&start=${startSeconds}`}
          title="Démonstration"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      );
    }
    // Same extensions the overview list and ExerciseVideoUpload produce —
    // phone-filmed clips are often .mov/.m4v.
    if (isVideoFileUrl(url)) {
      return <VideoDemo key={url} url={url} name={name} startSeconds={startSeconds} />;
    }
    if (isImageFileUrl(url)) {
      // eslint-disable-next-line @next/next/no-img-element
      return <img src={url} alt="Démonstration" className="w-full rounded-xl" />;
    }
  }

  return <IllustrationDemo name={name} />;
}

/** Numbered "how to" steps parsed from the exercise's instructions, plus the
 *  session goal. Always visible — the demonstration is the point of this
 *  screen, not something to hunt for behind a toggle. */
function HowTo({ instructions, goalText }: { instructions: string | null; goalText: string }) {
  const steps = parseSteps(instructions);
  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-sm text-slate-700">
        Objectif : <span className="font-semibold">{goalText}</span>
      </p>
      {steps.length > 0 ? (
        <ol className="mt-3 space-y-2">
          {steps.map((s, i) => (
            <li key={i} className="flex gap-2 text-sm text-slate-700">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">
                {i + 1}
              </span>
              <span>{s}</span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-2 text-sm text-slate-500">Allez-y doucement, sans forcer.</p>
      )}
      <p className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-500">
        Une douleur vive ? Arrêtez-vous et parlez-en à votre praticien.
      </p>
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
  const [phase, setPhase] = useState<Phase>("exercise");
  // Brief press-feedback on the "done" button before the phase switches to
  // celebrate — without this, the animation would never be visible since the
  // button unmounts the instant onExerciseDone fires.
  const [completing, setCompleting] = useState(false);
  const [streak, setStreak] = useState<number | null>(null);
  // The workout_logs row id for THIS completed session, once saved — lets the
  // end-of-session feedback link to exactly this session (not a guess by
  // timestamp), so the patient's history can show what they felt for it.
  const [logId, setLogId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState(false);
  // End-of-session feeling capture — the only feedback this app collects.
  const [pain, setPain] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [fbSent, setFbSent] = useState(false);
  const [fbBusy, setFbBusy] = useState(false);

  const total = exercises.length;
  const current = exercises[idx];
  const goalText = `${prescription.goalSets} séries × ${prescription.goalReps} répétitions`;

  const finish = async () => {
    // Log the completed workout (RLS: patient can insert their own logs),
    // then recompute the daily streak to celebrate it. A failed insert must
    // NOT show the success celebration — the patient needs to know their
    // session wasn't actually recorded, and can retry.
    setSaveError(false);
    try {
      const supabase = createClient();
      const { data: log, error } = await supabase
        .from("workout_logs")
        .insert({ patient_id: patientId, workout_id: workoutId })
        .select("id")
        .single();
      if (error || !log) throw error ?? new Error("insert failed");
      setLogId(log.id as string);
      setStreak(await fetchStreak(supabase, patientId));
    } catch {
      setSaveError(true);
    }
    setPhase("finished");
  };

  const [fbError, setFbError] = useState(false);

  const saveFeeling = async () => {
    if (pain == null) return;
    setFbBusy(true);
    setFbError(false);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("patient_feedback").insert({
        patient_id: patientId,
        workout_id: workoutId,
        workout_log_id: logId,
        pain_score: pain,
        notes: note.trim() || null,
        completed: true,
      });
      if (error) throw error;
      setFbSent(true);
    } catch {
      setFbError(true);
    } finally {
      setFbBusy(false);
    }
  };

  const onExerciseDone = () => {
    if (completing) return;
    // Skip the visual hold for patients who've asked for reduced motion —
    // the tap itself is still the confirmation.
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      setPhase("celebrate");
      return;
    }
    setCompleting(true);
    setTimeout(() => setPhase("celebrate"), 180);
  };

  const next = () => {
    if (idx < total - 1) {
      setIdx(idx + 1);
      setPhase("exercise");
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
    // A failed save must never look like a success — show a clear retry
    // instead of the celebration, or the patient (and their kiné) would
    // wrongly believe this session counted.
    if (saveError) {
      return (
        <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h2 className="font-display mt-2 text-2xl font-semibold text-slate-900">
            La séance n&apos;a pas été enregistrée
          </h2>
          <p className="mt-2 text-slate-600">
            Vérifiez votre connexion et réessayez — vos exercices ne sont pas perdus.
          </p>
          <button
            onClick={finish}
            className="mt-6 w-full rounded-xl bg-blue-600 px-4 py-3 font-medium text-white hover:bg-blue-700"
          >
            Réessayer
          </button>
          <Link
            href="/patient"
            className="mt-3 block rounded-xl border border-slate-300 py-3 font-medium text-slate-700 hover:bg-slate-50"
          >
            Retour à l&apos;accueil
          </Link>
        </div>
      );
    }
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border-2 border-blue-600">
          <Check className="h-7 w-7 text-blue-600" strokeWidth={2.5} />
        </div>
        <h2 className="font-display mt-4 text-2xl font-semibold text-slate-900">
          Séance terminée
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          {total} exercice{total > 1 ? "s" : ""} complété{total > 1 ? "s" : ""} — « {workoutName} »
        </p>
        {streak != null && streak > 0 && (
          <div className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-900">
            <Flame className="h-4 w-4 text-blue-600" strokeWidth={2} />
            {streak} jour{streak > 1 ? "s" : ""} d&apos;affilée
          </div>
        )}

        {/* Post-session feeling → helps the physio recalibrate */}
        {!fbSent ? (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 text-left">
            <p className="text-sm font-medium text-slate-800">Comment vous sentez-vous ?</p>
            <p className="text-xs text-slate-500">Votre douleur du moment (1 = aucune, 10 = très forte)</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  onClick={() => setPain(n)}
                  className={`h-9 w-9 rounded-full text-sm font-medium ${
                    pain === n
                      ? "bg-blue-600 text-white"
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
            {fbError && (
              <p className="mt-3 text-sm text-red-700">
                L&apos;envoi a échoué. Vérifiez votre connexion et réessayez.
              </p>
            )}
            <button
              onClick={saveFeeling}
              disabled={pain == null || fbBusy}
              className="mt-4 w-full rounded-lg bg-blue-600 py-2.5 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {fbBusy ? "Envoi…" : "Envoyer à mon kiné"}
            </button>
          </div>
        ) : (
          <p className="mt-6 flex items-center justify-center gap-1.5 text-sm font-medium text-slate-700">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-blue-600" strokeWidth={1.75} />
            Ressenti transmis à votre kiné
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
                i < idx || (i === idx && phase === "celebrate") ? "bg-blue-500" : i === idx ? "bg-blue-200" : "bg-slate-200"
              }`}
            />
          ))}
        </div>
        <span className="text-xs font-medium text-slate-400">
          {idx + 1}/{total}
        </span>
      </div>

      {/* ---- Between exercises ---- */}
      {phase === "celebrate" ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border-2 border-blue-600">
            <Check className="h-6 w-6 text-blue-600" strokeWidth={2.5} />
          </div>
          <h2 className="font-display mt-3 text-xl font-semibold text-slate-900">
            {current.name}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Exercice {idx + 1} sur {total} terminé
          </p>

          <button
            onClick={next}
            className="mt-6 w-full rounded-xl bg-blue-600 px-4 py-3 font-medium text-white hover:bg-blue-700"
          >
            {idx < total - 1 ? "Exercice suivant →" : "Terminer la séance"}
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-blue-600">
            Exercice {idx + 1}
          </p>
          <h2 className="font-display mt-1 text-2xl font-semibold text-slate-900">
            {current.name}
          </h2>

          <div className="mt-4">
            <Demo url={current.mediaUrl} name={current.name} startSeconds={current.mediaStartSeconds ?? 0} />
          </div>

          <HowTo instructions={current.instructions} goalText={goalText} />

          <button
            onClick={onExerciseDone}
            disabled={completing}
            className={`mt-6 flex w-full items-center justify-center gap-1.5 rounded-xl py-4 text-lg font-semibold text-white transition-transform duration-150 ease-out motion-reduce:transition-none ${
              completing ? "scale-95 bg-blue-700" : "scale-100 bg-blue-600 hover:bg-blue-700"
            }`}
          >
            <Check className="h-5 w-5" strokeWidth={1.75} />
            J&apos;ai terminé cet exercice
          </button>
        </div>
      )}
    </div>
  );
}
