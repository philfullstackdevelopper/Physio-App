"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Activity, ArrowDown, ArrowUp, CalendarDays, Check, Home, Lightbulb, MessageCircle, Settings, TrendingUp } from "lucide-react";
import { LogoLockup } from "@/components/Logo";
import ExerciseIllustration from "@/components/ExerciseIllustration";
import MountainScene from "@/components/MountainScene";
import WavingHand from "@/components/WavingHand";

// Démo « quelqu'un utilise l'appli » du téléphone de la landing (PhoneMockup,
// et PhoneShowcase). Refaite le 2026-10-07 (Philippe : « le téléphone des
// démos devrait montrer ce qui est vraiment sur l'application — dashboard,
// cliquer sur Voir mon programme, débuter mon programme ») : chaque écran
// reprend, en miniature, le VRAI écran patient sur téléphone —
//   0 Accueil        (components/PatientHomeView.tsx)
//   1 Mon programme  (app/patient/programme/ProgrammeView.tsx)
//   2 Séance guidée  (components/WorkoutSession.tsx — sans barre d'onglets)
//   3 Exercice terminé (même composant, phase « celebrate »)
// Si ces écrans changent, mettre cette démo à jour avec eux.
export type Screen = 0 | 1 | 2 | 3;
export type Step = {
  screen: Screen;
  duration: number;
  title: string;
  /** Le bouton principal de l'écran est « touché » (ondulation sur le bouton). */
  tap?: boolean;
};

export const STEPS: Step[] = [
  { screen: 0, duration: 1600, title: "Son programme de la semaine, en un coup d'œil." },
  { screen: 0, duration: 650, title: "Son programme de la semaine, en un coup d'œil.", tap: true },
  { screen: 1, duration: 1700, title: "Les exercices choisis par son kiné." },
  { screen: 1, duration: 650, title: "Les exercices choisis par son kiné.", tap: true },
  { screen: 2, duration: 2200, title: "Un exercice à la fois, guidé pas à pas." },
  { screen: 2, duration: 650, title: "Un exercice à la fois, guidé pas à pas.", tap: true },
  { screen: 3, duration: 1700, title: "Chaque séance terminée, visible par son kiné." },
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

/** Barre d'onglets du vrai téléphone patient (PatientNav) — absente pendant
 *  la séance guidée, comme dans l'appli. « Mon programme » reste sous Accueil. */
export function DemoTabBar({ screen }: { screen: Screen }) {
  if (screen >= 2) return null;
  const tabs = [
    { icon: Home, label: "Accueil", active: true },
    { icon: TrendingUp, label: "Progrès" },
    { icon: MessageCircle, label: "Messages", dot: true },
    { icon: Settings, label: "Paramètres" },
  ];
  return (
    <div className="absolute inset-x-0 bottom-0 flex border-t border-slate-100 bg-white/95 pb-2 pt-1.5 backdrop-blur">
      {tabs.map((t) => (
        <span key={t.label} className={`relative flex flex-1 flex-col items-center gap-0.5 text-[8px] ${t.active ? "font-semibold text-blue-600" : "font-medium text-slate-400"}`}>
          <t.icon className="h-3.5 w-3.5" strokeWidth={t.active ? 2.2 : 1.7} />
          {t.label}
          {t.dot && <span className="absolute right-[26%] top-0 h-1.5 w-1.5 rounded-full bg-red-500" />}
        </span>
      ))}
    </div>
  );
}

// Ondulation « doigt » posée sur le bouton touché.
function Tap({ on }: { on: boolean }) {
  return (
    <AnimatePresence>
      {on && (
        <motion.span
          initial={{ opacity: 0, scale: 0.3 }}
          animate={{ opacity: [0, 0.45, 0], scale: 1.5 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="pointer-events-none absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-400"
        />
      )}
    </AnimatePresence>
  );
}

// The cross-fading screen content. Sized to sit inside the phone chrome
// (PhoneMockup / PhoneShowcase), below the status bar.
export function PhoneDemoBody({ step, reducedMotion }: { step: Step; stepIndex?: number; reducedMotion: boolean }) {
  const tap = !!step.tap && !reducedMotion;
  return (
    <div className="relative h-[calc(540px-32px)]">
      <AnimatePresence mode="wait">
        <motion.div
          key={step.screen}
          initial={{ opacity: 0, x: step.screen === 0 ? 0 : 14 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="absolute inset-0 overflow-hidden bg-[#f4f7fc]"
        >
          {step.screen === 0 && <HomeScreen tap={tap} />}
          {step.screen === 1 && <ProgrammeScreen tap={tap} />}
          {step.screen === 2 && <SessionScreen tap={tap} />}
          {step.screen === 3 && <DoneScreen />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function AppTopBar() {
  return (
    <div className="flex items-center justify-between px-3.5 pt-2.5">
      <LogoLockup height={17} />
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-50 text-[8px] font-semibold text-blue-600">LM</span>
    </div>
  );
}

const CARD = "rounded-xl bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_6px_20px_rgba(15,23,42,0.05)]";

export function HomeScreen({ tap }: { tap: boolean }) {
  return (
    <>
      <AppTopBar />
      <div className="px-3.5">
        <p className="mt-2.5 flex items-center gap-1 text-[15px] font-semibold text-slate-900">
          Bonjour Léa <WavingHand className="h-4 w-4" />
        </p>

        <div className="relative mt-2.5 overflow-hidden rounded-2xl bg-gradient-to-br from-[#155dfc] to-[#1447c9] px-3 pb-3 pt-2.5 shadow-lg shadow-blue-600/25">
          <p className="text-[7.5px] font-semibold uppercase tracking-wide text-white/75">Semaine 5</p>
          <p className="mt-0.5 text-[11px] font-semibold leading-tight text-white">Renforcement lombaire — niveau 2</p>
          <p className="mt-0.5 text-[8.5px] text-white/85">2 séances à réaliser · 20 minutes environ</p>
          <MountainScene variant="goal" progress={1 / 3} className="mx-auto mt-1 h-16 w-36 text-white/90" />
          <div className="mt-1 flex items-center gap-1.5">
            <div className="flex flex-1 gap-1">
              <span className="h-1 flex-1 rounded-full bg-white" />
              <span className="h-1 flex-1 rounded-full bg-white/25" />
              <span className="h-1 flex-1 rounded-full bg-white/25" />
            </div>
            <span className="text-[8px] font-semibold text-white">1/3 séances</span>
          </div>
          <span
            className="relative mt-2 flex items-center justify-center gap-1 overflow-hidden rounded-full bg-white py-2 text-[10px] font-semibold text-blue-600 transition-transform duration-150"
            style={{ transform: tap ? "scale(0.95)" : "scale(1)" }}
          >
            Voir mon programme <ArrowRight className="h-3 w-3" strokeWidth={2.2} />
            <Tap on={tap} />
          </span>
        </div>

        <div className="mt-2.5 grid grid-cols-2 gap-2">
          <div className={`${CARD} p-2.5`}>
            <p className="text-[8px] text-slate-500">Adhérence</p>
            <p className="text-[15px] font-semibold text-slate-900">83%</p>
            <p className="flex items-center gap-0.5 text-[7.5px] text-emerald-600">
              <ArrowUp className="h-2 w-2" strokeWidth={2.5} />
              +12% vs période préc.
            </p>
          </div>
          <div className={`${CARD} p-2.5`}>
            <p className="flex items-center gap-1 text-[8px] text-slate-500">
              <Activity className="h-2.5 w-2.5 text-blue-600" strokeWidth={2} /> Douleur
            </p>
            <p className="text-[15px] font-semibold text-slate-900">
              3.0<span className="text-[9px] font-medium text-slate-400">/10</span>
            </p>
            <p className="flex items-center gap-0.5 text-[7.5px] text-emerald-600">
              <ArrowDown className="h-2 w-2" strokeWidth={2.5} />
              -2.0 vs 30 j avant
            </p>
          </div>
        </div>

        <div className={`${CARD} mt-2 flex items-start gap-2 p-2.5`}>
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
            <Lightbulb className="h-3 w-3" strokeWidth={2} />
          </span>
          <span>
            <span className="block text-[8.5px] font-semibold text-slate-900">Conseil du jour</span>
            <span className="block text-[8px] leading-snug text-slate-500">Pensez à bien vous échauffer avant vos exercices.</span>
          </span>
        </div>
      </div>
    </>
  );
}

const PROGRAMME = [
  { name: "Glute Bridge", label: "Pont fessier" },
  { name: "Postural Core Bracing", label: "Gainage postural" },
  { name: "Lying Torso Rotation", label: "Rotation du tronc" },
  { name: "Quadruped Scapular Stability", label: "Quadrupédie" },
];

export function ProgrammeScreen({ tap }: { tap: boolean }) {
  const c = 2 * Math.PI * 15;
  return (
    <>
      <AppTopBar />
      <div className="px-3.5">
        <div className="mt-2.5 flex items-center justify-between">
          <p className="text-[15px] font-semibold text-slate-900">Mon programme</p>
          <span className="flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[8px] font-medium text-slate-700">
            <CalendarDays className="h-2.5 w-2.5 text-blue-600" strokeWidth={2} /> Semaine 5
          </span>
        </div>

        <div className={`${CARD} mt-2.5 p-2.5`}>
          <div className="flex items-center gap-2.5">
            <svg viewBox="0 0 36 36" className="h-9 w-9 shrink-0 -rotate-90">
              <circle cx="18" cy="18" r="15" fill="none" stroke="#eaf1ff" strokeWidth="4" />
              <circle cx="18" cy="18" r="15" fill="none" stroke="#155dfc" strokeWidth="4" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (2 / 3)} />
            </svg>
            <div className="min-w-0">
              <span className="inline-flex rounded-full bg-blue-600/15 px-1.5 py-px text-[6.5px] font-semibold uppercase tracking-wide text-blue-600">
                Séance en cours
              </span>
              <p className="mt-0.5 truncate text-[10.5px] font-semibold leading-tight text-slate-900">Renforcement lombaire — niv. 2</p>
              <p className="text-[8px] text-slate-500">1 / 3 cette semaine · 20 min</p>
            </div>
          </div>

          <p className="mt-2.5 text-[8.5px] font-semibold text-slate-900">
            Vos exercices <span className="font-normal text-slate-500">· 4</span>
          </p>
          <div className="mt-1.5 grid grid-cols-2 gap-1.5">
            {PROGRAMME.map((ex) => (
              <div key={ex.name} className="flex flex-col items-center gap-1 rounded-lg bg-[#f5f7fb] p-1.5">
                <ExerciseIllustration name={ex.name} animate className="h-14 w-full rounded-md bg-white text-blue-600" />
                <span className="text-[8px] font-medium text-slate-700">{ex.label}</span>
              </div>
            ))}
          </div>

          <span
            className="relative mt-2.5 flex items-center justify-center gap-1 overflow-hidden rounded-full bg-blue-600 py-2 text-[10px] font-semibold text-white shadow-sm transition-transform duration-150"
            style={{ transform: tap ? "scale(0.95)" : "scale(1)" }}
          >
            Démarrer cette séance <ArrowRight className="h-3 w-3" strokeWidth={2.2} />
            <Tap on={tap} />
          </span>
        </div>
      </div>
    </>
  );
}

function SessionHeader({ doneFirst }: { doneFirst: boolean }) {
  return (
    <div className="flex items-center gap-2 px-3.5 pt-3">
      <span className="text-[8.5px] text-slate-400">Quitter</span>
      <div className="flex flex-1 gap-1">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={`h-1 flex-1 rounded-full ${i === 0 ? (doneFirst ? "bg-blue-500" : "bg-blue-200") : "bg-slate-200"}`} />
        ))}
      </div>
      <span className="text-[8px] font-medium text-slate-400">1/4</span>
    </div>
  );
}

export function SessionScreen({ tap }: { tap: boolean }) {
  return (
    <>
      <SessionHeader doneFirst={false} />
      <div className={`${CARD} mx-3.5 mt-3 p-3`}>
        <p className="text-[7.5px] font-medium uppercase tracking-wide text-blue-600">Exercice 1</p>
        <p className="font-display mt-0.5 text-[15px] font-semibold text-slate-900">Pont fessier</p>
        <div className="mt-2 flex h-[128px] items-center justify-center rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white">
          <ExerciseIllustration name="Glute Bridge" animate className="h-[112px] w-[150px] text-blue-600" />
        </div>
        <p className="mt-2.5 text-[8.5px] leading-relaxed text-slate-600">
          Allongé sur le dos, genoux fléchis : montez le bassin en serrant les fessiers, tenez 3 secondes, puis redescendez doucement.
        </p>
        <p className="mt-2 inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-[8px] font-medium text-blue-700">3 séries · 10 répétitions</p>
        <span
          className="relative mt-3 flex items-center justify-center gap-1 overflow-hidden rounded-lg bg-blue-600 py-2.5 text-[10.5px] font-semibold text-white transition-transform duration-150"
          style={{ transform: tap ? "scale(0.95)" : "scale(1)" }}
        >
          <Check className="h-3.5 w-3.5" strokeWidth={2} /> J&apos;ai terminé cet exercice
          <Tap on={tap} />
        </span>
      </div>
    </>
  );
}

export function DoneScreen() {
  return (
    <>
      <SessionHeader doneFirst />
      <div className={`${CARD} mx-3.5 mt-[120px] p-5 text-center`}>
        <motion.span
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 320, damping: 18 }}
          className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border-2 border-blue-600"
        >
          <Check className="h-5 w-5 text-blue-600" strokeWidth={2.5} />
        </motion.span>
        <p className="font-display mt-2.5 text-[15px] font-semibold text-slate-900">Pont fessier</p>
        <p className="mt-0.5 text-[9px] text-slate-500">Exercice 1 sur 4 terminé</p>
        <span className="mt-4 flex items-center justify-center rounded-lg bg-blue-600 py-2.5 text-[10.5px] font-semibold text-white">
          Exercice suivant →
        </span>
      </div>
    </>
  );
}
