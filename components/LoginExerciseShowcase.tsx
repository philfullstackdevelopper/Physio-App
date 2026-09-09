"use client";

import { motion, useReducedMotion } from "motion/react";
import ExerciseIllustration from "@/components/ExerciseIllustration";

// Right-panel centerpiece for the login page only. A "cinema reel" of real
// exercise demonstrations: vertical filmstrip columns glide continuously
// (outer columns downward, middle column upward) and loop forever. Only real
// vendored illustrations (Everkinetic, CC BY-SA 4.0) are used — see
// components/ExerciseIllustration.tsx — never invented artwork. Exercise
// names are the actual French clinical-library entries that have a matching
// illustration (lib/exercise/illustrationMap.ts), so every label is real.
const COLUMNS: { items: string[]; direction: "down" | "up"; duration: number }[] = [
  {
    direction: "down",
    duration: 38,
    items: [
      "Pont fessier (coxarthrose)",
      "Étirement des pectoraux à la porte",
      "Rotation lombaire allongée",
      "Montée de marche contrôlée (genou arthrose)",
    ],
  },
  {
    direction: "up",
    duration: 46,
    items: [
      "Squat fonctionnel complet (hanche)",
      "Étirement des ischio-jambiers (genou arthrose)",
      "Renforcement léger des abducteurs, allongé",
      "Étirement des ischio-jambiers assis (sciatique)",
    ],
  },
  {
    direction: "down",
    duration: 42,
    items: [
      "Renforcement léger des abducteurs, allongé",
      "Montée de marche contrôlée (genou arthrose)",
      "Étirement des ischio-jambiers assis (sciatique)",
      "Pont fessier (coxarthrose)",
    ],
  },
];

function FilmCard({ name }: { name: string }) {
  return (
    <div className="flex w-full shrink-0 flex-col gap-2 rounded-2xl border border-slate-100 bg-white/90 p-3 shadow-sm">
      <ExerciseIllustration name={name} className="h-24 w-full text-blue-600" />
      <p className="line-clamp-2 text-center text-xs font-medium leading-snug text-slate-600">
        {name}
      </p>
    </div>
  );
}

function MarqueeColumn({
  items,
  direction,
  duration,
}: {
  items: string[];
  direction: "down" | "up";
  duration: number;
}) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    // The scrolling is the one thing being asked not to see — a plain static
    // column of the same real cards instead of a moving filmstrip.
    return (
      <div className="flex flex-col gap-4">
        {items.map((name, i) => (
          <FilmCard key={`${name}-${i}`} name={name} />
        ))}
      </div>
    );
  }

  // Duplicated once so the loop point is invisible: at the halfway mark the
  // track is back to pixel-identical alignment with its start.
  const track = [...items, ...items];
  const from = direction === "up" ? "0%" : "-50%";
  const to = direction === "up" ? "-50%" : "0%";

  return (
    <motion.div
      className="flex flex-col gap-4"
      animate={{ y: [from, to] }}
      transition={{ duration, ease: "linear", repeat: Infinity }}
    >
      {track.map((name, i) => (
        <FilmCard key={`${name}-${i}`} name={name} />
      ))}
    </motion.div>
  );
}

export default function LoginExerciseShowcase() {
  return (
    <div
      aria-hidden="true"
      className="grid h-full min-h-0 grid-cols-3 gap-4 overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,black_12%,black_88%,transparent)]"
    >
      {COLUMNS.map((col, i) => (
        <MarqueeColumn key={i} {...col} />
      ))}
    </div>
  );
}
