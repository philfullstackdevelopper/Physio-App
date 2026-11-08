"use client";

// =============================================================================
// WorkoutSession — step-by-step guided session for one workout.
// For each exercise: one clear screen (demo + instructions) → celebration.
// Ends with a final celebration and logs the completed workout.
// =============================================================================

import { useRef, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { CheckCircle2, Check, Play, Repeat2, Dumbbell, Timer, X, ArrowRight, ShieldAlert, SkipForward, Maximize2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { goalPartsFor, goalTextFor, type ExerciseDose, type GoalParts, type Prescription } from "@/lib/exercise/prescription";
import { sessionPainScore } from "@/lib/exercise/sessionPain";
import { getYoutubeEmbedId, isVideoFileUrl, isImageFileUrl } from "@/lib/exercise/media";
import { parseSteps } from "@/lib/exercise/steps";
import ExerciseIllustration from "@/components/ExerciseIllustration";

export interface SessionExercise {
  /** Identifiant de l'exercice (pour le suivi par exercice, migration 0080). */
  id?: string | null;
  name: string;
  /** Dose choisie par le kiné pour cet exercice de la séance (vide = règle habituelle). */
  dose?: ExerciseDose | null;
  instructions: string | null;
  mediaUrl: string | null;
  /** Where in the clip the movement actually starts — skip any intro. */
  mediaStartSeconds?: number;
}

type Phase = "exercise" | "celebrate" | "finished";

/** A self-hosted demo clip of the kiné doing the exercise (Philippe,
 *  2026-10-01). The clip's first frame shows straight away; one tap plays it,
 *  another pauses it (2026-11-02, no big play button any more) — WITHOUT sound
 *  for now (2026-10-31), no autoplay, no endless loop. Shown whole
 *  (object-contain) on black. `startSeconds` skips any intro. */
function VideoDemo({ url, name, startSeconds = 0 }: { url: string; name: string; startSeconds?: number }) {
  const t = useTranslations("exercise.session");
  const videoRef = useRef<HTMLVideoElement>(null);
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

  // Un toucher sur la vidéo : lecture ou pause (Philippe, 2026-11-02 : « direct
  // voir la vidéo prête à jouer, sans le gros truc bleu »).
  const toggle = () => {
    const v = videoRef.current;
    if (!v) return;
    if (!v.paused) {
      v.pause();
      setPlaying(false);
      return;
    }
    if (v.ended || v.currentTime < startSeconds) v.currentTime = startSeconds;
    v.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
  };

  // Plein écran (Philippe, 2026-11-08 : « avoir les vidéos en grand ») : lance
  // la lecture et agrandit la vidéo. iPhone : lecteur plein écran d'Apple
  // (webkitEnterFullscreen) ; ailleurs, plein écran standard.
  const fullscreen = () => {
    const v = videoRef.current as (HTMLVideoElement & { webkitEnterFullscreen?: () => void }) | null;
    if (!v) return;
    if (v.ended || v.currentTime < startSeconds) v.currentTime = startSeconds;
    v.play().then(() => setPlaying(true)).catch(() => {});
    if (typeof v.requestFullscreen === "function") v.requestFullscreen().catch(() => v.webkitEnterFullscreen?.());
    else v.webkitEnterFullscreen?.();
  };

  return (
    // Le cadre prend la forme de la vidéo elle-même (verticale ou horizontale,
    // Philippe, 2026-11-01). Hauteur plafonnée (--mh) pour tenir sur un écran :
    // sur ordinateur la vidéo est à gauche et prend presque toute la hauteur
    // (2026-11-02 : « la vidéo est trop petite »), largeur plafonnée (--mw).
    <div
      className="relative mx-auto overflow-hidden rounded-xl bg-black [--mh:40vh] [--mw:100%] sm:[--mh:calc(100dvh-9rem)] sm:[--mw:min(34rem,50vw)]"
      style={{ aspectRatio: ratio, width: `min(var(--mw), calc(var(--mh) * ${ratio}))` }}
    >
      {/* Première image affichée tout de suite (#t=… : aussi sur iPhone). */}
      <video
        ref={attachVideo}
        playsInline
        muted
        preload="metadata"
        aria-label={t("videoAria", { name })}
        onLoadedMetadata={(e) => {
          const v = e.currentTarget;
          if (v.videoWidth > 0 && v.videoHeight > 0) setRatio(v.videoWidth / v.videoHeight);
        }}
        onError={() => setFailed(true)}
        onClick={toggle}
        onPause={() => setPlaying(false)}
        onPlay={() => setPlaying(true)}
        onEnded={() => setPlaying(false)}
        className="absolute inset-0 h-full w-full cursor-pointer bg-black object-contain"
        src={`${url}#t=${Math.max(startSeconds, 0.001)}`}
      />
      {/* Repère « lecture » au centre quand la vidéo est à l'arrêt (Philippe,
          2026-11-08 : plus visible, sans texte). Ne capte pas le toucher : un
          toucher n'importe où sur la vidéo la lance, comme avant. */}
      {!playing && (
        <span className="pointer-events-none absolute top-1/2 left-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white">
          <Play className="ml-1 h-7 w-7" strokeWidth={2} fill="currentColor" />
        </span>
      )}
      <button
        type="button"
        onClick={fullscreen}
        aria-label={t("fullscreenAria")}
        title={t("fullscreenTitle")}
        className="absolute right-2 bottom-2 flex h-9 w-9 items-center justify-center rounded-full bg-black/45 text-white transition-colors hover:bg-black/65 focus-visible:outline-2 focus-visible:outline-white"
      >
        <Maximize2 className="h-4 w-4" strokeWidth={2} />
      </button>
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
  const t = useTranslations("exercise.session");
  if (url) {
    const ytId = getYoutubeEmbedId(url);
    if (ytId) {
      return (
        <iframe
          className="aspect-video w-full rounded-xl short:aspect-auto short:h-36"
          src={`https://www.youtube.com/embed/${ytId}?autoplay=1&mute=1&loop=1&playlist=${ytId}&start=${startSeconds}`}
          title={t("demo")}
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
      return <img src={url} alt={t("demo")} className="w-full rounded-xl" />;
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
  const t = useTranslations("exercise.session");
  const badge = "inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-800 max-sm:py-1 short:py-1";
  return (
    <div className="flex flex-wrap items-center gap-2" aria-label={t("goalAria", { goal: label })}>
      {goal.kind === "duration" ? (
        <span className={badge}>
          <Timer className="h-4 w-4" strokeWidth={2} />
          {goal.minutes} min
        </span>
      ) : (
        <>
          <span className={badge}>
            <Repeat2 className="h-4 w-4" strokeWidth={2} />
            {t("sets", { count: goal.sets })}
          </span>
          <span className={badge}>
            {goal.kind === "reps" ? <Dumbbell className="h-4 w-4" strokeWidth={2} /> : <Timer className="h-4 w-4" strokeWidth={2} />}
            {goal.kind === "reps" ? t("reps", { reps: goal.reps }) : `${goal.seconds} s`}
          </span>
        </>
      )}
      {goal.kind === "reps" && <span className="text-xs text-slate-500 max-sm:hidden">{t("asComfortable")}</span>}
    </div>
  );
}

/** Une case par série, à toucher au fil de l'exercice : facultatif, juste
 *  pour savoir où l'on en est. Grandes cases « Série 1 / 2 / 3 » qui passent
 *  au vert (Philippe, 2026-11-08 : plus simple que les petits ronds numérotés). */
function SetTracker({ sets, done, onToggle }: { sets: number; done: number; onToggle: (n: number) => void }) {
  const t = useTranslations("exercise.session");
  return (
    <div className="mt-3 max-sm:mt-2 short:mt-2">
      <p className="text-xs text-slate-500">{t("setsHint")}</p>
      <div className="mt-1 flex gap-2 max-sm:gap-1.5">
        {Array.from({ length: sets }, (_, i) => {
          const on = i < done;
          return (
            <button
              key={i}
              type="button"
              aria-pressed={on}
              aria-label={on ? t("setDoneAria", { n: i + 1 }) : t("setAria", { n: i + 1 })}
              onClick={() => onToggle(on && i === done - 1 ? i : i + 1)}
              className={`flex h-11 min-w-0 flex-1 items-center justify-center gap-1 rounded-xl border text-sm font-semibold transition-colors motion-reduce:transition-none ${
                on ? "border-ok bg-ok-soft text-ok" : "border-slate-300 bg-white text-slate-600 hover:border-blue-400"
              }`}
            >
              {on && <Check className="h-4 w-4 shrink-0" strokeWidth={2.5} />}
              <span className="truncate">{t("setAria", { n: i + 1 })}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Douleur pendant l'exercice, en pastilles de 0 à 10 (Philippe, 2026-11-02,
 *  option B validée) : facultatif, colorées de plus en plus chaud. */
function PainPills({ value, onChange }: { value: number | null; onChange: (n: number) => void }) {
  const t = useTranslations("exercise.session");
  return (
    <div className="text-left">
      <p id="ex-pain-label" className="text-sm font-semibold text-slate-800">{t("painDuring")}</p>
      <div role="group" aria-labelledby="ex-pain-label" className="mt-2 grid grid-cols-11 gap-1">
        {Array.from({ length: 11 }, (_, n) => {
          const on = value === n;
          const tone = n >= 8 ? "border-red-200 bg-red-50 text-red-700" : n >= 6 ? "border-amber-200 bg-amber-50 text-amber-800" : "border-slate-200 bg-white text-slate-700";
          return (
            <button
              key={n}
              type="button"
              aria-pressed={on}
              aria-label={t("painAria", { n })}
              onClick={() => onChange(n)}
              className={`h-9 rounded-lg border text-sm font-semibold tabular-nums max-sm:h-8 ${on ? "border-blue-600 bg-blue-600 text-white" : tone}`}
            >
              {n}
            </button>
          );
        })}
      </div>
      <p className="mt-1 flex justify-between text-[11px] text-slate-500">
        <span>{t("painNone")}</span>
        <span>{t("painStrong")}</span>
      </p>
    </div>
  );
}

/** « C'était… » : facile / correct / difficile, enregistré en 2, 5 ou 8 sur 10. */
const DIFFICULTY_CHOICES = [
  { label: "diffEasy", value: 2 },
  { label: "diffCorrect", value: 5 },
  { label: "diffHard", value: 8 },
] as const;

function DifficultyChoice({ value, onChange }: { value: number | null; onChange: (n: number) => void }) {
  const t = useTranslations("exercise.session");
  return (
    <div className="text-left">
      <p id="ex-diff-label" className="text-sm font-semibold text-slate-800">{t("feltLabel")}</p>
      <div role="group" aria-labelledby="ex-diff-label" className="mt-2 grid grid-cols-3 gap-1.5">
        {DIFFICULTY_CHOICES.map((c) => {
          const on = value === c.value;
          return (
            <button
              key={c.value}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(c.value)}
              className={`h-11 rounded-xl text-sm font-semibold max-sm:h-10 ${on ? "border-2 border-blue-600 bg-blue-50 text-blue-800" : "border border-slate-200 bg-white text-slate-700"}`}
            >
              {t(c.label)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

type SkipReason = "pain" | "equipment" | "unclear" | "time";
// label = clé de « exercise.session ».
const SKIP_REASONS: { id: SkipReason; label: string }[] = [
  { id: "pain", label: "skipPain" },
  { id: "equipment", label: "skipEquipment" },
  { id: "unclear", label: "skipUnclear" },
  { id: "time", label: "skipTime" },
];
/** Intensité de la douleur quand c'est la raison : légère / moyenne / forte = 3 / 5 / 8. */
const SKIP_PAIN = [
  { label: "skipPainLight", value: 3 },
  { label: "skipPainMedium", value: 5 },
  { label: "skipPainStrong", value: 8 },
] as const;

/** « Pourquoi passer cet exercice ? » (option C validée) : n'apparaît QUE quand
 *  le patient touche « Passer cet exercice ». Tout est facultatif. */
function SkipSheet({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: (reason: SkipReason | null, pain: number | null) => void }) {
  const t = useTranslations("exercise.session");
  const [reason, setReason] = useState<SkipReason | null>(null);
  const [pain, setPain] = useState<number | null>(null);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/45 sm:items-center" onClick={onCancel}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("skipTitle")}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-t-3xl bg-white px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-3 sm:rounded-3xl sm:pb-6"
      >
        <div className="mx-auto h-1 w-10 rounded-full bg-slate-300 sm:hidden" aria-hidden="true" />
        <h2 className="mt-3 text-lg font-semibold text-slate-900">{t("skipTitle")}</h2>
        <p className="text-sm text-slate-500">{t("skipHint")}</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {SKIP_REASONS.map((r) => {
            const on = reason === r.id;
            return (
              <button
                key={r.id}
                type="button"
                aria-pressed={on}
                onClick={() => {
                  setReason(on ? null : r.id);
                  if (r.id !== "pain") setPain(null);
                }}
                className={`min-h-12 rounded-xl px-3 text-sm font-semibold ${
                  on ? (r.id === "pain" ? "border-2 border-red-600 bg-red-50 text-red-700" : "border-2 border-blue-600 bg-blue-50 text-blue-800") : "border border-slate-200 bg-white text-slate-700"
                }`}
              >
                {t(r.label)}
              </button>
            );
          })}
        </div>
        {reason === "pain" && (
          <>
            <p id="skip-pain-label" className="mt-4 text-sm font-semibold text-slate-800">{t("skipPainQuestion")}</p>
            <div role="group" aria-labelledby="skip-pain-label" className="mt-2 grid grid-cols-3 gap-2">
              {SKIP_PAIN.map((c) => {
                const on = pain === c.value;
                return (
                  <button
                    key={c.value}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setPain(on ? null : c.value)}
                    className={`h-11 rounded-xl text-sm font-semibold ${on ? "border-2 border-amber-600 bg-amber-50 text-amber-800" : "border border-slate-200 bg-white text-slate-700"}`}
                  >
                    {t(c.label)}
                  </button>
                );
              })}
            </div>
          </>
        )}
        <button
          type="button"
          onClick={() => onConfirm(reason, pain)}
          className="mt-5 h-12 w-full rounded-xl bg-slate-900 text-base font-semibold text-white hover:bg-slate-800"
        >
          {t("skipConfirm")}
        </button>
        <button type="button" onClick={onCancel} className="mt-2 h-10 w-full rounded-xl text-sm font-medium text-slate-500 hover:bg-slate-50">
          {t("skipCancel")}
        </button>
      </div>
    </div>
  );
}

type ExerciseResult = { status: "done" | "skipped"; pain: number | null; difficulty: number | null; skipReason?: SkipReason | null };

function HowTo({ instructions, goalText }: { instructions: string | null; goalText: string }) {
  const t = useTranslations("exercise.session");
  const steps = parseSteps(instructions);
  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 max-sm:mt-2 max-sm:p-3 short:mt-2 short:p-3">
      <p className="sr-only">{t("goalAria", { goal: goalText })}</p>
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
        <p className="text-sm text-slate-500">{t("noSteps")}</p>
      )}
      <p className="mt-3 flex items-center gap-1.5 border-t border-slate-100 pt-3 text-xs text-slate-500 short:mt-2 short:pt-2">
        <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-amber-500" strokeWidth={2} />
        {t("sharpPain")}
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
  const t = useTranslations("exercise.session");
  const tGoal = useTranslations("exercise.goal");
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>("exercise");
  // Brief press-feedback on the "done" button before the phase switches to
  // celebrate — without this, the animation would never be visible since the
  // button unmounts the instant onExerciseDone fires.
  const [completing, setCompleting] = useState(false);
  // (Philippe, 2026-11-06 : audit, on allège) Plus de badge « N jours
  // d'affilée » avec la flamme en fin de séance : trop « jeu ».
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
  // Ressenti de fin de séance (patient_feedback). (Philippe, 2026-11-06 :
  // audit, on allège) La question « douleur du moment » (1–10) est
  // supprimée : la douleur de séance est la plus forte douleur notée
  // exercice par exercice (sessionPainScore), enregistrée automatiquement à
  // la fin de la séance. Reste le mot libre, « Envoyer à mon kiné ».
  const feedbackIdRef = useRef<string | null>(null);
  const [note, setNote] = useState("");
  const [fbSent, setFbSent] = useState(false);
  const [fbBusy, setFbBusy] = useState(false);

  // Séries cochées sur l'exercice en cours (affichage seulement, rien n'est enregistré).
  const [setsDone, setSetsDone] = useState(0);
  // Suivi par exercice (migration 0080) : fait ou passé, et le ressenti
  // facultatif. Enregistré avec la séance, à la fin.
  const [results, setResults] = useState<Record<number, ExerciseResult>>({});
  const resultsSavedRef = useRef(false);
  const setRating = (key: "pain" | "difficulty", n: number) =>
    setResults((r) => ({ ...r, [idx]: { ...(r[idx] ?? { status: "done", pain: null, difficulty: null }), [key]: n } }));

  const total = exercises.length;
  const current = exercises[idx];
  const upcoming = exercises[idx + 1] ?? null;
  const goalText = goalTextFor(current?.instructions ?? null, prescription, current?.dose, tGoal);
  const goal = goalPartsFor(current?.instructions ?? null, current?.dose);
  const doneCount = Object.values(results).filter((r) => r.status === "done").length;
  const skippedCount = Object.values(results).filter((r) => r.status === "skipped").length;

  const finish = async (latest?: Record<number, ExerciseResult>) => {
    const allResults = latest ?? results;
    // Log the completed workout (RLS: patient can insert their own logs),
    // then the per-exercise results and the session pain. A failed insert must
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
      // Suivi par exercice : un bonus, son échec ne doit pas faire croire
      // que la séance n'est pas enregistrée.
      if (!resultsSavedRef.current && savedLogIdRef.current) {
        const rows = Object.entries(allResults).map(([i, r]) => ({
          patient_id: patientId,
          workout_log_id: savedLogIdRef.current,
          exercise_id: exercises[Number(i)]?.id ?? null,
          exercise_name: exercises[Number(i)]?.name ?? "Exercice",
          position: Number(i),
          status: r.status,
          pain: r.pain,
          skip_reason: r.skipReason ?? null,
          difficulty: r.difficulty,
        }));
        if (rows.length > 0) {
          const { error: resErr } = await supabase.from("exercise_results").insert(rows);
          if (!resErr) resultsSavedRef.current = true;
        } else {
          resultsSavedRef.current = true;
        }
      }
      // Douleur de séance pour le kiné (stat « Douleur », courbe, frein de
      // phase, alertes) : la plus forte douleur notée exercice par exercice.
      // Aucune douleur notée → pas de ligne (pain_score est NOT NULL).
      // Comme le suivi par exercice, son échec ne bloque pas la fin de séance.
      const finalPain = sessionPainScore(Object.values(allResults).map((r) => r.pain));
      if (!feedbackIdRef.current && savedLogIdRef.current && finalPain != null) {
        const { data: fb } = await supabase
          .from("patient_feedback")
          .insert({
            patient_id: patientId,
            workout_id: workoutId,
            workout_log_id: savedLogIdRef.current,
            pain_score: finalPain,
            completed: true,
          })
          .select("id")
          .single();
        if (fb) feedbackIdRef.current = fb.id as string;
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

  // Douleur de séance calculée depuis les douleurs notées par exercice.
  const sessionPain = sessionPainScore(Object.values(results).map((r) => r.pain));

  // « Envoyer à mon kiné » : ajoute le mot libre à la ligne de ressenti de
  // la séance (créée à la fin de séance, ou ici si cet envoi avait échoué).
  const saveFeeling = async () => {
    const notes = note.trim();
    if (!notes || sessionPain == null) return;
    setFbBusy(true);
    setFbError(false);
    if (demo) {
      setFbSent(true);
      setFbBusy(false);
      return;
    }
    try {
      const supabase = createClient();
      if (feedbackIdRef.current) {
        const { error } = await supabase
          .from("patient_feedback")
          .update({ notes })
          .eq("id", feedbackIdRef.current);
        if (error) throw error;
      } else {
        const { data: fb, error } = await supabase
          .from("patient_feedback")
          .insert({
            patient_id: patientId,
            workout_id: workoutId,
            workout_log_id: logId,
            pain_score: sessionPain,
            notes,
            completed: true,
          })
          .select("id")
          .single();
        if (error || !fb) throw error ?? new Error("insert failed");
        feedbackIdRef.current = fb.id as string;
      }
      setFbSent(true);
    } catch {
      setFbError(true);
    } finally {
      setFbBusy(false);
    }
  };

  const onExerciseDone = () => {
    if (completing) return;
    setResults((r) => ({ ...r, [idx]: { status: "done", pain: r[idx]?.pain ?? null, difficulty: r[idx]?.difficulty ?? null } }));
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

  // « Passer cet exercice » : la fenêtre « Pourquoi ? » s'ouvre, puis on
  // enchaîne directement (noté comme passé, avec la raison si donnée).
  const [skipOpen, setSkipOpen] = useState(false);
  const skip = (reason: SkipReason | null, skipPain: number | null) => {
    setSkipOpen(false);
    if (completing || saving) return;
    const updated: Record<number, ExerciseResult> = { ...results, [idx]: { status: "skipped", pain: skipPain, difficulty: null, skipReason: reason } };
    setResults(updated);
    if (idx < total - 1) {
      setIdx(idx + 1);
      setSetsDone(0);
      setPhase("exercise");
    } else {
      finish(updated);
    }
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
        {t("empty")}
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
            {t("notSavedTitle")}
          </h2>
          <p className="mt-2 text-slate-600">
            {t("notSavedBody")}
          </p>
          <button
            onClick={() => finish()}
            disabled={saving}
            className="mt-6 w-full rounded-xl bg-blue-600 px-4 py-3 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? t("saving") : t("retry")}
          </button>
          <Link
            href="/patient"
            className="mt-3 block rounded-xl border border-slate-300 py-3 font-medium text-slate-700 hover:bg-slate-50"
          >
            {t("backHome")}
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
          {t("finishedTitle")}
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          {skippedCount > 0
            ? t("finishedPartial", { done: doneCount, total, name: workoutName })
            : t("finishedCount", { count: total, name: workoutName })}
        </p>
        {/* (Philippe, 2026-11-06 : audit, on allège) Badge « N jours
            d'affilée » et question « douleur du moment » (1–10) retirés. */}

        {/* Post-session feeling → helps the physio recalibrate. Affiché
            seulement si une douleur a été notée pendant la séance : sans
            elle, aucune ligne de ressenti ne peut être enregistrée
            (pain_score NOT NULL) ; le patient garde la messagerie. */}
        {sessionPain == null ? null : !fbSent ? (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 text-left">
            <label htmlFor="session-note" className="block text-sm font-medium text-slate-800">
              {t("feelingTitle")}
            </label>
            <textarea
              id="session-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder={t("notePlaceholder")}
              className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900"
            />
            {fbError && (
              <p className="mt-3 text-sm text-red-700">
                {t("sendFailed")}
              </p>
            )}
            <button
              onClick={saveFeeling}
              disabled={!note.trim() || fbBusy}
              className="mt-4 w-full rounded-lg bg-blue-600 py-2.5 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {fbBusy ? t("sending") : t("sendToPhysio")}
            </button>
          </div>
        ) : (
          <p className="mt-6 flex items-center justify-center gap-1.5 text-sm font-medium text-slate-700">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-blue-600" strokeWidth={1.75} />
            {t("feelingSent")}
          </p>
        )}

        <Link
          href="/patient"
          className="mt-4 block rounded-xl border border-slate-300 py-3 font-medium text-slate-700 hover:bg-slate-50"
        >
          {t("backHome")}
        </Link>
      </div>
    );
  }

  return (
    // Écran peu haut (petit téléphone, PC de 549 px de haut) : démonstration
    // moins haute et marges resserrées pour que l'exercice et son bouton
    // tiennent sans défiler (audit 2026-10-10).
    <div className="mx-auto flex max-w-xl flex-col gap-4 sm:max-w-5xl short:gap-2">
      {/* Progress header : nom de la séance, position, barre par exercice. */}
      <div>
        <div className="flex items-center justify-between gap-3">
          <p className="min-w-0 truncate text-sm font-semibold text-slate-700">{workoutName}</p>
          <Link
            href="/patient"
            aria-label={t("quitAria")}
            className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-sm text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-4 w-4" strokeWidth={2} />
            {t("quit")}
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
            {t("exerciseDone", { n: idx + 1, total })}
          </p>

          {/* Ressenti de CET exercice, facultatif : le kiné voit lequel gêne. */}
          <div className="mt-4 space-y-4 short:mt-3 short:space-y-3">
            <PainPills value={results[idx]?.pain ?? null} onChange={(n) => setRating("pain", n)} />
            <DifficultyChoice value={results[idx]?.difficulty ?? null} onChange={(n) => setRating("difficulty", n)} />
          </div>

          {/* À suivre : le prochain exercice et son objectif, pour enchaîner sans surprise. */}
          {upcoming && (
            <div className="mt-5 flex items-center gap-3 rounded-xl bg-slate-50 p-3 text-left">
              <ExerciseIllustration name={upcoming.name} className="h-14 w-14 shrink-0 rounded-lg bg-white text-blue-600" />
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{t("upNext")}</p>
                <p className="truncate text-sm font-semibold text-slate-900">{upcoming.name}</p>
                <p className="text-xs text-slate-500">{goalTextFor(upcoming.instructions, prescription, upcoming.dose, tGoal)}</p>
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
                {t("nextExercise")}
                <ArrowRight className="h-4 w-4" strokeWidth={2} />
              </>
            ) : saving ? (
              t("saving")
            ) : (
              t("finishSession")
            )}
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm max-sm:p-4 short:p-4">
          {/* Téléphone : tout en colonne. Ordinateur : la vidéo à gauche, en
              grand, et l'exercice à droite (Philippe, 2026-11-02). */}
          <div className="flex flex-col sm:grid sm:grid-cols-[auto_minmax(0,1fr)] sm:items-start sm:gap-x-6">
          <div className="sm:col-start-2">
          {/* « Exercice N sur M » retiré : le « N/M » de l'en-tête suffit
              (Philippe, 2026-11-06 : audit, on allège). */}
          <h2 className="font-display text-2xl font-semibold text-slate-900 short:text-xl">
            {current.name}
          </h2>
          <div className="mt-2 short:mt-1">
            <GoalBadges goal={goal} label={goalText} />
          </div>
          </div>

          <div className="mt-4 max-sm:mt-3 sm:col-start-1 sm:row-span-2 sm:row-start-1 sm:mt-0">
            <Demo url={current.mediaUrl} name={current.name} startSeconds={current.mediaStartSeconds ?? 0} />
          </div>

          <div className="sm:col-start-2">
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
            {t("doneExercise")}
          </button>
          <button
            type="button"
            onClick={() => setSkipOpen(true)}
            disabled={completing || saving}
            className="mx-auto mt-2 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50 max-sm:mt-1"
          >
            <SkipForward className="h-4 w-4" strokeWidth={1.75} />
            {t("skipButton")}
          </button>
          {skipOpen && <SkipSheet onCancel={() => setSkipOpen(false)} onConfirm={skip} />}
          </div>
          </div>
        </div>
      )}
    </div>
  );
}
