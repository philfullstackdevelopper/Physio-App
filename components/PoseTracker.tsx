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

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  PoseLandmarker as PoseLandmarkerType,
  NormalizedLandmark,
  Landmark,
} from "@mediapipe/tasks-vision";
import { DEFAULT_SQUAT, type Prescription } from "@/lib/exercise/prescription";
import { SQUAT_ANALYZER, restSecondsFor, type Analyzer } from "@/lib/exercise/analyzers";
import {
  MIN_VIS_TRACK,
  MIN_VIS_FORM,
  UNVERIFIED_FORM_CUE,
  UNVERIFIED_HOLD_CUE,
} from "@/lib/exercise/cameraSuitability";
import ExerciseGuide from "@/components/ExerciseGuide";
import {
  adjustForLevel,
  adjustRest,
  clampLevel,
  levelLabel,
  MIN_LEVEL,
  DEFAULT_MAX_LEVEL,
} from "@/lib/exercise/intensity";

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
  onLevelChange,
  exerciseName,
  instructions = null,
  maxLevel = DEFAULT_MAX_LEVEL,
}: {
  prescription?: Prescription;
  analyzer?: Analyzer;
  onComplete?: (done: number) => void;
  /** Fires whenever the patient moves the intensity dial, so it can be recorded
   *  even if they finish the exercise by hand rather than by reaching the goal. */
  onLevelChange?: (level: number) => void;
  /** When given, the "how do I do this?" card stays on screen during the exercise. */
  exerciseName?: string;
  instructions?: string | null;
  /** Highest level this patient may select — see maxLevelFor(). 0 = ease only. */
  maxLevel?: number;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const landmarkerRef = useRef<PoseLandmarkerType | null>(null);
  const rafRef = useRef<number | null>(null);
  // Always points at the latest `loop` so the animation frame can re-schedule
  // itself without the function referencing its own binding (which the React
  // hooks lint flags and which would block the production build).
  const loopRef = useRef<() => void>(() => {});
  const streamRef = useRef<MediaStream | null>(null);
  const lastVideoTimeRef = useRef(-1);
  const popupTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // The patient's own live intensity dial. Session-local: never written back to
  // their prescription, so tomorrow starts from what the practitioner set.
  const [level, setLevel] = useState(0);
  const adjusted = useMemo(() => adjustForLevel(prescription, level), [prescription, level]);

  // Every change goes through here, so the parent always knows the level even if
  // the patient ends the exercise by hand instead of reaching the goal.
  const applyLevel = useCallback(
    (next: number) => {
      const clamped = clampLevel(next, maxLevel);
      setLevel(clamped);
      onLevelChange?.(clamped);
    },
    [maxLevel, onLevelChange],
  );
  const bumpLevel = (delta: number) => applyLevel(level + delta);

  const exRef = useRef(adjusted);
  const anRef = useRef(analyzer);
  const levelRef = useRef(level);
  useEffect(() => {
    // The camera loop reads targets through these refs, so changing the dial
    // mid-set takes effect on the very next repetition.
    exRef.current = adjusted;
    anRef.current = analyzer;
    levelRef.current = level;
  }, [adjusted, analyzer, level]);

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
  // Pause: freezes every counter without ending the exercise.
  const pausedRef = useRef(false);
  const [paused, setPaused] = useState(false);
  // Guidance mode: "camera" (pose tracking) or "audio" (beeps only, no video).
  const modeRef = useRef<"camera" | "audio">("camera");
  const [mode, setMode] = useState<"camera" | "audio">("camera");
  const audioCtxRef = useRef<AudioContext | null>(null);
  const holdTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Rest between sets: a difficulty-scaled countdown that freezes counting.
  const restingRef = useRef(false);
  const restRemainingRef = useRef(0);
  const restTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [rest, setRest] = useState<number | null>(null);
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

  // Short synthesized "beep" (Web Audio) — no sound files needed. Used to pace
  // the audio-only mode: a top per rep, a longer tone at the end of a hold/set.
  const beep = useCallback((freq: number, ms: number) => {
    try {
      const w = window as unknown as {
        AudioContext?: typeof AudioContext;
        webkitAudioContext?: typeof AudioContext;
      };
      const Ctor = w.AudioContext ?? w.webkitAudioContext;
      if (!Ctor) return;
      let ctx = audioCtxRef.current;
      if (!ctx) {
        ctx = new Ctor();
        audioCtxRef.current = ctx;
      }
      if (ctx.state === "suspended") void ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const t = ctx.currentTime;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.25, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + ms / 1000);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + ms / 1000 + 0.02);
    } catch {
      /* audio unavailable — stay silent */
    }
  }, []);

  // Create/resume the audio context on a user gesture so later beeps can play.
  const unlockAudio = useCallback(() => {
    try {
      const w = window as unknown as {
        AudioContext?: typeof AudioContext;
        webkitAudioContext?: typeof AudioContext;
      };
      const Ctor = w.AudioContext ?? w.webkitAudioContext;
      if (!Ctor) return;
      audioCtxRef.current = audioCtxRef.current ?? new Ctor();
      void audioCtxRef.current.resume?.();
    } catch {
      /* ignore */
    }
  }, []);

  // End a rest early / when its countdown hits zero: resume the next set.
  const endRest = useCallback(() => {
    if (restTimerRef.current) clearInterval(restTimerRef.current);
    restTimerRef.current = null;
    restingRef.current = false;
    setRest(null);
    const an = anRef.current;
    if (an.kind === "hold") {
      holdRemainingRef.current = an.holdSeconds; // fresh target for the next hold
      setHoldRemaining(an.holdSeconds);
    }
    beep(880, 150); // "go" for the next set
    setFeedback({ text: "C'est reparti ! Série suivante 💪", tone: "good" });
  }, [beep]);

  // Rest between sets — counting stays frozen (via restingRef) until it ends.
  const startRest = useCallback(
    (seconds: number) => {
      restingRef.current = true;
      restRemainingRef.current = seconds;
      setRest(seconds);
      if (restTimerRef.current) clearInterval(restTimerRef.current);
      restTimerRef.current = setInterval(() => {
        if (completedRef.current) {
          if (restTimerRef.current) clearInterval(restTimerRef.current);
          restTimerRef.current = null;
          return;
        }
        if (pausedRef.current) return; // a manual pause also freezes the rest
        restRemainingRef.current = Math.max(0, restRemainingRef.current - 0.25);
        setRest(Math.ceil(restRemainingRef.current));
        if (restRemainingRef.current <= 0) endRest();
      }, 250);
    },
    [endRest],
  );

  const finishAll = useCallback(
    (done: number) => {
      flashPopup("Objectif atteint ! 🎉 Bravo", "good");
      if (!completedRef.current) {
        completedRef.current = true;
        // The level is read from the ref, not the closure: the patient may have
        // moved the dial after this callback was created.
        onComplete?.(done);
      }
    },
    [flashPopup, onComplete],
  );

  // One completed repetition (used by rep detection AND the manual button).
  const registerRep = useCallback(() => {
    if (pausedRef.current || restingRef.current) return; // ignore stray taps mid-pause/rest
    const ex = exRef.current;
    repsRef.current += 1;
    setReps(repsRef.current);
    beep(660, 90); // audible "top" for each rep (camera AND audio modes)
    if (repsRef.current >= ex.goalReps) {
      setsRef.current += 1;
      setSetsDone(setsRef.current);
      repsRef.current = 0;
      setReps(0);
      beep(1200, 220); // set complete
      if (setsRef.current >= ex.goalSets) {
        finishAll(setsRef.current * ex.goalReps);
      } else {
        flashPopup(`Série ${setsRef.current} terminée ! Reposez-vous 🧘`, "good");
        startRest(adjustRest(restSecondsFor(anRef.current, ex.goalReps), levelRef.current)); // rest before next set
      }
    } else {
      flashPopup("Belle répétition ! 💪", "good");
    }
  }, [beep, finishAll, flashPopup, startRest]);

  // Metronome: add +1 rep every `secondsPerRep` while running.
  const startPaced = useCallback(
    (secondsPerRep: number) => {
      // Guard: never let two metronome timers run at once (would count double-speed).
      if (pacedTimerRef.current) clearInterval(pacedTimerRef.current);
      pacedRemainingRef.current = secondsPerRep;
      setPacedRemaining(secondsPerRep);
      pacedTimerRef.current = setInterval(() => {
        if (completedRef.current) {
          if (pacedTimerRef.current) clearInterval(pacedTimerRef.current);
          pacedTimerRef.current = null;
          return;
        }
        if (pausedRef.current) return; // frozen while paused
        if (restingRef.current) return; // frozen during a rest
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

  // Audio-only timed hold: counts the seconds down by the clock (no camera),
  // beeping at the end of each hold. Mirrors the camera hold logic.
  const startHoldTimer = useCallback(
    () => {
      if (holdTimerRef.current) clearInterval(holdTimerRef.current);
      holdTimerRef.current = setInterval(() => {
        const ex = exRef.current;
        if (completedRef.current) {
          if (holdTimerRef.current) clearInterval(holdTimerRef.current);
          holdTimerRef.current = null;
          return;
        }
        if (pausedRef.current) return; // frozen while paused
        if (restingRef.current) return; // frozen during a rest
        holdRemainingRef.current = Math.max(0, holdRemainingRef.current - 0.25);
        setHoldRemaining(Math.ceil(holdRemainingRef.current));
        if (holdRemainingRef.current <= 0) {
          beep(1200, 300); // end of a hold
          setsRef.current += 1;
          setSetsDone(setsRef.current);
          if (setsRef.current >= ex.goalSets) {
            if (holdTimerRef.current) clearInterval(holdTimerRef.current);
            holdTimerRef.current = null;
            finishAll(setsRef.current);
          } else {
            flashPopup(`Maintien ${setsRef.current} terminé ! Reposez-vous 🧘`, "good");
            startRest(adjustRest(restSecondsFor(anRef.current, ex.goalReps), levelRef.current)); // rest before next hold
          }
        }
      }, 250);
    },
    [beep, finishAll, flashPopup, startRest],
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
    pausedRef.current = false;
    setPaused(false);
    restingRef.current = false;
    setRest(null);
    if (restTimerRef.current) clearInterval(restTimerRef.current);
    restTimerRef.current = null;
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
    beep(880, 150); // "go"
    // Start the matching timer. In audio mode (no camera) we pace holds AND
    // reps by the clock; in camera mode the video drives hold/rep counting.
    if (an.kind === "hold") {
      if (modeRef.current === "audio") startHoldTimer();
    } else if (an.kind === "paced") {
      startPaced(an.secondsPerRep);
    } else if (modeRef.current === "audio") {
      startPaced(3); // pace generic reps by sound when there's no camera
    }
  }, [beep, startPaced, startHoldTimer]);

  // Patient-triggered 3-2-1 countdown before the exercise begins.
  const startCountdown = useCallback(() => {
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    // Track the count in a plain closure variable so the "go" side effect lives
    // in the interval callback (run once), NOT inside a setState updater (which
    // React re-runs in Strict Mode — that double-fired begin() and started the
    // exercise timer twice, counting at double speed).
    let remaining = 3;
    setCountdown(remaining);
    countdownTimerRef.current = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
        setCountdown(null);
        begin();
      } else {
        setCountdown(remaining);
      }
    }, 1000);
  }, [begin]);

  // Pause / resume — flip the flag; every counter checks it.
  const togglePause = useCallback(() => {
    const next = !pausedRef.current;
    pausedRef.current = next;
    setPaused(next);
    lastTsRef.current = null; // reset hold timing so it doesn't jump on resume
    setFeedback(
      next
        ? { text: "⏸️ En pause — reprenez quand vous êtes prêt.", tone: "info" }
        : { text: "C'est reparti ! 💪", tone: "good" },
    );
  }, []);

  const analyse = useCallback(
    (lm: NormalizedLandmark[], world: Landmark[]) => {
      const ex = exRef.current;
      const an = anRef.current;

      // While paused or resting, freeze all counting (and keep the hold clock
      // from jumping when it resumes).
      if (pausedRef.current || restingRef.current) {
        lastTsRef.current = null;
        return;
      }

      // ---- Timed hold ----------------------------------------------------
      if (an.kind === "hold") {
        const present = an.needed.every((i) => vis(lm[i]) >= MIN_VIS_TRACK);
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
              startRest(adjustRest(restSecondsFor(an, ex.goalReps), levelRef.current)); // rest before next hold
            }
          }
        }
        // Body-line check, on the holds that carry one. The timer keeps running
        // either way: a sagging plank earns a correction, not a lost second, and
        // a badly-framed one earns no verdict at all.
        if (an.alignment) {
          const al = an.alignment;
          const joints = [...al.jointsLeft, ...al.jointsRight];
          if (joints.some((i) => vis(lm[i]) < MIN_VIS_FORM)) {
            setFeedback({ text: UNVERIFIED_HOLD_CUE, tone: "warn" });
            return;
          }
          const [la, lb, lc] = al.jointsLeft;
          const [ra, rb, rc] = al.jointsRight;
          const line =
            (angle3(world[la], world[lb], world[lc]) + angle3(world[ra], world[rb], world[rc])) / 2;
          setAngle(Math.round(line));
          if (line < al.minAngle) {
            setFeedback({ text: al.cueBad, tone: "warn" });
            return;
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
        if (an.needed.some((i) => vis(lm[i]) < MIN_VIS_TRACK)) {
          setAngle(null);
          setFeedback({ text: "Reculez pour être entièrement visible.", tone: "warn" });
          return;
        }
        // Visible enough to follow the movement — but good enough to judge how
        // deep it went? Only above the higher bar do we say anything about form.
        const formConfident = an.needed.every((i) => vis(lm[i]) >= MIN_VIS_FORM);

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
            // When we can't trust the depth reading, count the rep rather than
            // silently withhold it: the patient must never lose a repetition
            // because of a bad camera angle.
            if (!formConfident || minAngleRef.current <= ex.goodDepth) registerRep();
            else flashPopup(an.cueMore, "warn");
          }
        }

        if (!formConfident) setFeedback({ text: UNVERIFIED_FORM_CUE, tone: "warn" });
        else if (a <= ex.goodDepth) setFeedback({ text: an.cueGood, tone: "good" });
        else if (a < an.exit) setFeedback({ text: "Continuez…", tone: "info" });
        else setFeedback({ text: "Prêt.", tone: "info" });
      }
    },
    [finishAll, flashPopup, registerRep, startRest],
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
    rafRef.current = requestAnimationFrame(() => loopRef.current());
  }, [analyse]);

  // Keep the ref pointing at the current loop for the self-rescheduling above.
  useEffect(() => {
    loopRef.current = loop;
  }, [loop]);

  const start = useCallback(async () => {
    const an = anRef.current;
    setError(null);
    setStatus("loading");
    modeRef.current = "camera";
    setMode("camera");
    unlockAudio(); // allow the rep beeps to play in camera mode too
    restingRef.current = false;
    setRest(null);
    if (restTimerRef.current) clearInterval(restTimerRef.current);
    restTimerRef.current = null;
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
    pausedRef.current = false;
    setPaused(false);
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
  }, [loop, unlockAudio]);

  // Audio-only start: no camera, no model — just the beeps + on-screen timer.
  const startAudio = useCallback(() => {
    const an = anRef.current;
    setError(null);
    setReps(0);
    setSetsDone(0);
    setAngle(null);
    repsRef.current = 0;
    setsRef.current = 0;
    phaseRef.current = "up";
    minAngleRef.current = 180;
    completedRef.current = false;
    lastTsRef.current = null;
    if (pacedTimerRef.current) clearInterval(pacedTimerRef.current);
    pacedTimerRef.current = null;
    setPacedRemaining(null);
    if (holdTimerRef.current) clearInterval(holdTimerRef.current);
    holdTimerRef.current = null;
    pausedRef.current = false;
    setPaused(false);
    restingRef.current = false;
    setRest(null);
    if (restTimerRef.current) clearInterval(restTimerRef.current);
    restTimerRef.current = null;
    if (an.kind === "hold") {
      holdRemainingRef.current = an.holdSeconds;
      setHoldRemaining(an.holdSeconds);
    } else {
      setHoldRemaining(null);
    }
    modeRef.current = "audio";
    setMode("audio");
    unlockAudio(); // allow the beeps to play (this runs on a user gesture)
    activeRef.current = false;
    setActive(false);
    setCountdown(null);
    setStatus("running");
    setFeedback({ text: "Installez-vous, puis appuyez sur « Commencer ». Suivez les bips 🔊", tone: "info" });
  }, [unlockAudio]);

  const stop = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (pacedTimerRef.current) clearInterval(pacedTimerRef.current);
    pacedTimerRef.current = null;
    if (holdTimerRef.current) clearInterval(holdTimerRef.current);
    holdTimerRef.current = null;
    if (restTimerRef.current) clearInterval(restTimerRef.current);
    restTimerRef.current = null;
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    countdownTimerRef.current = null;
    activeRef.current = false;
    setActive(false);
    setCountdown(null);
    pausedRef.current = false;
    setPaused(false);
    restingRef.current = false;
    setRest(null);
    modeRef.current = "camera";
    setMode("camera");
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
    const totalSec = adjusted.goalSets * holdSeconds;
    progressPct = totalSec > 0 ? Math.min(100, (doneSec / totalSec) * 100) : 0;
    progressLabel = `${setsDone} / ${adjusted.goalSets} maintiens`;
  } else {
    const total = adjusted.goalSets * adjusted.goalReps;
    const done = setsDone * adjusted.goalReps + reps;
    progressPct = total > 0 ? Math.min(100, (done / total) * 100) : 0;
    progressLabel = `${done} / ${total} reps`;
  }

  const isPaced = analyzer.kind === "paced";
  const secondsPerRep = analyzer.kind === "paced" ? analyzer.secondsPerRep : 0;

  const goalBadge = isHold
    ? `Objectif : ${adjusted.goalSets} × ${holdSeconds}s de maintien`
    : analyzer.kind === "reps"
      ? `Objectif : ${adjusted.goalSets} × ${adjusted.goalReps} reps · ${analyzer.angleLabel} ≤ ${adjusted.goodDepth}°`
      : analyzer.kind === "auto"
        ? `Objectif : ${adjusted.goalSets} × ${adjusted.goalReps} reps (comptage auto)`
        : isPaced
          ? `Objectif : ${adjusted.goalSets} × ${adjusted.goalReps} reps · 1 rép. / ${secondsPerRep}s`
          : `Objectif : ${adjusted.goalSets} × ${adjusted.goalReps} reps`;

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

        {/* The patient's own dial. Takes effect on the next repetition — the loop
            reads its targets through exRef, which follows `adjusted`. */}
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          <button
            onClick={() => bumpLevel(1)}
            disabled={level >= maxLevel}
            className="rounded-md border border-slate-300 bg-white px-3 py-1 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
          >
            + Intensifier
          </button>
          <button
            onClick={() => bumpLevel(-1)}
            disabled={level <= MIN_LEVEL}
            className="rounded-md border border-slate-300 bg-white px-3 py-1 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
          >
            − Alléger
          </button>
          <span className={`text-xs ${level === 0 ? "text-slate-500" : "font-medium text-teal-800"}`}>
            {levelLabel(level)}
          </span>
          {level !== 0 && (
            <button onClick={() => applyLevel(0)} className="text-xs text-slate-500 hover:underline">
              Revenir à la prescription
            </button>
          )}
        </div>

        {/* A greyed-out button with no explanation reads as a bug. Say why. */}
        {maxLevel === 0 ? (
          <p className="mt-1 text-xs text-slate-500">
            À ce stade de votre rééducation, l&apos;intensité ne peut pas être augmentée. Vous pouvez
            toujours alléger si besoin.
          </p>
        ) : (
          level >= maxLevel && (
            <p className="mt-1 text-xs text-slate-500">
              C&apos;est le maximum recommandé pour votre profil et votre phase de récupération.
            </p>
          )
        )}
        {level !== 0 && (
          <p className="mt-1 text-xs text-slate-500">
            Réglage valable pour cette séance uniquement. Votre praticien garde la main sur votre
            programme.
          </p>
        )}
      </div>

      {/* Shown before the exercise starts: the times/rhythm are a guide to follow. */}
      {!active && (
        <p className="rounded-lg bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
          ⏱️ Pour cet exercice, les durées et le rythme indiqués sont des repères
          pour vous guider — suivez-les au mieux, sans forcer.
        </p>
      )}

      {mode === "audio" ? (
        <div className="relative flex aspect-[4/3] w-full flex-col items-center justify-center overflow-hidden rounded-2xl bg-slate-900 text-white shadow-sm">
          <span className="text-xs uppercase tracking-wide text-slate-300">
            {isHold ? "Maintien" : "Série"} {Math.min(setsDone + 1, adjusted.goalSets)} / {adjusted.goalSets}
          </span>
          <div className="mt-1 text-7xl font-bold tabular-nums">
            {isHold ? (
              <>
                {holdRemaining ?? holdSeconds}
                <span className="text-3xl font-normal text-slate-300"> s</span>
              </>
            ) : (
              <>
                {reps}
                <span className="text-3xl font-normal text-slate-300"> / {adjusted.goalReps}</span>
              </>
            )}
          </div>
          {active && !isHold && (
            <div className="mt-2 text-sm text-slate-300">
              Prochaine rép. dans {pacedRemaining ?? secondsPerRep} s
            </div>
          )}
          <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs text-slate-200">
            🔊 Guidage sonore — suivez les bips
          </div>

          {popup && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className={`rounded-full px-5 py-2.5 text-lg font-semibold shadow-lg ${popupClass(popup.tone)}`}>
                {popup.text}
              </div>
            </div>
          )}
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
          {countdown !== null && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-900/60">
              <div className="font-display text-8xl font-bold tabular-nums text-white">{countdown}</div>
            </div>
          )}
          {rest !== null && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/80 text-white">
              <span className="text-sm uppercase tracking-wide text-slate-300">Repos 🧘</span>
              <div className="font-display text-7xl font-bold tabular-nums">
                {rest}
                <span className="text-2xl font-normal text-slate-300"> s</span>
              </div>
              <span className="mt-1 text-sm text-slate-300">
                Série {Math.min(setsDone + 1, adjusted.goalSets)} / {adjusted.goalSets} à suivre
              </span>
              <button
                onClick={endRest}
                className="mt-4 rounded-full border border-white/40 px-4 py-1.5 text-sm font-medium text-white hover:bg-white/10"
              >
                Passer le repos →
              </button>
            </div>
          )}
        </div>
      ) : (
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-slate-900 shadow-sm">
        <video ref={videoRef} className="absolute inset-0 h-full w-full -scale-x-100 object-cover" playsInline muted />

        {/* Top-left counter */}
        <div className="absolute left-3 top-3 rounded-lg bg-black/60 px-3 py-1.5 text-white">
          <span className="text-xs uppercase tracking-wide text-slate-300">
            {isHold ? "Maintien" : "Série"} {Math.min(setsDone + 1, adjusted.goalSets)} / {adjusted.goalSets}
          </span>
          <div className="text-2xl font-semibold tabular-nums">
            {isHold ? (
              <>{holdRemaining ?? holdSeconds}<span className="text-base font-normal text-slate-300"> s</span></>
            ) : (
              <>{reps} <span className="text-base font-normal text-slate-300">/ {adjusted.goalReps}</span></>
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

        {rest !== null && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/80 text-white">
            <span className="text-sm uppercase tracking-wide text-slate-300">Repos 🧘</span>
            <div className="font-display text-7xl font-bold tabular-nums">
              {rest}
              <span className="text-2xl font-normal text-slate-300"> s</span>
            </div>
            <span className="mt-1 text-sm text-slate-300">
              Série {Math.min(setsDone + 1, adjusted.goalSets)} / {adjusted.goalSets} à suivre
            </span>
            <button
              onClick={endRest}
              className="mt-4 rounded-full border border-white/40 px-4 py-1.5 text-sm font-medium text-white hover:bg-white/10"
            >
              Passer le repos →
            </button>
          </div>
        )}

        {status !== "running" && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/70 text-sm text-slate-200">
            {status === "loading" ? "Chargement…" : "Caméra inactive"}
          </div>
        )}
      </div>
      )}

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
        {showManualButton && mode === "camera" && status === "running" && active && (
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

        {/* Pause / resume — only while an exercise is actively counting. */}
        {status === "running" && active && (
          <button
            onClick={togglePause}
            className={`rounded-xl py-3 text-base font-semibold shadow-sm ${
              paused
                ? "bg-teal-600 text-white hover:bg-teal-700"
                : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            {paused ? "▶ Reprendre" : "⏸ Pause"}
          </button>
        )}

        {status !== "running" ? (
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              onClick={start}
              disabled={status === "loading"}
              className="flex-1 rounded-md bg-teal-600 px-4 py-2.5 font-medium text-white hover:bg-teal-700 disabled:opacity-50"
            >
              {status === "loading" ? "Chargement…" : "🎥 Avec caméra"}
            </button>
            <button
              onClick={startAudio}
              disabled={status === "loading"}
              className="flex-1 rounded-md border border-teal-600 px-4 py-2.5 font-medium text-teal-700 hover:bg-teal-50 disabled:opacity-50"
            >
              🔊 Sans caméra (son)
            </button>
          </div>
        ) : (
          <button onClick={stop} className="rounded-md border border-slate-300 px-4 py-2 font-medium text-slate-700 hover:bg-slate-50">
            Arrêter
          </button>
        )}
      </div>

      {/* The instructions stay reachable while the patient is actually moving —
          not only on the intro screen he has already left behind. */}
      {exerciseName && (
        <ExerciseGuide
          name={exerciseName}
          instructions={instructions}
          goalText={goalBadge.replace(/^Objectif : /, "")}
        />
      )}

      <p className="text-xs text-slate-400">
        L&apos;analyse s&apos;effectue localement dans votre navigateur. Aucune vidéo n&apos;est envoyée à un serveur.
      </p>
    </div>
  );
}
