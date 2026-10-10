"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, CalendarDays, Check, Home, MessageCircle, Settings, TrendingUp, Play, CheckCircle2 } from "lucide-react";
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
// Si ces écrans changent, mettre cette démo à jour avec eux.
export type Screen = 0 | 1 | 2;
export type Step = {
  screen: Screen;
  duration: number;
  title: string;
  /** Le bouton principal de l'écran est « touché » (ondulation sur le bouton). */
  tap?: boolean;
  /** Séance : la vidéo de l'exercice est en lecture. */
  playing?: boolean;
};

export const STEPS: Step[] = [
  { screen: 0, duration: 1600, title: "Son programme de la semaine, en un coup d'œil." },
  { screen: 0, duration: 650, title: "Son programme de la semaine, en un coup d'œil.", tap: true },
  { screen: 1, duration: 1700, title: "Les exercices choisis par son kiné." },
  { screen: 1, duration: 650, title: "Les exercices choisis par son kiné.", tap: true },
  // Séance : la vidéo de démonstration démarre au toucher, puis joue — et la
  // démo s'arrête là avant de reboucler (Philippe, 2026-10-07 : « dashboard -
  // voir mon programme - commencer la séance et après la vidéo qui jouera,
  // et on s'arrête là »).
  { screen: 2, duration: 1100, title: "Un exercice à la fois, en vidéo." },
  { screen: 2, duration: 600, title: "Un exercice à la fois, en vidéo.", tap: true },
  { screen: 2, duration: 3800, title: "Un exercice à la fois, en vidéo.", playing: true },
];

// Respect prefers-reduced-motion: freeze on the first frame instead of
// looping an animation the visitor asked not to see.
// useSyncExternalStore : la façon prévue par React de suivre une valeur du
// navigateur (false côté serveur, pour un premier rendu identique).
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
function subscribeReducedMotion(onChange: () => void) {
  const mq = window.matchMedia(REDUCED_MOTION_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}
export function useReducedMotion() {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED_MOTION_QUERY).matches,
    () => false,
  );
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
          {step.screen === 2 && <SessionScreen tap={tap} playing={!!step.playing || reducedMotion} />}
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
        {/* Même Accueil que l'appli téléphone (PatientHomeView) : salutation
            sur une ligne, carte « Mon programme » (montagne à gauche), puis la
            frise « Mon programme, semaine par semaine ». */}
        <p className="mt-2.5 flex items-baseline gap-1.5 text-[14px] font-semibold text-slate-900">
          <span className="flex items-center gap-1">
            Bonjour Léa <WavingHand className="h-4 w-4" />
          </span>
          <span className="text-[8px] font-normal text-slate-500">Mercredi 7 octobre</span>
        </p>

        <div className="relative mt-2 overflow-hidden rounded-[18px] bg-gradient-to-r from-[#155dfc] to-[#1447c9] px-3 pb-3 pt-2.5 shadow-lg shadow-blue-600/25">
          <MountainScene variant="goal" progress={1 / 3} className="pointer-events-none absolute -bottom-0.5 left-0 h-12 w-[4.5rem] text-white/90" />
          <div className="relative pl-14">
            <p className="text-[7.5px] font-semibold uppercase tracking-wide text-white/75">Semaine 5</p>
            <p className="mt-0.5 text-[10.5px] font-semibold leading-tight text-white">Renforcement lombaire — niveau 2</p>
            <p className="mt-0.5 text-[8px] text-white/85">2 séances à réaliser · 20 minutes environ</p>
            <div className="mt-1.5 flex items-center gap-1.5">
              <div className="flex flex-1 gap-1">
                <span className="h-1 flex-1 rounded-full bg-white" />
                <span className="h-1 flex-1 rounded-full bg-white/25" />
                <span className="h-1 flex-1 rounded-full bg-white/25" />
              </div>
              <span className="text-[7.5px] font-semibold text-white">1/3 séances</span>
            </div>
            <span
              className="relative mt-2 flex items-center justify-center gap-1 overflow-hidden rounded-full bg-white py-1.5 text-[10px] font-semibold text-blue-600 transition-transform duration-150"
              style={{ transform: tap ? "scale(0.95)" : "scale(1)" }}
            >
              Voir mon programme <ArrowRight className="h-3 w-3" strokeWidth={2.2} />
              <Tap on={tap} />
            </span>
          </div>
        </div>

        {/* La frise, sans titre au-dessus (Philippe, 2026-10-07 : « la frise
            parle d'elle-même ») : semaine en cours en vert, « Vous êtes ici ». */}
        <div className="relative mt-8 flex">
          <span className="absolute -top-4 left-[30%] -translate-x-1/2 rounded-full bg-blue-600 px-1.5 py-px text-[7px] font-semibold text-white">Vous êtes ici</span>
          <div
            className="flex h-[150px] w-[64%] shrink-0 flex-col items-center justify-center gap-1 bg-emerald-50 text-emerald-600 shadow-sm"
            style={{ clipPath: "polygon(0 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 0 100%)", borderRadius: 14 }}
          >
            <span className="flex items-center gap-1 text-[14px] font-semibold">
              Semaine 5 <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2} />
            </span>
            <span className="text-[8px] opacity-90">(5 oct. – 11 oct.)</span>
            <span className="mt-1 text-[8px] font-medium">Séances réalisées</span>
            <span className="mt-1.5 flex gap-0.5">
              {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => (
                <span key={i} className={`flex h-3.5 w-3.5 items-center justify-center rounded-full text-[6px] font-semibold ${i === 0 ? "bg-emerald-500 text-white" : "border border-emerald-300 bg-white/60"}`}>
                  {d}
                </span>
              ))}
            </span>
          </div>
          <div
            className="-ml-2.5 flex h-[150px] flex-1 flex-col items-center justify-center gap-1 bg-white pl-3 text-slate-400 shadow-sm"
            style={{ clipPath: "polygon(0 0, 100% 0, 100% 100%, 0 100%, 12px 50%)", borderRadius: 14 }}
          >
            <span className="text-[14px] font-semibold">Sem</span>
            <span className="text-[8px]">(12 oct</span>
          </div>
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

function SessionHeader() {
  return (
    <div className="flex items-center gap-2 px-3.5 pt-3">
      <span className="text-[8.5px] text-slate-400">Quitter</span>
      <div className="flex flex-1 gap-1">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={`h-1 flex-1 rounded-full ${i === 0 ? "bg-blue-200" : "bg-slate-200"}`} />
        ))}
      </div>
      <span className="text-[8px] font-medium text-slate-400">1/4</span>
    </div>
  );
}

export function SessionScreen({ tap, playing }: { tap: boolean; playing: boolean }) {
  return (
    <>
      <SessionHeader />
      <div className={`${CARD} mx-3.5 mt-3 p-3`}>
        <p className="text-[7.5px] font-medium uppercase tracking-wide text-blue-600">Exercice 1</p>
        <p className="font-display mt-0.5 text-[15px] font-semibold text-slate-900">Pont fessier</p>
        {/* La vidéo de démonstration, dans la case de l'illustration : bouton
            lecture centré, puis lecture avec sa barre de progression. */}
        <div className="relative mt-2 flex h-[128px] items-center justify-center overflow-hidden rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white">
          <ExerciseIllustration key={playing ? "on" : "off"} name="Glute Bridge" animate={playing} className="h-[112px] w-[150px] text-blue-600" />
          {!playing && (
            <span
              className="absolute left-1/2 top-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-blue-600 shadow-lg shadow-blue-600/30 transition-transform duration-150"
              style={{ transform: `translate(-50%, -50%) scale(${tap ? 0.88 : 1})` }}
            >
              <Play className="ml-0.5 h-4 w-4 fill-white text-white" strokeWidth={0} />
              <Tap on={tap} />
            </span>
          )}
          {playing && (
            <span className="absolute inset-x-2 bottom-1.5 h-1 overflow-hidden rounded-full bg-blue-100">
              <motion.span
                className="block h-full rounded-full bg-blue-600"
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 3.8, ease: "linear" }}
              />
            </span>
          )}
        </div>
        <p className="mt-2.5 text-[8.5px] leading-relaxed text-slate-600">
          Allongé sur le dos, genoux fléchis : montez le bassin en serrant les fessiers, tenez 3 secondes, puis redescendez doucement.
        </p>
        <p className="mt-2 inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-[8px] font-medium text-blue-700">3 séries · 10 répétitions</p>
        <span className="mt-3 flex items-center justify-center gap-1 rounded-lg bg-blue-600 py-2.5 text-[10.5px] font-semibold text-white">
          <Check className="h-3.5 w-3.5" strokeWidth={2} /> J&apos;ai terminé cet exercice
        </span>
      </div>
    </>
  );
}
