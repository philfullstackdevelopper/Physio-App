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
// Seulement 8 entrées françaises de la bibliothèque ont une illustration
// correspondante (lib/exercise/illustrationMap.ts) — c'est tout ce qui existe
// à répartir. Réparties ci-dessous SANS chevauchement entre colonnes (3+3+2)
// pour qu'aucun exercice n'apparaisse deux fois à l'écran en même temps
// (Philippe, 2026-09-13 : « que des exercices différents, non pas des
// exercices communs dans chacune des lignes »). Utiliser aussi les 302
// entrées Everkinetic en anglais casserait la promesse du commentaire
// ci-dessus (« chaque nom est réel » = réel pour CE patient, en français).
const COLUMNS: { items: string[]; direction: "down" | "up"; duration: number }[] = [
  {
    direction: "down",
    duration: 34,
    items: [
      "Pont fessier (coxarthrose)",
      "Étirement des pectoraux à la porte",
      "Rotation lombaire allongée",
    ],
  },
  {
    direction: "up",
    duration: 42,
    items: [
      "Squat fonctionnel complet (hanche)",
      "Étirement des ischio-jambiers (genou arthrose)",
      "Renforcement léger des abducteurs, allongé",
    ],
  },
  {
    direction: "down",
    duration: 30,
    items: [
      "Étirement des ischio-jambiers assis (sciatique)",
      "Montée de marche contrôlée (genou arthrose)",
    ],
  },
];

// Cards per column loop, before the seamless-loop duplication below — high
// enough that even the shortest column (2 unique items) comfortably fills
// the panel's height with no visible gap.
const MIN_LOOP_LENGTH = 8;

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
      <div className="flex flex-col gap-4 self-start">
        {items.map((name, i) => (
          <FilmCard key={`${name}-${i}`} name={name} />
        ))}
      </div>
    );
  }

  // Every column must reach the same total card count, whatever its number
  // of *unique* items — the 3/3/2 split (only 8 real French exercises exist
  // to share out, see COLUMNS above) otherwise gives the 2-item column a
  // visibly shorter, gappier filmstrip than its neighbors (Philippe,
  // 2026-09-13: "il manque clairement des exercices là", screenshot of the
  // 2-item column trailing off into blank space). Repeat this column's own
  // items enough times to reach MIN_LOOP_LENGTH before applying the usual
  // "duplicate once" trick for a seamless loop — repeating a column's own
  // items isn't the "same exercise in two columns at once" problem this was
  // fixed for earlier, since it's still only ever this column's cards.
  const loopUnit = Array.from({ length: Math.ceil(MIN_LOOP_LENGTH / items.length) }, () => items).flat();
  const track = [...loopUnit, ...loopUnit];
  const from = direction === "up" ? "0%" : "-50%";
  const to = direction === "up" ? "-50%" : "0%";

  return (
    <motion.div
      // self-start: a CSS grid item stretches to match its tallest sibling by
      // default, which is exactly what produced the visible gap in the first
      // place — the 2-item column's own content ended well before the
      // stretched box did, leaving blank space at the bottom regardless of
      // how many cards it had. Sizing to its own content removes that
      // mismatch outright, on top of the loopUnit balancing above.
      className="flex flex-col gap-4 self-start"
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
