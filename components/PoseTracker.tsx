"use client";

// =============================================================================
// PoseTracker — real-time exercise coaching with MediaPipe.
// Handles three analyzer kinds:
//   • reps   — count reps from a 3D joint angle (squat depth, etc.)
//   • hold   — timed hold, gated on the person being visible (planks/stretches)
//   • manual — camera as a mirror + a tap-to-count button (small movements)
// Targets come from the `prescription`; measurement from the `analyzer`.
// All analysis is local — no video leaves the device.
// =============================================================================

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  PoseLandmarker as PoseLandmarkerType,
  NormalizedLandmark,
  Landmark,
} from "@mediapipe/tasks-vision";
import { DEFAULT_SQUAT, type Prescription } from "@/lib/exercise/prescription";
import { SQUAT_ANALYZER, type Analyzer } from "@/lib/exercise/analyzers";

type Tone = "good" | "warn" | "info";
type Feedback = { text: string; tone: Tone };
type Pt3 = { x: number; y: number; z: number };

function angle3(a: Pt3, b: Pt3, c: Pt3) {
  const ab = { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
  const cb = { x: c.x - b.x, y: c.y - b.y, z: c.z - b.z };
  const mag = Math.hypot(ab.x, ab.y, ab.z) * Math.hypot(cb.x, cb.y, cb.z);
  if (mag === 0) return 180;
  const cos = Math.max(-1, Math.min(1, (ab.x * cb.x + ab.y * cb.y + ab.z * cb.z) / mag));
  return (Math.acos(cos) * 180) / Math.PI;
}

const vis = (p: NormalizedLandmark) => p.visibility ?? 0;

// Candidate joints for the generic "auto" counter — angle taken at the middle
// index of each triple (knees, hips, elbows, shoulders).
const AUTO_JOINTS: [number, number, number][] = [
  [23, 25, 27], [24, 26, 28], // knees
  [11, 23, 25], [12, 24, 26], // hips
  [11, 13, 15], [12, 14, 16], // elbows
  [13, 11, 23], [14, 12, 24], // shoulders
];

export default function PoseTracker({
  prescription = DEFAULT_SQUAT,
  analyzer = SQUAT_ANALYZER,
  onComplete,
}: {
  prescription?: Prescription;
  analyzer?: Analyzer;
  onComplete?: (done: number) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const landmarkerRef = useRef<PoseLandmarkerType | null>(null);
  const rafRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastVideoTimeRef = useRef(-1);
  const popupTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const exRef = useRef(prescription);
  const anRef = useRef(analyzer);
  useEffect(() => {
    exRef.current = prescription;
    anRef.current = analyzer;
  }, [prescription, analyzer]);

  // Rep / set machine.
  const phaseRef = useRef<"up" | "down">("up");
  const minAngleRef = useRef(180);
  const repsRef = useRef(0);
  const setsRef = useRef(0);
  const completedRef = useRef(false);
  // Hold machine.
  const holdRemainingRef = useRef(0);
  const lastTsRef = useRef<number | null>(null);
  // Auto (generic) counter — running min/max of each candidate joint angle.
  const candMinRef = useRef<number[]>([]);
  const candMaxRef = useRef<number[]>([]);
  // Paced (metronome) counter.
  const pacedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pacedRemainingRef = useRef(0);
  // "Ready → 3-2-1 → go" gating: counting only starts once active.
  const activeRef = useRef(false);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [status, setStatus] = useState<"idle" | "loading" | "running">("idle");
  const [reps, setReps] = useState(0);
  const [setsDone, setSetsDone] = useState(0);
  const [angle, setAngle] = useState<number | null>(null);
  const [holdRemaining, setHoldRemaining] = useState<number | null>(null);
  const [pacedRemaining, setPacedRemaining] = useState<number | null>(null);
  const [active, setActive] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<Feedback>({
    text: "Cliquez sur « Démarrer » pour lancer l'analyse.",
    tone: "info",
  });
  const [popup, setPopup] = useState<Feedback | null>(null);
  const [error, setError] = useState<string | null>(null);

  const flashPopup = useCallback((text: string, tone: Tone) => {
    setPopup({ text, tone });
    if (popupTimeoutRef.current) clearTimeout(popupTimeoutRef.current);
    popupTimeoutRef.current = setTimeout(() => setPopup(null), 1700);
  }, []);

  const finishAll = useCallback(
    (done: number) => {
      flashPopup("Objectif atteint ! 🎉 Bravo", "good");
      if (!completedRef.current) {
        completedRef.current = true;
        onComplete?.(done);
      }
    },
    [flashPopup, onComplete],
  );

  // One completed repetition (used by rep detection AND the manual button).
  const registerRep = useCallback(() => {
    const ex = exRef.current;
    repsRef.current += 1;
    setReps(repsRef.current);
    if (repsRef.current >= ex.goalReps) {
      setsRef.current += 1;
      setSetsDone(setsRef.current);
      repsRef.current = 0;
      setReps(0);
      if (setsRef.current >= ex.goalSets) finishAll(setsRef.current * ex.goalReps);
      else flashPopup(`Série ${setsRef.current} terminée ! Reposez-vous 🧘`, "good");
    } else {
      flashPopup("Belle répétition ! 💪", "good");
    }
  }, [finishAll, flashPopup]);

  // Metronome: add +1 rep every `secondsPerRep` while running.
  const startPaced = useCallback(
    (secondsPerRep: number) => {
      pacedRemainingRef.current = secondsPerRep;
      setPacedRemaining(secondsPerRep);
      pacedTimerRef.current = setInterval(() => {
        if (completedRef.current) {
          if (pacedTimerRef.current) clearInterval(pacedTimerRef.current);
          pacedTimerRef.current = null;
          return;
        }
        pacedRemainingRef.current -= 0.25;
        if (pacedRemainingRef.current <= 0) {
          registerRep();
          pacedRemainingRef.current = secondsPerRep;
        }
        setPacedRemaining(Math.ceil(Math.max(0, pacedRemainingRef.current)));
      }, 250);
    },
    [registerRep],
  );

  // Actually start counting (called when the 3-2-1 countdown reaches zero).
  const begin = useCallback(() => {
    const an = anRef.current;
    // Fresh counting state at the "go".
    phaseRef.current = "up";
    minAngleRef.current = 180;
    repsRef.current = 0;
    setsRef.current = 0;
    setReps(0);
    setSetsDone(0);
    completedRef.current = false;
    candMinRef.current = new Array(AUTO_JOINTS.length).fill(Infinity);
    candMaxRef.current = new Array(AUTO_JOINTS.length).fill(-Infinity);
    lastTsRef.current = null;
    if (an.kind === "hold") {
      holdRemainingRef.current = an.holdSeconds;
      setHoldRemaining(an.holdSeconds);
    }
    activeRef.current = true;
    setActive(true);
    setFeedback({ text: "cue" in an ? an.cue : "C'est parti !", tone: "info" });
    if (an.kind === "paced") startPaced(an.secondsPerRep);
  }, [startPaced]);

  // Patient-triggered 3-2-1 countdown before the exercise begins.
  const startCountdown = useCallback(() => {
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    setCountdown(3);
    countdownTimerRef.current = setInterval(() => {
      setCountdown((c) => {
        const next = (c ?? 1) - 1;
        if (next <= 0) {
          if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
          countdownTimerRef.current = null;
          begin();
          return null;
        }
        return next;
      });
    }, 1000);
  }, [begin]);

  const analyse = useCallback(
    (lm: NormalizedLandmark[], world: Landmark[]) => {
      const ex = exRef.current;
      const an = anRef.current;

      // ---- Timed hold ----------------------------------------------------
      if (an.kind === "hold") {
        const present = an.needed.every((i) => vis(lm[i]) >= 0.5);
        const now = performance.now();
        const last = lastTsRef.current;
        lastTsRef.current = now;
        if (!present) {
          setFeedback({ text: "Placez-vous dans le champ de la caméra.", tone: "warn" });
          return;
        }
        if (!activeRef.current) {
          setFeedback({ text: "Prêt — appuyez sur « Commencer ».", tone: "info" });
          return;
        }
        const dt = last == null ? 0 : (now - last) / 1000;
        if (dt > 0 && dt < 1) {
          holdRemainingRef.current = Math.max(0, holdRemainingRef.current - dt);
          setHoldRemaining(Math.ceil(holdRemainingRef.current));
          if (holdRemainingRef.current <= 0) {
            setsRef.current += 1;
            setSetsDone(setsRef.current);
            if (setsRef.current >= ex.goalSets) {
              finishAll(setsRef.current);
            } else {
              flashPopup(`Maintien ${setsRef.current} terminé ! Reposez-vous 🧘`, "good");
              holdRemainingRef.current = an.holdSeconds;
              setHoldRemaining(an.holdSeconds);
            }
          }
        }
        setFeedback({ text: an.cue, tone: "good" });
        return;
      }

      // ---- Generic auto rep counting (dominant oscillating joint) --------
      if (an.kind === "auto") {
        if (!activeRef.current) {
          setFeedback({ text: "Prêt — appuyez sur « Commencer ».", tone: "info" });
          return;
        }
        let bestI = -1;
        let bestRange = -1;
        let bestVal = NaN;
        for (let i = 0; i < AUTO_JOINTS.length; i++) {
          const [a, b, c] = AUTO_JOINTS[i];
          if (vis(lm[a]) < 0.5 || vis(lm[b]) < 0.5 || vis(lm[c]) < 0.5) continue;
          const v = angle3(world[a], world[b], world[c]);
          if (v < candMinRef.current[i]) candMinRef.current[i] = v;
          if (v > candMaxRef.current[i]) candMaxRef.current[i] = v;
          const range = candMaxRef.current[i] - candMinRef.current[i];
          if (range > bestRange) {
            bestRange = range;
            bestI = i;
            bestVal = v;
          }
        }
        if (bestI < 0) {
          setFeedback({ text: "Placez-vous face à la caméra.", tone: "warn" });
          return;
        }
        setAngle(Math.round(bestVal));
        if (bestRange < an.minRange) {
          setFeedback({ text: "Commencez le mouvement…", tone: "info" });
          return;
        }
        const mn = candMinRef.current[bestI];
        const mx = candMaxRef.current[bestI];
        const lo = mn + 0.3 * bestRange;
        const hi = mx - 0.3 * bestRange;
        if (phaseRef.current === "up" && bestVal <= lo) phaseRef.current = "down";
        else if (phaseRef.current === "down" && bestVal >= hi) {
          phaseRef.current = "up";
          registerRep();
        }
        setFeedback({ text: an.cue, tone: "good" });
        return;
      }

      // ---- Rep counting from a joint angle -------------------------------
      if (an.kind === "reps") {
        if (an.needed.some((i) => vis(lm[i]) < 0.5)) {
          setAngle(null);
          setFeedback({ text: "Reculez pour être entièrement visible.", tone: "warn" });
          return;
        }
        const [la, lb, lc] = an.jointsLeft;
        const [ra, rb, rc] = an.jointsRight;
        const a = (angle3(world[la], world[lb], world[lc]) + angle3(world[ra], world[rb], world[rc])) / 2;
        setAngle(Math.round(a));

        if (!activeRef.current) {
          setFeedback({ text: "Prêt — appuyez sur « Commencer ».", tone: "info" });
          return;
        }

        if (phaseRef.current === "up" && a < an.enter) {
          phaseRef.current = "down";
          minAngleRef.current = a;
        } else if (phaseRef.current === "down") {
          minAngleRef.current = Math.min(minAngleRef.current, a);
          if (a > an.exit) {
            phaseRef.current = "up";
            if (minAngleRef.current <= ex.goodDepth) registerRep();
            else flashPopup(an.cueMore, "warn");
          }
        }

        if (a <= ex.goodDepth) setFeedback({ text: an.cueGood, tone: "good" });
        else if (a < an.exit) setFeedback({ text: "Continuez…", tone: "info" });
        else setFeedback({ text: "Prêt.", tone: "info" });
      }
    },
    [finishAll, flashPopup, registerRep],
  );

  const loop = useCallback(() => {
    const video = videoRef.current;
    const landmarker = landmarkerRef.current;
    if (video && landmarker && video.currentTime !== lastVideoTimeRef.current) {
      lastVideoTimeRef.current = video.currentTime;
      const result = landmarker.detectForVideo(video, performance.now());
      const lm = result.landmarks?.[0];
      const world = result.worldLandmarks?.[0];
      if (lm && lm.length && world && world.length) analyse(lm, world);
      else {
        lastTsRef.current = null; // avoid a time jump on the next detection
        setFeedback({ text: "Aucune personne détectée.", tone: "warn" });
      }
    }
    rafRef.current = requestAnimationFrame(loop);
  }, [analyse]);

  const start = useCallback(async () => {
    const an = anRef.current;
    setError(null);
    setStatus("loading");
    setReps(0);
    setSetsDone(0);
    setAngle(null);
    repsRef.current = 0;
    setsRef.current = 0;
    phaseRef.current = "up";
    minAngleRef.current = 180;
    completedRef.current = false;
    lastTsRef.current = null;
    candMinRef.current = new Array(AUTO_JOINTS.length).fill(Infinity);
    candMaxRef.current = new Array(AUTO_JOINTS.length).fill(-Infinity);
    if (pacedTimerRef.current) clearInterval(pacedTimerRef.current);
    pacedTimerRef.current = null;
    setPacedRemaining(null);
    if (an.kind === "hold") {
      holdRemainingRef.current = an.holdSeconds;
      setHoldRemaining(an.holdSeconds);
    } else {
      setHoldRemaining(null);
    }

    try {
      // Manual & paced modes need no model — just the camera as a mirror.
      if (an.kind !== "manual" && an.kind !== "paced") {
        const vision = await import("@mediapipe/tasks-vision");
        const fileset = await vision.FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm",
        );
        landmarkerRef.current = await vision.PoseLandmarker.createFromOptions(fileset, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numPoses: 1,
        });
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current!;
      video.srcObject = stream;
      await video.play();

      lastVideoTimeRef.current = -1;
      activeRef.current = false;
      setActive(false);
      setCountdown(null);
      setStatus("running");
      setFeedback({ text: "Placez-vous face à la caméra, puis appuyez sur « Commencer ».", tone: "info" });
      // Model-based modes run the detection loop (to show the live feed/angle);
      // counting only starts after the 3-2-1. Paced/manual wait for begin().
      if (an.kind !== "manual" && an.kind !== "paced") rafRef.current = requestAnimationFrame(loop);
    } catch (e) {
      setStatus("idle");
      setError(
        e instanceof DOMException
          ? "Accès caméra refusé. Autorisez la caméra puis réessayez."
          : "Impossible de charger le modèle. Vérifiez votre connexion internet.",
      );
    }
  }, [loop]);

  const stop = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (pacedTimerRef.current) clearInterval(pacedTimerRef.current);
    pacedTimerRef.current = null;
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    countdownTimerRef.current = null;
    activeRef.current = false;
    setActive(false);
    setCountdown(null);
    if (popupTimeoutRef.current) clearTimeout(popupTimeoutRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    landmarkerRef.current?.close();
    landmarkerRef.current = null;
    setPopup(null);
    setStatus("idle");
    setFeedback({ text: "Séance arrêtée.", tone: "info" });
  }, []);

  useEffect(() => () => stop(), [stop]);

  const toneClass = (tone: Tone) =>
    tone === "good"
      ? "bg-teal-50 text-teal-700"
      : tone === "warn"
        ? "bg-amber-50 text-amber-700"
        : "bg-slate-100 text-slate-600";

  const popupClass = (tone: Tone) =>
    tone === "good" ? "bg-teal-600/90 text-white" : "bg-amber-500/90 text-white";

  // --- Derived display values ---
  const isHold = analyzer.kind === "hold";
  const isManual = analyzer.kind === "manual";
  const holdSeconds = analyzer.kind === "hold" ? analyzer.holdSeconds : 0;

  let progressPct = 0;
  let progressLabel = "";
  if (isHold) {
    const doneSec = setsDone * holdSeconds + (holdSeconds - (holdRemaining ?? holdSeconds));
    const totalSec = prescription.goalSets * holdSeconds;
    progressPct = totalSec > 0 ? Math.min(100, (doneSec / totalSec) * 100) : 0;
    progressLabel = `${setsDone} / ${prescription.goalSets} maintiens`;
  } else {
    const total = prescription.goalSets * prescription.goalReps;
    const done = setsDone * prescription.goalReps + reps;
    progressPct = total > 0 ? Math.min(100, (done / total) * 100) : 0;
    progressLabel = `${done} / ${total} reps`;
  }

  const isPaced = analyzer.kind === "paced";
  const secondsPerRep = analyzer.kind === "paced" ? analyzer.secondsPerRep : 0;

  const goalBadge = isHold
    ? `Objectif : ${prescription.goalSets} × ${holdSeconds}s de maintien`
    : analyzer.kind === "reps"
      ? `Objectif : ${prescription.goalSets} × ${prescription.goalReps} reps · ${analyzer.angleLabel} ≤ ${prescription.goodDepth}°`
      : analyzer.kind === "auto"
        ? `Objectif : ${prescription.goalSets} × ${prescription.goalReps} reps (comptage auto)`
        : isPaced
          ? `Objectif : ${prescription.goalSets} × ${prescription.goalReps} reps · 1 rép. / ${secondsPerRep}s`
          : `Objectif : ${prescription.goalSets} × ${prescription.goalReps} reps`;

  // Auto & rep modes show a live joint angle; a manual "+1" backup for those.
  const showAngle = analyzer.kind === "reps" || analyzer.kind === "auto";
  const angleLabel = analyzer.kind === "reps" ? analyzer.angleLabel : "Angle";
  const showManualButton = isManual || analyzer.kind === "auto";

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4">
      <div className="rounded-lg border border-teal-100 bg-teal-50/60 px-4 py-2.5">
        <span className="rounded-full bg-teal-600 px-2.5 py-0.5 text-xs font-medium text-white">
          {goalBadge}
        </span>
      </div>

      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-slate-900 shadow-sm">
        <video ref={videoRef} className="absolute inset-0 h-full w-full -scale-x-100 object-cover" playsInline muted />

        {/* Top-left counter */}
        <div className="absolute left-3 top-3 rounded-lg bg-black/60 px-3 py-1.5 text-white">
          <span className="text-xs uppercase tracking-wide text-slate-300">
            {isHold ? "Maintien" : "Série"} {Math.min(setsDone + 1, prescription.goalSets)} / {prescription.goalSets}
          </span>
          <div className="text-2xl font-semibold tabular-nums">
            {isHold ? (
              <>{holdRemaining ?? holdSeconds}<span className="text-base font-normal text-slate-300"> s</span></>
            ) : (
              <>{reps} <span className="text-base font-normal text-slate-300">/ {prescription.goalReps}</span></>
            )}
          </div>
        </div>

        {/* Top-right: live angle (rep/auto) or metronome countdown (paced) */}
        {isPaced ? (
          <div className="absolute right-3 top-3 rounded-lg bg-black/60 px-3 py-1.5 text-white">
            <span className="text-xs uppercase tracking-wide text-slate-300">Prochaine rép.</span>
            <div className="text-2xl font-semibold tabular-nums">{pacedRemaining ?? secondsPerRep} s</div>
          </div>
        ) : showAngle && angle !== null ? (
          <div className="absolute right-3 top-3 rounded-lg bg-black/60 px-3 py-1.5 text-white">
            <span className="text-xs uppercase tracking-wide text-slate-300">{angleLabel}</span>
            <div className="text-2xl font-semibold tabular-nums">{angle}°</div>
          </div>
        ) : null}

        {popup && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className={`rounded-full px-5 py-2.5 text-lg font-semibold shadow-lg ${popupClass(popup.tone)}`}>
              {popup.text}
            </div>
          </div>
        )}

        {/* Ready overlay — the patient starts the exercise when in position */}
        {status === "running" && !active && countdown === null && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/40">
            <button
              onClick={startCountdown}
              className="rounded-full bg-teal-600 px-6 py-3 text-lg font-semibold text-white shadow-lg transition hover:bg-teal-700"
            >
              ▶ Commencer l&apos;exercice
            </button>
          </div>
        )}

        {/* 3-2-1 countdown */}
        {countdown !== null && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/60">
            <div className="font-display text-8xl font-bold tabular-nums text-white">{countdown}</div>
          </div>
        )}

        {status !== "running" && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/70 text-sm text-slate-200">
            {status === "loading" ? "Chargement…" : "Caméra inactive"}
          </div>
        )}
      </div>

      {/* Functional progress bar */}
      <div>
        <div className="flex justify-between text-xs text-slate-500">
          <span>Progression</span>
          <span className="tabular-nums">{progressLabel}</span>
        </div>
        <div className="mt-1 h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-teal-500 transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      <div className={`rounded-lg px-4 py-3 text-sm font-medium ${toneClass(feedback.tone)}`} role="status" aria-live="polite">
        {feedback.text}
      </div>

      {error && <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="flex flex-col gap-3">
        {/* Manual tap-to-count (manual mode, or backup in auto mode) */}
        {showManualButton && status === "running" && active && (
          <button
            onClick={registerRep}
            className={`rounded-xl py-4 text-lg font-semibold shadow-sm ${
              isManual
                ? "bg-teal-600 text-white hover:bg-teal-700"
                : "border border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {isManual ? "+1 répétition" : "+1 (correction manuelle)"}
          </button>
        )}

        {status !== "running" ? (
          <button
            onClick={start}
            disabled={status === "loading"}
            className="rounded-md bg-teal-600 px-4 py-2 font-medium text-white hover:bg-teal-700 disabled:opacity-50"
          >
            {status === "loading" ? "Chargement…" : "Démarrer la caméra"}
          </button>
        ) : (
          <button onClick={stop} className="rounded-md border border-slate-300 px-4 py-2 font-medium text-slate-700 hover:bg-slate-50">
            Arrêter
          </button>
        )}
      </div>

      <p className="text-xs text-slate-400">
        L&apos;analyse s&apos;effectue localement dans votre navigateur. Aucune vidéo n&apos;est envoyée à un serveur.
      </p>
    </div>
  );
}
