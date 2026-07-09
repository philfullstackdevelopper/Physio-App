// =============================================================================
// ExerciseIllustration — simple line-art schematics (pictograms) per exercise.
// 100% original content (no external images) → fully rights-free, never breaks.
// Pick a pose from the exercise name; falls back to a neutral standing figure.
// =============================================================================

import type { ReactNode } from "react";

const HEAD_R = 6;

const POSES: Record<string, ReactNode> = {
  // Neutral standing figure.
  standing: (
    <>
      <circle cx="60" cy="18" r={HEAD_R} />
      <path d="M60 24 L60 54" />
      <path d="M60 30 L46 44 M60 30 L74 44" />
      <path d="M60 54 L50 84 M60 54 L70 84" />
      <line x1="14" y1="86" x2="106" y2="86" opacity="0.3" strokeWidth="2" />
    </>
  ),
  // Squat — hips low, knees bent, arms forward.
  squat: (
    <>
      <circle cx="58" cy="16" r={HEAD_R} />
      <path d="M58 22 L58 46" />
      <path d="M58 28 L82 34 M58 30 L82 40" />
      <path d="M58 46 L42 54 L48 84 M58 46 L74 54 L70 84" />
      <line x1="14" y1="86" x2="106" y2="86" opacity="0.3" strokeWidth="2" />
    </>
  ),
  // Front lunge — staggered stance.
  lunge: (
    <>
      <circle cx="52" cy="16" r={HEAD_R} />
      <path d="M52 22 L54 48" />
      <path d="M53 28 L44 42 M53 28 L62 42" />
      <path d="M54 48 L38 84 M54 48 L74 62 L74 84" />
      <line x1="14" y1="86" x2="106" y2="86" opacity="0.3" strokeWidth="2" />
    </>
  ),
  // Plank / core hold — diagonal body on a forearm.
  plank: (
    <>
      <circle cx="30" cy="52" r={HEAD_R} />
      <path d="M36 55 L98 74" />
      <path d="M38 55 L40 74 L26 74" />
      <line x1="14" y1="76" x2="108" y2="76" opacity="0.3" strokeWidth="2" />
    </>
  ),
  // Glute bridge — lying, hips lifted.
  bridge: (
    <>
      <circle cx="22" cy="72" r={HEAD_R} />
      <path d="M28 74 L60 54 L82 60 L88 74" />
      <path d="M28 74 L16 74" />
      <line x1="12" y1="76" x2="100" y2="76" opacity="0.3" strokeWidth="2" />
    </>
  ),
  // Quadruped (cat-cow / bird-dog) — on hands and knees.
  quadruped: (
    <>
      <circle cx="30" cy="56" r={HEAD_R} />
      <path d="M36 58 Q58 50 80 58" />
      <path d="M40 58 L34 74 M78 58 L80 74" />
      <line x1="14" y1="76" x2="106" y2="76" opacity="0.3" strokeWidth="2" />
    </>
  ),
  // Lying on back, knees bent (pelvic tilt / knee-to-chest / breathing).
  lying: (
    <>
      <circle cx="24" cy="66" r={HEAD_R} />
      <path d="M30 70 L66 70 L70 54 L84 62" />
      <path d="M66 70 L96 70" />
      <line x1="12" y1="72" x2="104" y2="72" opacity="0.3" strokeWidth="2" />
    </>
  ),
  // Single-leg balance.
  balance: (
    <>
      <circle cx="60" cy="16" r={HEAD_R} />
      <path d="M60 22 L60 52" />
      <path d="M60 28 L44 40 M60 28 L76 40" />
      <path d="M60 52 L60 86" />
      <path d="M60 52 L74 62 L66 74" />
      <line x1="14" y1="86" x2="106" y2="86" opacity="0.3" strokeWidth="2" />
    </>
  ),
  // Calf raise — up on the toes (with an up arrow).
  calf: (
    <>
      <circle cx="56" cy="16" r={HEAD_R} />
      <path d="M56 22 L56 54" />
      <path d="M56 28 L44 42 M56 28 L68 42" />
      <path d="M56 54 L52 80 M56 54 L64 80" />
      <path d="M52 80 L50 84 M64 80 L66 84" />
      <path d="M92 78 L92 52 M88 58 L92 52 L96 58" opacity="0.7" />
      <line x1="14" y1="84" x2="106" y2="84" opacity="0.3" strokeWidth="2" />
    </>
  ),
  // Neck mobility — head tilted, shoulders (with a small curved arrow).
  neck: (
    <>
      <path d="M42 54 L78 54" />
      <path d="M60 54 L56 34" />
      <circle cx="53" cy="26" r={HEAD_R + 1} />
      <path d="M60 54 L60 76" />
      <path d="M74 24 Q84 30 80 40" opacity="0.7" />
      <path d="M80 40 L82 34 M80 40 L76 38" opacity="0.7" />
    </>
  ),
  // Seated ankle work — lower leg + foot with a rotation arrow.
  ankle: (
    <>
      <circle cx="28" cy="20" r={HEAD_R} />
      <path d="M28 26 L28 54 L58 54 L58 78 L76 78" />
      <path d="M28 40 L40 48" />
      <path d="M84 74 Q92 78 86 84" opacity="0.7" />
      <path d="M86 84 L88 79 M86 84 L82 82" opacity="0.7" />
      <line x1="14" y1="80" x2="106" y2="80" opacity="0.3" strokeWidth="2" />
    </>
  ),
  // Jump — figure in the air, arms up.
  jump: (
    <>
      <circle cx="60" cy="20" r={HEAD_R} />
      <path d="M60 26 L60 50" />
      <path d="M60 30 L46 20 M60 30 L74 20" />
      <path d="M60 50 L50 64 M60 50 L70 64" />
      <path d="M40 40 L40 30 M80 40 L80 30" opacity="0.6" />
      <line x1="14" y1="88" x2="106" y2="88" opacity="0.3" strokeWidth="2" />
    </>
  ),
};

/** Choose the closest pose for an exercise name. */
function poseFor(name: string): keyof typeof POSES {
  const n = name.toLowerCase();
  if (n.includes("squat")) return "squat";
  if (n.includes("fente")) return "lunge";
  if (n.includes("planche") || n.includes("gainage")) return "plank";
  if (n.includes("pont fessier")) return "bridge";
  if (n.includes("chat-vache") || n.includes("quadrupède") || n.includes("bird")) return "quadruped";
  if (n.includes("équilibre") || n.includes("equilibre")) return "balance";
  if (n.includes("saut")) return "jump";
  if (n.includes("pointe") || n.includes("mollet")) return "calf";
  if (
    n.includes("cervical") || n.includes("cou") || n.includes("menton") ||
    n.includes("rétraction") || n.includes("trapèze") || n.includes("inclinaison") ||
    n.includes("scapulaire") || n.includes("isométrique") || n.includes("rotation cervicale")
  )
    return "neck";
  if (
    n.includes("cheville") || n.includes("éversion") || n.includes("eversion") ||
    n.includes("alphabet") || n.includes("cercles") || n.includes("dorsale")
  )
    return "ankle";
  if (
    n.includes("genou-poitrine") || n.includes("respiration") || n.includes("bascule") ||
    n.includes("rotation du tronc") || n.includes("piriforme") || n.includes("ischio")
  )
    return "lying";
  return "standing";
}

export default function ExerciseIllustration({
  name,
  className = "h-28 w-full text-teal-600",
}: {
  name: string;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 120 100"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
      aria-label={`Schéma : ${name}`}
    >
      {POSES[poseFor(name)]}
    </svg>
  );
}
