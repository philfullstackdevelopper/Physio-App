// =============================================================================
// BodyPartIllustration — original skeletal/joint icons for each body-part
// category tile in the exercise library.
//
// Style: side-profile bone-and-joint line art (long bones as thick rounded
// strokes with a circular "condyle" knob at each end, joints as a bare gap
// or ball-and-socket) — reads as an actual orthopedic joint rather than an
// abstract muscle silhouette. Drawn from scratch for this app (not sourced
// from stock/medical image libraries), same reasoning as the app's other
// original iconography: the per-exercise movement demos elsewhere use a real
// vendored+attributed set (see ExerciseIllustration) since those need to be
// literally correct movements; these category illustrations don't.
// =============================================================================

import type { ReactElement } from "react";

const SHAPES_BY_SLUG: Record<string, ReactElement> = {
  // Shoulder: a slender collarbone rod (clearly thinner than the pelvis
  // wing on the hip icon) into the humeral head ball, humerus shaft below.
  epaule: (
    <>
      <line x1="6" y1="9" x2="18" y2="13.5" stroke="currentColor" strokeWidth={2.8} strokeLinecap="round" />
      <circle cx="19" cy="15.5" r="4.6" fill="currentColor" fillOpacity={0.9} />
      <line x1="18" y1="19.5" x2="14.5" y2="28" stroke="currentColor" strokeWidth={5.4} strokeLinecap="round" />
    </>
  ),
  // Ankle / foot: tibia shaft down into the ankle joint, then a foot shaft
  // running forward — side-profile foot X-ray silhouette.
  "cheville-pied": (
    <>
      <line x1="19" y1="4" x2="16" y2="17" stroke="currentColor" strokeWidth={5} strokeLinecap="round" />
      <circle cx="15" cy="19" r="4.2" fill="currentColor" fillOpacity={0.9} />
      <line x1="15" y1="19" x2="27" y2="22" stroke="currentColor" strokeWidth={5} strokeLinecap="round" />
    </>
  ),
  // Knee / leg: femur shaft + condyle, patella riding in front of the joint,
  // tibia shaft below — the classic knee-joint illustration.
  "genou-jambe": (
    <>
      <line x1="17" y1="4" x2="16" y2="15" stroke="currentColor" strokeWidth={5.4} strokeLinecap="round" />
      <circle cx="16" cy="16" r="3.6" fill="currentColor" fillOpacity={0.9} />
      <circle cx="20.5" cy="16.5" r="2.6" fill="currentColor" fillOpacity={0.6} />
      <line x1="15" y1="17" x2="14" y2="28" stroke="currentColor" strokeWidth={5.4} strokeLinecap="round" />
    </>
  ),
  // Hip / glutes: pelvis wing, femoral head as a ball sitting in the
  // acetabulum socket, femur shaft running down — ball-and-socket read.
  "hanche-fessiers": (
    <>
      <path d="M6 8c0-2.8 3-5 7.5-5s8.5 2.6 8.5 7c0 2.6-2 4-3.5 5.5" fill="currentColor" fillOpacity={0.85} />
      <circle cx="18.5" cy="15.5" r="4.2" fill="currentColor" fillOpacity={0.9} />
      <line x1="17.5" y1="19.5" x2="14.5" y2="28" stroke="currentColor" strokeWidth={5} strokeLinecap="round" />
    </>
  ),
  // Lower back: a column of individual lumbar vertebrae blocks, side
  // profile, rather than a filled torso — reads as "spine," not "back skin."
  "dos-lombaires": (
    <>
      <line x1="16" y1="4" x2="16" y2="28" stroke="currentColor" strokeWidth={1.4} strokeOpacity={0.5} />
      {[5, 9.5, 14, 18.5, 23, 27.5].map((y, i) => (
        <rect key={y} x={13.5 - (i % 2 === 0 ? 0.6 : 0)} y={y - 1.7} width="6.5" height="3.4" rx="1.4" fill="currentColor" fillOpacity={0.9} />
      ))}
    </>
  ),
  // Neck / cervical: skull base sitting on a short stack of small cervical
  // vertebrae — same vertebra-block language as the lumbar icon, scaled down.
  "cervicales-cou": (
    <>
      <circle cx="17" cy="6.5" r="4.4" fill="currentColor" fillOpacity={0.3} />
      <line x1="16" y1="10" x2="15" y2="26" stroke="currentColor" strokeWidth={1.2} strokeOpacity={0.5} />
      {[11, 14, 17, 20, 23, 26].map((y) => (
        <rect key={y} x="12.5" y={y - 1.4} width="5.5" height="2.8" rx="1.2" fill="currentColor" fillOpacity={0.9} />
      ))}
    </>
  ),
  // Wrist / hand / elbow: elbow joint, one thick forearm shaft, wrist
  // joint, then two bold metacarpal spokes fanning into the hand.
  "poignet-main-coude": (
    <>
      <circle cx="7" cy="7.5" r="3.4" fill="currentColor" fillOpacity={0.9} />
      <line x1="9" y1="10" x2="18.5" y2="18.5" stroke="currentColor" strokeWidth={5} strokeLinecap="round" />
      <circle cx="20" cy="20" r="3.4" fill="currentColor" fillOpacity={0.9} />
      <line x1="21.5" y1="20.5" x2="27.5" y2="18" stroke="currentColor" strokeWidth={3} strokeLinecap="round" />
      <line x1="21.5" y1="21.5" x2="27.5" y2="25.5" stroke="currentColor" strokeWidth={3} strokeLinecap="round" />
    </>
  ),
  // Trunk / core: a bold rounded ribcage cage over a short spine segment —
  // a recognizable ribcage silhouette rather than a torso block.
  "tronc-gainage-abdos": (
    <>
      <line x1="16" y1="4" x2="16" y2="28" stroke="currentColor" strokeWidth={2.4} strokeOpacity={0.6} strokeLinecap="round" />
      <path
        d="M16 6c-6.5 1-9.5 5-9.5 10.5 0 4 1.7 7.3 4 9.5"
        fill="none"
        stroke="currentColor"
        strokeWidth={3.2}
        strokeLinecap="round"
      />
      <path
        d="M16 6c6.5 1 9.5 5 9.5 10.5 0 4-1.7 7.3-4 9.5"
        fill="none"
        stroke="currentColor"
        strokeWidth={3.2}
        strokeLinecap="round"
      />
    </>
  ),
  // Balance: a standing skeleton on one leg, arms out — bone-style joints
  // (hip/knee/ankle/shoulder circles) rather than a filled figure, so it
  // matches the rest of the set while still reading as a posture.
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
