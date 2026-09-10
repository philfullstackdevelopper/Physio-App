// =============================================================================
// BodyPartIllustration — one illustration per body-part category tile.
//
// 7 of the 9 categories use a photo in public/body-parts/<slug>.jpg, cropped
// from Injurymap's free anatomy illustrations (https://injurymap.com/free-
// human-anatomy-illustrations, CC BY 4.0 — attribution in SiteFooter.tsx).
// They were chosen over the app's earlier hand-drawn bone/joint icons
// (2026-09-09, Philippe) because a translucent-skin photo with the sore spot
// highlighted in red reads instantly to a patient, where an abstract skeleton
// diagram didn't. Injurymap has no "core/fitness" category (their library
// covers joint injuries only), so "tronc-gainage-abdos" instead uses a flat
// abs/pecs badge icon from Pixabay (Pixabay Content License — free for
// commercial use, no attribution required) — a deliberate style outlier
// (flat vector vs. the others' photo-realism) accepted because it reads far
// more clearly than a hand-drawn attempt at the same visual language.
// "equilibre-general" also has no photo equivalent — a posture isn't a body
// part — so it keeps the original skeletal icon.
// =============================================================================

import type { ReactElement } from "react";
import Image from "next/image";

// Filenames carry a -vN suffix when a crop was swapped in place after the
// first pass, so the browser (and Next's image cache) can't keep serving the
// old crop from a URL they'd already cached.
const PHOTOS_BY_SLUG: Record<string, string> = {
  epaule: "/body-parts/epaule-v2.jpg",
  "cheville-pied": "/body-parts/cheville-pied.jpg",
  "genou-jambe": "/body-parts/genou-jambe.jpg",
  "hanche-fessiers": "/body-parts/hanche-fessiers-v3.jpg",
  "dos-lombaires": "/body-parts/dos-lombaires.jpg",
  "cervicales-cou": "/body-parts/cervicales-cou.jpg",
  "poignet-main-coude": "/body-parts/poignet-main-coude.jpg",
  "tronc-gainage-abdos": "/body-parts/tronc-gainage-abdos-v2.jpg",
};

const SHAPES_BY_SLUG: Record<string, ReactElement> = {
  // Balance: a standing skeleton on one leg, arms out — bone-style joints
  // (hip/knee/ankle/shoulder circles) — the one category with no photo
  // equivalent, since a posture isn't a body part.
  "equilibre-general": (
    <>
      <circle cx="16" cy="6" r="3" fill="currentColor" fillOpacity={0.9} />
      <line x1="16" y1="9" x2="16" y2="17" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" />
      <circle cx="16" cy="17" r="1.8" fill="currentColor" fillOpacity={0.9} />
      <line x1="16" y1="11" x2="9" y2="14" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" />
      <line x1="16" y1="11" x2="23.5" y2="9.5" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" />
      <line x1="16" y1="17" x2="12" y2="24" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" />
      <circle cx="12" cy="24" r="1.6" fill="currentColor" fillOpacity={0.9} />
      <line x1="12" y1="24" x2="14.5" y2="29.5" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" />
      <line x1="16" y1="17" x2="21" y2="21" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" />
      <circle cx="21" cy="21" r="1.6" fill="currentColor" fillOpacity={0.9} />
      <line x1="21" y1="21" x2="20" y2="27.5" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" />
    </>
  ),
};

export default function BodyPartIllustration({
  slug,
  className = "h-6 w-6",
  active = false,
}: {
  slug: string;
  className?: string;
  active?: boolean;
}) {
  const photo = PHOTOS_BY_SLUG[slug];
  if (photo) {
    return (
      <span
        className={`relative block overflow-hidden rounded-full ring-2 transition-colors ${active ? "ring-blue-600" : "ring-transparent"} ${className}`}
      >
        <Image src={photo} alt="" fill sizes="64px" className="object-cover" aria-hidden />
      </span>
    );
  }

  const shape = SHAPES_BY_SLUG[slug];
  return (
    <svg
      viewBox="0 0 32 32"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`${className} ${active ? "text-blue-600" : "text-stone-500"}`}
      aria-hidden
    >
      {shape ?? <circle cx="16" cy="16" r="9" fill="none" stroke="currentColor" strokeWidth={1.6} />}
    </svg>
  );
}
