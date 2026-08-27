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

/** Real 3-frame vendored illustration for exercises matched in EXERCISE_ILLUSTRATION_MAP.
 *  The cross-fade keyframes (.ei-frame-*) live once in app/globals.css rather
 *  than being injected per instance — a workout screen renders several of
 *  these at once. */
function VendoredIllustration({
  slug,
  name,
  className,
}: {
  slug: string;
  name: string;
  className: string;
}) {
  return (
    <div className={`relative ${className}`} role="img" aria-label={`Démonstration : ${name}`}>
      {[1, 2, 3].map((frame) => (
        // eslint-disable-next-line @next/next/no-img-element -- static local SVG, no next/image benefit
        <img
          key={frame}
          src={`/exercise-illustrations/${slug}/frame-${frame}.svg`}
          alt=""
          loading="lazy"
          decoding="async"
          className={`ei-frame-${frame} absolute inset-0 h-full w-full object-contain`}
        />
      ))}
    </div>
  );
}

/** Honest placeholder for exercises with no real demonstration yet. */
function NoIllustration({ name, className }: { name: string; className: string }) {
  return (
    <div
      className={`flex items-center justify-center ${className}`}
      role="img"
      aria-label={`Pas de démonstration disponible : ${name}`}
    >
      <div className="flex flex-col items-center gap-1.5 text-slate-300">
        <ImageOff className="h-6 w-6" strokeWidth={1.75} />
        <span className="text-xs text-slate-400">Démonstration à venir</span>
      </div>
    </div>
  );
}

export default function ExerciseIllustration({
  name,
  className = "h-28 w-full text-blue-600",
}: {
  name: string;
  className?: string;
}) {
  const vendoredSlug = EXERCISE_ILLUSTRATION_MAP[name];
  if (vendoredSlug) {
    return <VendoredIllustration slug={vendoredSlug} name={name} className={className} />;
  }

  return <NoIllustration name={name} className={className} />;
}
