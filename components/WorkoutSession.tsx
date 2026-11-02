"use client";

// =============================================================================
// WorkoutSession — step-by-step guided session for one workout.
// For each exercise: one clear screen (demo + instructions) → celebration.
// Ends with a final celebration and logs the completed workout.
// =============================================================================

import { useRef, useState } from "react";
import Link from "next/link";
import { Flame, CheckCircle2, Check, Play, Repeat2, Dumbbell, Timer, X, ArrowRight, ShieldAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { goalPartsFor, goalTextFor, type GoalParts, type Prescription } from "@/lib/exercise/prescription";
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

/** A self-hosted demo clip of the kiné doing the exercise (Philippe,
 *  2026-10-01): the box first shows the exercise drawing with a big play
 *  button in the middle; the patient taps it and the clip plays — WITHOUT sound
 *  for now (Philippe, 2026-10-31), no autoplay, no endless loop. Tapping the video pauses it;
 *  at the end the play button comes back to watch again. Clips are filmed
 *  upright on a phone, so they're shown whole (object-contain) on black.
 *  `startSeconds` skips any intro. */
function VideoDemo({ url, name, startSeconds = 0 }: { url: string; name: string; startSeconds?: number }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [started, setStarted] = useState(false);
  const [playing, setPlaying] = useState(false);
  // A clip that fails to load (mislink, deleted file) must degrade to the
  // illustration rather than sit as a black unplayable player.
  const [failed, setFailed] = useState(false);
  // Forme de la vidéo (largeur / hauteur), connue au chargement du fichier ;
  // en attendant, 16/9 (même cadre que le dessin).
  const [ratio, setRatio] = useState(16 / 9);
  // Le fichier peut avoir fini de charger ses dimensions AVANT que la page
  // devienne interactive : l'événement « loadedmetadata » est alors manqué.
  // On relit donc les dimensions dès que l'élément vidéo est rattaché.
  const attachVideo = (el: HTMLVideoElement | null) => {
    videoRef.current = el;
    if (el && el.readyState >= 1 && el.videoWidth > 0 && el.videoHeight > 0) {
      const r = el.videoWidth / el.videoHeight;
      if (Math.abs(r - ratio) > 0.01) setRatio(r);
    }
  };

  if (failed) {
    return <IllustrationDemo name={name} />;
  }

  const play = () => {
    setStarted(true);
    const v = videoRef.current;
    if (!v) return;
    if (v.ended || v.currentTime < startSeconds) v.currentTime = startSeconds;
    v.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
  };
  const pause = () => {
    videoRef.current?.pause();
    setPlaying(false);
  };

  return (
    // Le cadre prend la forme de la vidéo elle-même (Philippe, 2026-11-01 :
    // « filmée à l'horizontale → affichée à l'horizontale, filmée à la
    // verticale → à la verticale ») : largeur/hauteur lues sur le fichier dès
    // qu'il est chargé. La hauteur reste plafonnée (--mh) pour que tout tienne
    // sur un écran ; une vidéo verticale devient alors moins large et se centre.
    <div
      className="relative mx-auto overflow-hidden rounded-xl bg-black [--mh:40vh] sm:[--mh:min(55vh,560px)] short:[--mh:9rem]"
      style={{ aspectRatio: ratio, width: `min(100%, calc(var(--mh) * ${ratio}))` }}
    >
      <video
        ref={attachVideo}
        playsInline
        muted
        preload="metadata"
        onLoadedMetadata={(e) => {
          const v = e.currentTarget;
          if (v.videoWidth > 0 && v.videoHeight > 0) setRatio(v.videoWidth / v.videoHeight);
        }}
        onError={() => setFailed(true)}
        onClick={pause}
        onEnded={() => setPlaying(false)}
        className={`absolute inset-0 h-full w-full bg-black object-contain ${started ? "" : "invisible"}`}
        src={startSeconds > 0 ? `${url}#t=${startSeconds}` : url}
      />
      {!started && (
        <div className="absolute inset-0 flex items-center justify-center border border-slate-200 bg-slate-50">
          <ExerciseIllustration name={name} className="h-40 w-56 text-blue-600 short:h-32" />
        </div>
      )}
      {!playing && (
        <button
          type="button"
          onClick={play}
          aria-label={started ? "Reprendre la vidéo" : `Voir la vidéo : ${name}`}
          className="absolute inset-0 flex items-center justify-center bg-black/10 transition hover:bg-black/20"
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg">
            <Play className="ml-1 h-7 w-7" strokeWidth={2} fill="currentColor" />
          </span>
        </button>
      )}
    </div>
  );
}

/** Text-only visual: the line-art illustration, framed like a player would be
 *  so the screen keeps its shape whether or not a clip exists yet. */
function IllustrationDemo({ name }: { name: string }) {
  return (
    <div className="flex aspect-video w-full items-center justify-center rounded-xl border border-slate-200 bg-slate-50 short:aspect-auto short:h-36">
      <ExerciseIllustration name={name} className="h-40 w-56 text-blue-600 short:h-32" />
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
          className="aspect-video w-full rounded-xl short:aspect-auto short:h-36"
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
/** L'objectif en badges lisibles d'un coup d'œil (Philippe, 2026-11-02 :
 *  « nice icons / nice display ») : séries, répétitions ou temps. */
function GoalBadges({ goal, label }: { goal: GoalParts; label: string }) {
  const badge = "inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-800 max-sm:py-1 short:py-1";
  return (
    <div className="flex flex-wrap items-center gap-2" aria-label={`Objectif : ${label}`}>
      {goal.kind === "duration" ? (
        <span className={badge}>
          <Timer className="h-4 w-4" strokeWidth={2} />
          {goal.minutes} min
        </span>
      ) : (
        <>
          <span className={badge}>
            <Repeat2 className="h-4 w-4" strokeWidth={2} />
            {goal.sets} séries
          </span>
          <span className={badge}>
            {goal.kind === "reps" ? <Dumbbell className="h-4 w-4" strokeWidth={2} /> : <Timer className="h-4 w-4" strokeWidth={2} />}
            {goal.kind === "reps" ? `${goal.reps} répétitions` : `${goal.seconds} s`}
          </span>
        </>
      )}
      {goal.kind === "reps" && <span className="text-xs text-slate-500 max-sm:hidden">selon votre aisance</span>}
    </div>
  );
}

/** Une pastille par série, à cocher au fil de l'exercice : facultatif, juste
 *  pour savoir où l'on en est. */
function SetTracker({ sets, done, onToggle }: { sets: number; done: number; onToggle: (n: number) => void }) {
  return (
    <div className="mt-3 flex items-center gap-2 max-sm:mt-2 short:mt-2">
      <span className="text-xs font-medium text-slate-500">Séries faites</span>
      {Array.from({ length: sets }, (_, i) => {
        const on = i < done;
        return (
          <button
            key={i}
            type="button"
            aria-pressed={on}
            aria-label={`Série ${i + 1}${on ? " faite" : ""}`}
            onClick={() => onToggle(on && i === done - 1 ? i : i + 1)}
            className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-colors motion-reduce:transition-none max-sm:h-7 max-sm:w-7 ${
              on ? "bg-blue-600 text-white" : "border border-slate-300 bg-white text-slate-500 hover:border-blue-400"
            }`}
          >
            {on ? <Check className="h-4 w-4" strokeWidth={2.5} /> : i + 1}
          </button>
        );
      })}
    </div>
  );
}

function HowTo({ instructions, goalText }: { instructions: string | null; goalText: string }) {
  const steps = parseSteps(instructions);
  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 max-sm:mt-2 max-sm:p-3 short:mt-2 short:p-3">
      <p className="sr-only">Objectif : {goalText}</p>
      {steps.length > 0 ? (
        <ol className="space-y-2 short:space-y-1">
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
        <p className="text-sm text-slate-500">Allez-y doucement, sans forcer.</p>
      )}
      <p className="mt-3 flex items-center gap-1.5 border-t border-slate-100 pt-3 text-xs text-slate-500 short:mt-2 short:pt-2">
        <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-amber-500" strokeWidth={2} />
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
  demo = false,
}: {
  workoutId: string;
  patientId: string;
  workoutName: string;
  exercises: SessionExercise[];
  prescription: Prescription;
  /** Démo publique (/demo) : rien n'est enregistré, la fin de séance et le
   *  ressenti s'affichent comme si l'enregistrement avait réussi. */
  demo?: boolean;
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
  // Garde contre le double appui sur « Terminer la séance » / « Réessayer » :
  // sans elle, deux taps rapides inséraient deux workout_logs (Philippe,
  // 2026-10-07). Le ref bloque la ré-entrée immédiate, le state désactive les
  // boutons à l'écran.
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const savedLogIdRef = useRef<string | null>(null);
  // End-of-session feeling capture — the only feedback this app collects.
  const [pain, setPain] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [fbSent, setFbSent] = useState(false);
  const [fbBusy, setFbBusy] = useState(false);

  // Séries cochées sur l'exercice en cours (affichage seulement, rien n'est enregistré).
  const [setsDone, setSetsDone] = useState(0);

  const total = exercises.length;
  const current = exercises[idx];
  const upcoming = exercises[idx + 1] ?? null;
  const goalText = goalTextFor(current?.instructions ?? null, prescription);
  const goal = goalPartsFor(current?.instructions ?? null);

  const finish = async () => {
    // Log the completed workout (RLS: patient can insert their own logs),
    // then recompute the daily streak to celebrate it. A failed insert must
    // NOT show the success celebration — the patient needs to know their
    // session wasn't actually recorded, and can retry.
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setSaveError(false);
    if (demo) {
      savingRef.current = false;
      setSaving(false);
      setPhase("finished");
      return;
    }
    try {
      const supabase = createClient();
      // Déjà enregistrée lors d'un essai précédent (réseau coupé juste après) :
      // « Réessayer » ne doit pas créer une deuxième séance (audit du 2026-10-08).
      if (!savedLogIdRef.current) {
        const { data: log, error } = await supabase
          .from("workout_logs")
          .insert({ patient_id: patientId, workout_id: workoutId })
          .select("id")
          .single();
        if (error || !log) throw error ?? new Error("insert failed");
        savedLogIdRef.current = log.id as string;
        setLogId(log.id as string);
      }
      // La série de jours n'est qu'un bonus d'affichage : son échec ne doit
      // pas faire croire que la séance n'est pas enregistrée.
      try {
        setStreak(await fetchStreak(supabase, patientId));
      } catch {
        /* série non affichée cette fois-ci */
      }
    } catch {
      setSaveError(true);
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
    setPhase("finished");
  };

  const [fbError, setFbError] = useState(false);

  const saveFeeling = async () => {
    if (pain == null) return;
    setFbBusy(true);
    setFbError(false);
    if (demo) {
      setFbSent(true);
      setFbBusy(false);
      return;
    }
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
      // Réarme le bouton « J'ai terminé cet exercice » : sinon il restait
      // désactivé dès le 2e exercice (Philippe, 2026-10-07).
      setCompleting(false);
      setSetsDone(0);
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
            Vérifiez votre connexion et réessayez : vos exercices ne sont pas perdus.
          </p>
          <button
            onClick={finish}
            disabled={saving}
            className="mt-6 w-full rounded-xl bg-blue-600 px-4 py-3 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Enregistrement…" : "Réessayer"}
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
            <p id="pain-scale-hint" className="text-xs text-slate-500">Votre douleur du moment (1 = aucune, 10 = très forte)</p>
            {/* Lecteurs d'écran : un groupe nommé, et la note choisie annoncée
                comme « enfoncée » (audit du 2026-10-08). */}
            <div role="group" aria-labelledby="pain-scale-hint" className="mt-2 flex flex-wrap gap-1.5">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  aria-pressed={pain === n}
                  aria-label={`Douleur ${n} sur 10`}
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
    // Écran peu haut (petit téléphone, PC de 549 px de haut) : démonstration
    // moins haute et marges resserrées pour que l'exercice et son bouton
    // tiennent sans défiler (audit 2026-10-10).
    <div className="mx-auto flex max-w-xl flex-col gap-4 short:gap-2">
      {/* Progress header : nom de la séance, position, barre par exercice. */}
      <div>
        <div className="flex items-center justify-between gap-3">
          <p className="min-w-0 truncate text-sm font-semibold text-slate-700">{workoutName}</p>
          <Link
            href="/patient"
            aria-label="Quitter la séance"
            className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-sm text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-4 w-4" strokeWidth={2} />
            Quitter
          </Link>
        </div>
        <div className="mt-1.5 flex items-center gap-3">
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
          <span className="text-xs font-medium tabular-nums text-slate-400">
            {idx + 1}/{total}
          </span>
        </div>
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

          {/* À suivre : le prochain exercice et son objectif, pour enchaîner sans surprise. */}
          {upcoming && (
            <div className="mt-5 flex items-center gap-3 rounded-xl bg-slate-50 p-3 text-left">
              <ExerciseIllustration name={upcoming.name} className="h-14 w-14 shrink-0 rounded-lg bg-white text-blue-600" />
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">À suivre</p>
                <p className="truncate text-sm font-semibold text-slate-900">{upcoming.name}</p>
                <p className="text-xs text-slate-500">{goalTextFor(upcoming.instructions, prescription)}</p>
              </div>
            </div>
          )}

          <button
            onClick={next}
            disabled={saving}
            className="mt-6 flex w-full items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 py-3 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {idx < total - 1 ? (
              <>
                Exercice suivant
                <ArrowRight className="h-4 w-4" strokeWidth={2} />
              </>
            ) : saving ? (
              "Enregistrement…"
            ) : (
              "Terminer la séance"
            )}
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm max-sm:p-4 short:p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-blue-600">
            Exercice {idx + 1} sur {total}
          </p>
          <h2 className="font-display mt-1 text-2xl font-semibold text-slate-900 short:mt-0 short:text-xl">
            {current.name}
          </h2>
          <div className="mt-2 short:mt-1">
            <GoalBadges goal={goal} label={goalText} />
          </div>

          <div className="mt-4 max-sm:mt-3 short:mt-2">
            <Demo url={current.mediaUrl} name={current.name} startSeconds={current.mediaStartSeconds ?? 0} />
          </div>

          {goal.kind !== "duration" && <SetTracker sets={goal.sets} done={setsDone} onToggle={setSetsDone} />}

          <HowTo instructions={current.instructions} goalText={goalText} />

          <button
            onClick={onExerciseDone}
            disabled={completing}
            className={`mt-6 flex w-full items-center justify-center gap-1.5 rounded-xl py-4 text-lg font-semibold text-white max-sm:mt-3 max-sm:py-3 short:mt-3 short:py-3 short:text-base transition-transform duration-150 ease-out motion-reduce:transition-none ${
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
