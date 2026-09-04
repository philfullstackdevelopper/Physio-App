"use client";

import { useEffect, useRef, useState } from "react";
import ExerciseIllustration from "@/components/ExerciseIllustration";

// Progression is which SÉANCE (workout) the kiné has assigned — the real
// unit of change in the product (a condition offers several workouts; the
// kiné picks the one matching the patient's current phase). Each workout
// is a real 3-exercise session (never just one illustration standing in
// for "the program", and never a raw exercise count that climbs for no
// discernible reason) — this is what a patient actually does that week.
// Picked from a live 3-variant prototype (2026-09-02); see git history for
// the other two directions (tabbed live demos, press-to-reveal cards).
const JOURNEY = [
  {
    week: 1,
    phase: "Phase 1 · Mobilité",
    workout: "Réveil articulaire",
    exercises: ["Cat-Cow Stretch", "Glute Bridge", "Plank"],
    attendance: 60,
  },
  {
    week: 2,
    phase: "Phase 1 · Mobilité",
    workout: "Réveil articulaire",
    exercises: ["Cat-Cow Stretch", "Glute Bridge", "Plank"],
    attendance: 68,
  },
  {
    week: 3,
    phase: "Phase 2 · Renforcement léger",
    workout: "Stabilité du bassin",
    exercises: ["Glute Bridge", "Wall Sit", "Side Plank"],
    attendance: 75,
  },
  {
    week: 4,
    phase: "Phase 2 · Renforcement léger",
    workout: "Stabilité du bassin",
    exercises: ["Glute Bridge", "Wall Sit", "Side Plank"],
    attendance: 82,
  },
  {
    week: 5,
    phase: "Phase 2 · Renforcement léger",
    workout: "Renforcement des fessiers",
    exercises: ["Glute Bridge", "Wall Sit", "Side Plank"],
    attendance: 88,
  },
  {
    week: 6,
    phase: "Phase 3 · Renforcement complet",
    workout: "Charge fonctionnelle",
    exercises: ["Bodyweight Squat", "Glute Bridge", "Side Plank"],
    attendance: 91,
  },
  {
    week: 7,
    phase: "Phase 3 · Renforcement complet",
    workout: "Charge fonctionnelle",
    exercises: ["Bodyweight Squat", "Glute Bridge", "Side Plank"],
    attendance: 94,
  },
  {
    week: 8,
    phase: "Phase 3 · Retour au sport",
    workout: "Retour au sport, niveau 1",
    exercises: ["Bodyweight Squat", "Glute Bridge", "Side Plank"],
    attendance: 96,
  },
];

// The week's 3 exercises, side by side, each one taking the spotlight in
// turn — a small looping "here's the order you'll do them in" simulation,
// instead of one static illustration standing in for the whole session.
function ExerciseTrio({ names }: { names: readonly string[] }) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    setActive(0);
    const id = window.setInterval(() => {
      setActive((a) => (a + 1) % names.length);
    }, 1100);
    return () => window.clearInterval(id);
  }, [names]);

  return (
    <div className="flex justify-center gap-3">
      {names.map((name, i) => {
        const isActive = i === active;
        return (
          <div
            key={name}
            className={`flex w-24 flex-col items-center gap-1.5 rounded-2xl border p-3 transition-all duration-500 ${
              isActive
                ? "scale-105 border-blue-600 bg-blue-50 shadow-sm"
                : "scale-95 border-slate-100 bg-white opacity-50"
            }`}
          >
            <ExerciseIllustration
              name={name}
              className={`h-14 w-14 ${isActive ? "text-blue-600" : "text-slate-300"}`}
              animate={isActive}
            />
            <span
              className={`text-center text-[11px] font-medium leading-tight ${
                isActive ? "text-blue-700" : "text-slate-400"
              }`}
            >
              {name}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// Phase boundaries fall after JOURNEY index 1 and 4 (weeks 3 and 6 start a
// new phase). Used for both the tick marks and the "leveled up" pulse.
const PHASE_BOUNDARIES = [2, 5];
const PHASE_COLORS = [
  { text: "text-slate-500", fill: "bg-slate-400", ring: "text-slate-500" },
  { text: "text-blue-500", fill: "bg-blue-400", ring: "text-blue-500" },
  { text: "text-blue-700", fill: "bg-blue-600", ring: "text-blue-600" },
];

function phaseIndexFor(idx: number) {
  if (idx < PHASE_BOUNDARIES[0]) return 0;
  if (idx < PHASE_BOUNDARIES[1]) return 1;
  return 2;
}

export default function FeaturesShowcase() {
  const [idx, setIdx] = useState(0);
  const [justLeveled, setJustLeveled] = useState(false);
  const prevPhase = useRef(phaseIndexFor(0));

  const j = JOURNEY[idx];
  const phaseIdx = phaseIndexFor(idx);
  const colors = PHASE_COLORS[phaseIdx];
  const pct = (idx / (JOURNEY.length - 1)) * 100;

  useEffect(() => {
    if (phaseIdx !== prevPhase.current) {
      prevPhase.current = phaseIdx;
      setJustLeveled(true);
      const t = window.setTimeout(() => setJustLeveled(false), 1600);
      return () => window.clearTimeout(t);
    }
  }, [phaseIdx]);

  // The journey plays itself — no drag required to see it unfold. Dragging
  // still works (it's a real input), it just isn't the only way in.
  useEffect(() => {
    const id = window.setInterval(() => {
      setIdx((i) => (i + 1) % JOURNEY.length);
    }, 2200);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="text-center">
      <p className="text-sm text-slate-500">Le programme évolue automatiquement, semaine après semaine.</p>

      <div className="relative mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white p-8 sm:p-10">
        {justLeveled && (
          <div className="animate-[fadeInUp_0.3s_ease-out_both] absolute left-1/2 top-4 -translate-x-1/2 whitespace-nowrap rounded-full bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white shadow-lg">
            Nouvelle phase !
          </div>
        )}

        <div key={idx} className="animate-[fadeInUp_0.3s_ease-out_both]">
          <p className={`text-xs font-semibold uppercase tracking-wide ${colors.text}`}>{j.phase}</p>
          <p className="mt-1 font-display text-2xl font-semibold text-slate-900">{j.workout}</p>
          <p className="mt-1 text-sm text-slate-500">{j.attendance}% d&apos;assiduité cette semaine</p>
          <div className="mt-6">
            <ExerciseTrio names={j.exercises} />
          </div>
        </div>

        <div className="relative mt-10 h-6">
          <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full transition-[width] duration-150 ${colors.fill}`}
              style={{ width: `${pct}%` }}
            />
            {PHASE_BOUNDARIES.map((b) => (
              <span
                key={b}
                aria-hidden
                className="absolute top-1/2 h-3 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white"
                style={{ left: `${(b / (JOURNEY.length - 1)) * 100}%` }}
              />
            ))}
          </div>
          <div
            aria-hidden
            className="pointer-events-none absolute top-1/2 flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-blue-600 shadow-md transition-[left] duration-150"
            style={{ left: `${pct}%` }}
          />
          <input
            type="range"
            min={0}
            max={JOURNEY.length - 1}
            value={idx}
            onChange={(e) => setIdx(Number(e.target.value))}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            aria-label="Semaine du programme"
          />
        </div>
        <div className="mt-3 text-xs font-medium text-slate-500">
          Semaine {j.week} <span className="text-slate-300">/ 8</span>
        </div>
      </div>
    </div>
  );
}
