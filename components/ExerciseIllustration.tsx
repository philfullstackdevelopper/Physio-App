// =============================================================================
// ExerciseIllustration — per-exercise demonstration.
//
// When the exercise name has an entry in EXERCISE_ILLUSTRATION_MAP, renders
// the matching vendored illustration (public/exercise-illustrations/<slug>/) —
// three real motion frames. That set is derived from Everkinetic (CC BY-SA
// 4.0, see mentions-légales for attribution), hand-matched exercise by
// exercise — never auto-matched — because a wrong illustration would show a
// patient the wrong movement.
//
// Every other exercise renders an honest empty state rather than a generic
// pictogram: a shared "standing figure" or "lying figure" reused across
// dozens of unrelated exercises doesn't actually show anyone how to do the
// movement. No exercise here has instructor-uploaded media yet either — that
// upload path is still to be built.
// =============================================================================

import { ImageOff } from "lucide-react";
import { EXERCISE_ILLUSTRATION_MAP } from "@/lib/exercise/illustrationMap";
import { EIGHT_FRAME_LOOP_SLUGS, EIGHT_FRAME_SLOW_SLUGS, EIGHT_FRAME_SLUGS } from "@/lib/exercise/illustrationFrames";

/** Real 3-frame vendored illustration for exercises matched in EXERCISE_ILLUSTRATION_MAP.
 *  The cross-fade keyframes (.ei-frame-*) live once in app/globals.css rather
 *  than being injected per instance — a workout screen renders several of
 *  these at once. */
function VendoredIllustration({
  slug,
  name,
  className,
  animate,
}: {
  slug: string;
  name: string;
  className: string;
  animate: boolean;
}) {
  if (!animate) {
    // A single fixed frame — used where the movement doesn't need to be
    // demonstrated in motion, just recognized at a glance (e.g. a séance
    // card in a list).
    return (
      <div className={`relative ${className}`} role="img" aria-label={`Démonstration : ${name}`}>
        {/* eslint-disable-next-line @next/next/no-img-element -- static local SVG, no next/image benefit */}
        <img
          src={`/exercise-illustrations/${slug}/frame-1.svg`}
          alt=""
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-contain"
        />
      </div>
    );
  }

  // 8 dessins anim-1..8.svg (animation aller-retour, lib/exercise/illustrationFrames.ts)
  // ou les 3 dessins d'origine frame-1..3.svg en fondu.
  const eight = EIGHT_FRAME_SLUGS.has(slug);
  const frames = eight ? [1, 2, 3, 4, 5, 6, 7, 8] : [1, 2, 3];
  const file = eight ? "anim" : "frame";
  const cls = eight ? (EIGHT_FRAME_LOOP_SLUGS.has(slug) ? "ei8l" : EIGHT_FRAME_SLOW_SLUGS.has(slug) ? "ei8s" : "ei8") : "ei-frame";
  return (
    <div className={`relative ${className}`} role="img" aria-label={`Démonstration : ${name}`}>
      {frames.map((frame) => (
        // eslint-disable-next-line @next/next/no-img-element -- static local SVG, no next/image benefit
        <img
          key={frame}
          src={`/exercise-illustrations/${slug}/${file}-${frame}.svg`}
          alt=""
          loading="lazy"
          decoding="async"
          className={`${cls}-${frame} absolute inset-0 h-full w-full object-contain`}
        />
      ))}
    </div>
  );
}

/** Honest placeholder for exercises with no real demonstration yet. */
function NoIllustration({ name, className }: { name: string; className: string }) {
  // Petite vignette (hauteur Tailwind ≤ h-16, ex. listes d'exercices en
  // 28-40 px) : icône seule — le texte « Démonstration à venir » débordait de
  // la case (Philippe, 2026-10-02).
  const h = className.match(/(?:^|\s)h-(\d+)(?:\s|$)/);
  const small = h !== null && Number(h[1]) <= 16;
  return (
    <div
      className={`flex items-center justify-center ${className}`}
      role="img"
      aria-label={`Pas de démonstration disponible : ${name}`}
    >
      <div className="flex flex-col items-center gap-1.5 text-slate-300">
        <ImageOff className={small ? "h-4 w-4" : "h-6 w-6"} strokeWidth={1.75} />
        {!small && <span className="text-xs text-slate-400">Démonstration à venir</span>}
      </div>
    </div>
  );
}

export default function ExerciseIllustration({
  name,
  className = "h-28 w-full text-blue-600",
  animate = true,
}: {
  name: string;
  className?: string;
  /** false renders a single fixed frame instead of the cross-fading 3-frame loop. */
  animate?: boolean;
}) {
  const vendoredSlug = EXERCISE_ILLUSTRATION_MAP[name];
  if (vendoredSlug) {
    return (
      <VendoredIllustration slug={vendoredSlug} name={name} className={className} animate={animate} />
    );
  }

  return <NoIllustration name={name} className={className} />;
}
