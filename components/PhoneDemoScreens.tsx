"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Bell, Play, CheckCircle2, ChevronLeft, Star } from "lucide-react";
import { LogoMark } from "@/components/Logo";

// Shared choreography for the "watch someone use the app" demo — tap
// dashboard's CTA, start an exercise, tap play, advance a set, check
// progress — used by both the hero phone (PhoneMockup, autoplays
// immediately) and the scroll showcase (PhoneShowcase, autoplays once
// scrolled into view). One sequence, two triggers.
export type Screen = 0 | 1 | 2;
export type Step = {
  screen: Screen;
  duration: number;
  badge: string;
  title: string;
  tap?: { x: number; y: number }; // percent of the screen area, for the tap-ripple
  set?: 1 | 2 | 3; // which rep-set the exercise screen shows
};

export const STEPS: Step[] = [
  { screen: 0, duration: 1100, badge: "Le tableau de bord", title: "Son programme du jour, en un coup d'œil." },
  { screen: 0, duration: 550, badge: "Le tableau de bord", title: "Son programme du jour, en un coup d'œil.", tap: { x: 50, y: 41 } },
  { screen: 1, duration: 500, badge: "La séance guidée", title: "Un seul exercice à l'écran, à la fois.", set: 1 },
  { screen: 1, duration: 650, badge: "La séance guidée", title: "Un seul exercice à l'écran, à la fois.", set: 1, tap: { x: 50, y: 27 } },
  { screen: 1, duration: 1300, badge: "La séance guidée", title: "Un seul exercice à l'écran, à la fois.", set: 1 },
  { screen: 1, duration: 550, badge: "La séance guidée", title: "Un seul exercice à l'écran, à la fois.", set: 1, tap: { x: 50, y: 79 } },
  { screen: 1, duration: 1400, badge: "La séance guidée", title: "Un seul exercice à l'écran, à la fois.", set: 2 },
  { screen: 2, duration: 2400, badge: "La progression", title: "Ses progrès, visibles pour son kiné." },
];

// Respect prefers-reduced-motion: freeze on the first frame instead of
// looping an animation the visitor asked not to see.
export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

// Drives the step index forward on a timer while `active`, looping forever.
// Paused (frozen on step 0) when inactive or reduced motion is requested.
export function usePhoneDemo(active: boolean) {
  const [stepIndex, setStepIndex] = useState(0);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (!active || reducedMotion) return;
    const timer = setTimeout(() => {
      setStepIndex((i) => (i + 1) % STEPS.length);
    }, STEPS[stepIndex].duration);
    return () => clearTimeout(timer);
  }, [active, stepIndex, reducedMotion]);

  return { step: STEPS[reducedMotion ? 0 : stepIndex], stepIndex, reducedMotion };
}

// The cross-fading screen content + tap ripple. Sized to sit inside any
// phone chrome that gives it a `relative h-[calc(540px-32px)]`-ish area.
export function PhoneDemoBody({
  step,
  stepIndex,
  reducedMotion,
}: {
  step: Step;
  stepIndex: number;
  reducedMotion: boolean;
}) {
  return (
    <div className="relative h-[calc(540px-32px)]">
      <AnimatePresence mode="wait">
        {step.screen === 0 && (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="absolute inset-0 px-5 pt-5"
          >
            <DashboardScreen pressed={!!step.tap} />
          </motion.div>
        )}
        {step.screen === 1 && (
          <motion.div
            key="exercise"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="absolute inset-0 px-5 pt-4"
          >
            <ExerciseScreen
              set={step.set ?? 1}
              playPressed={!!step.tap && step.tap.y < 50}
              nextPressed={!!step.tap && step.tap.y > 50}
            />
          </motion.div>
        )}
        {step.screen === 2 && (
          <motion.div
            key="progress"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="absolute inset-0 px-5 pt-5"
          >
            <ProgressScreen />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tap ripple — a stand-in fingertip tapping the screen */}
      <AnimatePresence>
        {step.tap && !reducedMotion && (
          <motion.span
            key={stepIndex}
            initial={{ opacity: 0, scale: 0.4 }}
            animate={{ opacity: [0, 0.5, 0], scale: 1.6 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.55, ease: "easeOut" }}
            className="pointer-events-none absolute h-9 w-9 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500"
            style={{ left: `${step.tap.x}%`, top: `${step.tap.y}%` }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export function DashboardScreen({ pressed }: { pressed: boolean }) {
  return (
    <>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LogoMark size={26} />
          <span className="font-display text-sm font-semibold text-slate-900">Physio-App</span>
        </div>
        <Bell className="h-4 w-4 text-slate-400" strokeWidth={1.75} />
      </div>

      <p className="font-display mt-5 text-xl font-semibold text-slate-900">Bonjour, Claire</p>
      <p className="text-sm text-slate-500">Votre séance du jour vous attend</p>

      <div className="mt-4 rounded-2xl bg-blue-600 p-4 text-white shadow-lg shadow-blue-600/20">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wide text-blue-100">Mobilité, phase 2</p>
            <p className="mt-1 text-lg font-semibold">7 / 10 exercices</p>
          </div>
          <svg viewBox="0 0 96 96" className="h-12 w-12 -rotate-90">
            <circle cx="48" cy="48" r="40" fill="none" stroke="#ffffff33" strokeWidth="10" />
            <circle cx="48" cy="48" r="40" fill="none" stroke="#fff" strokeWidth="10" strokeLinecap="round" strokeDasharray="251.3" strokeDashoffset="75.4" />
          </svg>
        </div>
        <button
          type="button"
          tabIndex={-1}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-full bg-white/15 py-2 text-xs font-semibold backdrop-blur transition-transform duration-150"
          style={{ transform: pressed ? "scale(0.95)" : "scale(1)" }}
        >
          <Play className="h-3 w-3 fill-current" strokeWidth={0} />
          Continuer la séance
        </button>
      </div>

      <div className="mt-4 space-y-2">
        {["Étirement épaule", "Rotation externe", "Renforcement léger"].map((name, i) => (
          <div key={name} className="flex items-center gap-2.5 rounded-xl border border-slate-100 px-3 py-2.5 text-xs">
            <CheckCircle2 className={`h-4 w-4 shrink-0 ${i < 2 ? "text-blue-600" : "text-slate-300"}`} strokeWidth={2} />
            <span className={i < 2 ? "text-slate-400 line-through" : "font-medium text-slate-700"}>{name}</span>
          </div>
        ))}
      </div>
    </>
  );
}

export function ExerciseScreen({
  set,
  playPressed,
  nextPressed,
}: {
  set: 1 | 2 | 3;
  playPressed: boolean;
  nextPressed: boolean;
}) {
  return (
    <>
      <div className="flex items-center gap-2.5">
        <ChevronLeft className="h-4 w-4 text-slate-700" strokeWidth={2} />
        <span className="text-xs font-semibold text-slate-700">Rotation externe</span>
        <span className="ml-auto text-[11px] font-semibold text-slate-400">2 / 3</span>
      </div>

      <div className="relative mt-3 flex h-[190px] items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800">
        <div
          className="flex h-13 w-13 items-center justify-center rounded-full bg-white/15 backdrop-blur transition-transform duration-150"
          style={{ transform: playPressed ? "scale(0.85)" : "scale(1)" }}
        >
          <Play className="h-5 w-5 fill-white text-white" strokeWidth={0} />
        </div>
        <span className="absolute bottom-2.5 right-3 rounded-full bg-black/35 px-2 py-0.5 text-[10px] font-semibold text-white">
          0:22 / 0:45
        </span>
      </div>

      <p className="mt-4 text-xs leading-relaxed text-slate-600">
        Debout, coude au corps à 90°. Tournez l&apos;avant-bras vers l&apos;extérieur, lentement, sans forcer.
      </p>

      <div className="mt-4 flex items-center justify-center gap-2">
        {[1, 2, 3].map((n) => (
          <span
            key={n}
            className={`h-2.5 w-2.5 rounded-full transition-colors duration-300 ${n <= set ? "bg-blue-600" : "bg-blue-100"}`}
          />
        ))}
      </div>
      <p className="mt-1.5 text-center text-[11px] font-medium text-slate-400">Série {set} sur 3 · 10 répétitions</p>

      <button
        type="button"
        tabIndex={-1}
        className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-full bg-blue-600 py-3 text-xs font-semibold text-white shadow-lg shadow-blue-600/25 transition-transform duration-150"
        style={{ transform: nextPressed ? "scale(0.96)" : "scale(1)" }}
      >
        Série suivante
      </button>
    </>
  );
}

export function ProgressScreen() {
  const bars = [
    ["L", 34, true], ["M", 44, true], ["M", 20, false],
    ["J", 48, true], ["V", 38, true], ["S", 16, false], ["D", 26, true],
  ] as const;
  return (
    <>
      <p className="font-display text-lg font-semibold text-slate-900">Ma progression</p>

      <div className="mt-3.5 rounded-2xl bg-slate-900 p-4 text-white">
        <div className="flex items-center gap-2">
          <Star className="h-[18px] w-[18px] fill-amber-400 text-amber-400" />
          <span className="text-xl font-semibold">5 jours de suite</span>
        </div>
        <p className="mt-1 text-[11px] text-slate-400">Continuez, vous êtes sur votre meilleure série.</p>
      </div>

      <div className="mt-3.5 flex items-end justify-between rounded-2xl border border-slate-100 px-3 py-3.5">
        {bars.map(([label, h, active], i) => (
          <div key={i} className="flex flex-col items-center gap-1.5">
            <div className="flex h-12 items-end">
              <div className={`w-3.5 rounded-t-sm ${active ? "bg-blue-600" : "bg-blue-100"}`} style={{ height: `${h}%` }} />
            </div>
            <span className="text-[9px] text-slate-400">{label}</span>
          </div>
        ))}
      </div>

      <div className="mt-3.5 flex gap-2.5">
        <div className="flex-1 rounded-xl border border-slate-100 p-3">
          <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">Assiduité</p>
          <p className="font-display mt-1 text-lg font-semibold text-slate-900">86 %</p>
        </div>
        <div className="flex-1 rounded-xl border border-slate-100 p-3">
          <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">Séances</p>
          <p className="font-display mt-1 text-lg font-semibold text-slate-900">18 / 21</p>
        </div>
      </div>
    </>
  );
}
