// =============================================================================
// Exercise analyzers — how the camera measures each kind of movement.
// -----------------------------------------------------------------------------
// Three kinds:
//   • "reps"  — count repetitions from a 3D joint angle (e.g. squat = knee).
//   • "hold"  — a timed hold, gated on the person being visible (planks, stretches).
//   • "manual"— pose can't reliably measure it; camera is a mirror + tap-to-count.
// Exercises are matched to an analyzer by name via `analyzerForExercise`.
// =============================================================================

/** MediaPipe 33-point landmark indices we reference. */
export const LM = {
  nose: 0,
  shoulderL: 11, shoulderR: 12,
  hipL: 23, hipR: 24,
  kneeL: 25, kneeR: 26,
  ankleL: 27, ankleR: 28,
} as const;

export interface RepAnalyzer {
  kind: "reps";
  /** Landmark triples [a,b,c] measured on each side; angle taken at b. */
  jointsLeft: [number, number, number];
  jointsRight: [number, number, number];
  /** Flexion = angle decreases to reach the target (squat). */
  direction: "flexion";
  enter: number; // enter the active phase when the angle passes this
  exit: number; // rep completes when the angle returns past this
  angleLabel: string; // e.g. "Angle genou"
  cueGood: string; // shown when the target range is reached
  cueMore: string; // shown when the rep was too shallow
  needed: number[]; // landmark indices that must be visible
}

/**
 * A body-line check for a static hold: the angle at `joints[1]` should stay at
 * or above `minAngle` (≈180° = perfectly straight). Present only on holds where
 * the line is large, unambiguous and plainly visible — a sagging plank. Absent
 * on stretches and neck isometrics, where no defensible form claim exists.
 */
export interface HoldAlignment {
  jointsLeft: [number, number, number];
  jointsRight: [number, number, number];
  minAngle: number;
  cueBad: string;
}

export interface HoldAnalyzer {
  kind: "hold";
  holdSeconds: number; // seconds to hold per set
  cue: string;
  needed: number[];
  /** When set, the hold also judges posture — not just elapsed time. */
  alignment?: HoldAlignment;
}

export interface ManualAnalyzer {
  kind: "manual";
  cue: string;
}

/**
 * Generic rep counter: tracks the joint that moves the most and counts each
 * oscillation cycle. Works for any large-amplitude repeated movement without
 * per-exercise tuning; it counts reps but does not judge form.
 */
export interface AutoAnalyzer {
  kind: "auto";
  minRange: number; // min peak-to-peak amplitude (deg) to accept as real reps
  cue: string;
}

/**
 * Paced (metronome) counter: the camera is a mirror and the app adds +1 rep
 * every `secondsPerRep`. For small movements a webcam can't measure — the
 * patient follows the rhythm.
 */
export interface PacedAnalyzer {
  kind: "paced";
  secondsPerRep: number;
  cue: string;
}

export type Analyzer =
  | RepAnalyzer
  | HoldAnalyzer
  | ManualAnalyzer
  | AutoAnalyzer
  | PacedAnalyzer;

/** Squat — the reference rep analyzer. `target` comes from prescription.goodDepth. */
export const SQUAT_ANALYZER: RepAnalyzer = {
  kind: "reps",
  jointsLeft: [LM.hipL, LM.kneeL, LM.ankleL],
  jointsRight: [LM.hipR, LM.kneeR, LM.ankleR],
  direction: "flexion",
  enter: 120,
  exit: 155,
  angleLabel: "Angle genou",
  cueGood: "Bonne profondeur 👍 Remontez.",
  cueMore: "Presque ! Descendez plus bas 👇",
  needed: [LM.hipL, LM.hipR, LM.kneeL, LM.kneeR, LM.ankleL, LM.ankleR],
};

/**
 * Forward lunge — standing, large range of motion, both knees flexing to ≈90°.
 * The literature validates pose tracking on exactly this profile, so a depth
 * claim is defensible here, as it is for the squat. Averaging both knees is
 * deliberate: in a correct lunge both bend together, and averaging survives one
 * knee being briefly occluded by the other.
 */
export const LUNGE_ANALYZER: RepAnalyzer = {
  kind: "reps",
  jointsLeft: [LM.hipL, LM.kneeL, LM.ankleL],
  jointsRight: [LM.hipR, LM.kneeR, LM.ankleR],
  direction: "flexion",
  enter: 130, // deeper than standing (~170°) — the descent has begun
  exit: 155, // back up: the rep is complete
  angleLabel: "Angle genou",
  cueGood: "Bonne descente 👍 Remontez.",
  cueMore: "Presque ! Pliez davantage le genou avant 👇",
  needed: [LM.hipL, LM.hipR, LM.kneeL, LM.kneeR, LM.ankleL, LM.ankleR],
};

/** Plank body-line: shoulder→hip→knee should stay near straight. */
const PLANK_ALIGNMENT: HoldAlignment = {
  jointsLeft: [LM.shoulderL, LM.hipL, LM.kneeL],
  jointsRight: [LM.shoulderR, LM.hipR, LM.kneeR],
  minAngle: 160, // below this the hips have dropped (or piked up)
  cueBad: "Alignez le corps — ne creusez pas les reins.",
};

const HOLD_FULL_BODY: number[] = [LM.hipL, LM.hipR, LM.kneeL, LM.kneeR];
const HOLD_UPPER: number[] = [LM.shoulderL, LM.shoulderR, LM.nose];

/** Pick an analyzer from the exercise name (French, from the seed library). */
export function analyzerForExercise(name: string): Analyzer {
  const n = name.toLowerCase();

  if (n.includes("squat")) return SQUAT_ANALYZER;
  if (n.includes("fente")) return LUNGE_ANALYZER;

  // Timed holds — planks, balance, isometrics, and stretches.
  // Planks are the one hold whose posture we judge: the body line is long and
  // unmistakable, so a sagging hip is measurable rather than guessed at.
  if (n.includes("planche") || n.includes("gainage"))
    return {
      kind: "hold",
      holdSeconds: 30,
      cue: "Tenez la position, corps aligné.",
      needed: [...HOLD_FULL_BODY, LM.shoulderL, LM.shoulderR],
      alignment: PLANK_ALIGNMENT,
    };
  if (n.includes("équilibre") || n.includes("equilibre"))
    return { kind: "hold", holdSeconds: 30, cue: "Gardez l'équilibre.", needed: HOLD_FULL_BODY };
  if (n.includes("isométrique") || n.includes("isometrique"))
    return { kind: "hold", holdSeconds: 6, cue: "Poussez et maintenez sans bouger.", needed: HOLD_UPPER };
  if (n.includes("étirement") || n.includes("etirement")) {
    const upper = n.includes("cervical") || n.includes("menton") || n.includes("cou");
    return {
      kind: "hold",
      holdSeconds: upper ? 20 : 30,
      cue: "Maintenez l'étirement sans forcer.",
      needed: upper ? HOLD_UPPER : HOLD_FULL_BODY,
    };
  }

  // Small cervical / neck movements a front webcam can't measure — paced.
  if (
    n.includes("rétraction") || n.includes("retraction") || n.includes("menton") ||
    n.includes("inclinaison") || (n.includes("cervical") && !n.includes("étirement")) ||
    n.includes("scapulaire")
  )
    return { kind: "paced", secondsPerRep: 5, cue: "Suivez le rythme, une répétition à chaque top." };

  // Small ankle / calf movements — paced (subtle from the front).
  if (
    n.includes("mollet") || n.includes("pointe") || n.includes("cheville") ||
    n.includes("éversion") || n.includes("eversion") || n.includes("alphabet")
  )
    return { kind: "paced", secondsPerRep: 4, cue: "Suivez le rythme, un mouvement à chaque top." };

  // Floor / quadruped movements — 3D pose tracking is unreliable on all fours,
  // so pace them instead of auto-counting.
  if (
    n.includes("quadrupède") || n.includes("quadrupede") || n.includes("bird") ||
    n.includes("chat-vache") || n.includes("chat vache")
  )
    return { kind: "paced", secondsPerRep: 5, cue: "Alternez à chaque top, en contrôle." };

  // Small hand / wrist / pendulum movements — pace them.
  if (
    n.includes("poignet") || n.includes("doigts") || n.includes("serrage") ||
    n.includes("pendulaire")
  )
    return { kind: "paced", secondsPerRep: 3, cue: "Suivez le rythme, un mouvement à chaque top." };

  // Everything else (squats, lunges, hops…) — generic 3D auto rep counting.
  return { kind: "auto", minRange: 25, cue: "Comptage automatique de vos répétitions 💪" };
}

/**
 * Rest (in seconds) to take between sets, scaled to how demanding the exercise
 * is. Small paced movements need little recovery; compound strength work and
 * long holds need more. Clamped to a sensible 15–45 s window.
 */
export function restSecondsFor(analyzer: Analyzer, goalReps = 10): number {
  switch (analyzer.kind) {
    case "paced":
      return 15; // small, low-load movements (neck, ankle, wrist)
    case "manual":
      return 20;
    case "hold":
      return analyzer.holdSeconds >= 30 ? 35 : 25; // long isometric holds fatigue more
    case "reps":
    case "auto":
      return goalReps >= 12 ? 45 : 35; // compound strength work
    default:
      return 20;
  }
}
