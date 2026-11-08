"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useInView } from "motion/react";
import { useTranslations } from "next-intl";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  Dumbbell,
  LayoutDashboard,
  ListChecks,
  LogOut,
  MessageCircle,
  MoreVertical,
  Plus,
  Repeat,
  Search,
  SlidersHorizontal,
  Trash2,
  UsersRound,
  Wallet,
  X,
} from "lucide-react";
import { Cursor } from "@/components/KineDemoScreens";
import ExerciseIllustration from "@/components/ExerciseIllustration";
import { LogoMark } from "@/components/Logo";
import { useReducedMotion } from "@/components/PhoneDemoScreens";
import ScaleToWidth from "@/components/ScaleToWidth";
import { SegmentRow, type SegmentItem } from "@/components/WeekStrip";

// One big screen, modeled on the REAL kiné screens rather than an invented
// simplification (Philippe, 2026-09-09: "base it on the full screen the kiné
// sees"). Rebuilt 2026-10-02 to follow today's real flow, which had moved on
// since September: patient list (components/PatientsTable.tsx) → patient
// page with its stat bar and week strip (app/dashboard/patients/[id]/page.tsx,
// components/KineWeekProgramme.tsx — the strip and the day tiles reuse the
// real SegmentRow) → the week, day by day, with « Ajuster / changer la
// séance » → the adjust modal (components/AdjustWorkoutModal.tsx) → the
// « Séance ajustée » confirmation. If those screens change again, update this
// demo with them.
//
// Plays slowly, with a bold caption under the screen at each step, like a
// narrated walkthrough. Auto-animated, not visitor-clickable (confirmed with
// Philippe): a fake cursor makes the clicks a kiné would make, then loops.
type Scene = 1 | 2 | 3 | 4;
type Target = "marc" | "week" | "adjust" | "squat" | "pont" | "save" | null;
type Phase = {
  scene: Scene;
  target: Target;
  clicking: boolean;
  squatOut: boolean;
  pontIn: boolean;
  saved: boolean;
  duration: number;
  /** Clés de la légende : demo.journey.captions.<lead> / .<rest>. */
  caption: [string, string];
};

// Exercices de la démo : identifiant → nom de la banque (pour le dessin). Le
// nom affiché vient de demo.journey.exercises.<id>.
type ExId = "kneeExt" | "stepUp" | "squat" | "splitSquat" | "bridge" | "hamCurl";
const DEMO_FIGURE: Record<ExId, string> = {
  kneeExt: "Leg Extension",
  stepUp: "Step-Up",
  squat: "Bodyweight Squat",
  splitSquat: "Split Squat",
  bridge: "Glute Bridge",
  hamCurl: "Leg Curl",
};
function Fig({ id, size = "h-7 w-7" }: { id: ExId; size?: string }) {
  return <ExerciseIllustration name={DEMO_FIGURE[id]} animate={false} className={`${size} shrink-0 text-brand`} />;
}

const base = { clicking: false, squatOut: false, pontIn: false, saved: false };
const PHASES: Phase[] = [
  { ...base, scene: 1, target: null, duration: 2400,
    caption: ["list", "painSignal"] },
  { ...base, scene: 1, target: "marc", duration: 1000,
    caption: ["list", "opensMarc"] },
  { ...base, scene: 1, target: "marc", clicking: true, duration: 700,
    caption: ["list", "opensMarc"] },
  { ...base, scene: 2, target: null, duration: 2600,
    caption: ["fiche", "ficheIntro"] },
  { ...base, scene: 2, target: "week", duration: 1000,
    caption: ["fiche", "weekRed"] },
  { ...base, scene: 2, target: "week", clicking: true, duration: 700,
    caption: ["fiche", "weekRed"] },
  { ...base, scene: 3, target: null, duration: 2200,
    caption: ["week", "highPainWed"] },
  { ...base, scene: 3, target: "adjust", duration: 1000,
    caption: ["week", "clicksAdjust"] },
  { ...base, scene: 3, target: "adjust", clicking: true, duration: 700,
    caption: ["week", "clicksAdjust"] },
  { ...base, scene: 4, target: null, duration: 1900,
    caption: ["adjust", "adjustIntro"] },
  { ...base, scene: 4, target: "squat", duration: 1000,
    caption: ["adjust", "squatToRemove"] },
  { ...base, scene: 4, target: "squat", clicking: true, squatOut: true, duration: 1200,
    caption: ["adjust", "squatRemoved"] },
  { ...base, scene: 4, target: "pont", squatOut: true, duration: 1000,
    caption: ["adjust", "clickBridge"] },
  { ...base, scene: 4, target: "pont", clicking: true, squatOut: true, pontIn: true, duration: 1200,
    caption: ["adjust", "bridgeReplaces"] },
  { ...base, scene: 4, target: "save", squatOut: true, pontIn: true, duration: 1000,
    caption: ["adjust", "clickSave"] },
  { ...base, scene: 4, target: "save", clicking: true, squatOut: true, pontIn: true, duration: 700,
    caption: ["adjust", "clickSave"] },
  { ...base, scene: 3, target: null, squatOut: true, pontIn: true, saved: true, duration: 3400,
    caption: ["done", "notified"] },
];

const STATIC: Phase = PHASES[0];

type Tone = "ok" | "warn" | "danger";
const TONE_TEXT: Record<Tone, string> = { ok: "text-ok", warn: "text-warn", danger: "text-danger" };
const TONE_BAR: Record<Tone, string> = { ok: "bg-ok", warn: "bg-warn", danger: "bg-danger" };

// condition / last / signal : clés dans demo.journey.rows.
const PATIENT_ROWS = [
  { initials: "MT", name: "Marc T.", condition: "gonarthrosis", phase: 1, last: "today", adherence: 82, adhTone: "ok" as Tone, signal: "pain7", signalTone: "danger" as Tone },
  { initials: "SR", name: "Sophie R.", condition: "shoulderTendinopathy", phase: 2, last: "daysAgo4", adherence: 41, adhTone: "warn" as Tone, signal: "lastSession4", signalTone: "warn" as Tone },
  { initials: "PM", name: "Paul M.", condition: "chronicLowBack", phase: 3, last: "yesterday", adherence: 94, adhTone: "ok" as Tone, signal: "upToDate", signalTone: "ok" as Tone },
  { initials: "JL", name: "Julie L.", condition: "ankleSprain", phase: 2, last: "today", adherence: 88, adhTone: "ok" as Tone, signal: "upToDate", signalTone: "ok" as Tone },
];

// label : clé dans demo.journey.sidebar.
const SIDEBAR_LINKS = [
  { label: "dashboard", icon: LayoutDashboard, active: false },
  { label: "patients", icon: UsersRound, active: true },
  { label: "messages", icon: MessageCircle, active: false },
  { label: "sessions", icon: Dumbbell, active: false },
  { label: "exercises", icon: ListChecks, active: false },
  { label: "billing", icon: Wallet, active: false },
];

// Reprend components/DashboardSidebar.tsx (colonne sombre, mêmes six
// destinations, avatar + nom en bas) — visible sur toutes les scènes pour que
// la démo se lise comme "l'appli", pas comme des pages isolées.
function SidebarMock() {
  const t = useTranslations("demo.journey");
  return (
    <aside className="flex w-52 shrink-0 flex-col bg-sidebar p-3 text-white">
      <div className="flex items-center gap-2 px-1 py-1">
        <LogoMark size={24} />
        <span className="text-sm font-semibold">EasyPhysio</span>
      </div>
      <nav className="mt-5 flex flex-1 flex-col gap-1">
        {SIDEBAR_LINKS.map((l) => (
          <span
            key={l.label}
            className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium ${
              l.active ? "bg-white/10 text-white" : "text-white/70"
            }`}
          >
            <l.icon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
            {t(`sidebar.${l.label}`)}
          </span>
        ))}
      </nav>
      <div className="flex items-center gap-2 border-t border-white/10 px-1 pt-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand text-[10px] font-semibold">JR</span>
        <div className="min-w-0">
          <p className="truncate text-xs font-medium">Julien R.</p>
          <p className="text-[10px] text-white/60">{t("physiotherapist")}</p>
        </div>
      </div>
      <span className="mt-1.5 flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-white/70">
        <LogOut className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
        {t("exitDemo")}
      </span>
    </aside>
  );
}

// Fiche patient : bandeau de chiffres sur une ligne, comme la vraie page.
function StatBar() {
  const t = useTranslations("demo.journey");
  return (
    <div className="grid grid-cols-3 divide-x divide-line rounded-xl border border-line">
      <div className="px-3 py-2">
        <p className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-xs text-muted">{t("pain")}</span>
          <span className="text-lg font-semibold text-danger">7/10</span>
        </p>
        <p className="text-[10px] leading-tight text-danger">{t("painUp")}</p>
      </div>
      <div className="flex flex-wrap items-center gap-x-2 px-3 py-2">
        <span className="text-xs text-muted">{t("adherence")}</span>
        <span className="text-lg font-semibold text-ok">82 %</span>
        <span className="rounded-full bg-ok-soft px-2 py-0.5 text-[10px] font-medium text-ok">{t("good")}</span>
      </div>
      <div className="flex flex-wrap items-center gap-x-2 px-3 py-2">
        <span className="text-xs text-muted">{t("lastSession")}</span>
        <span className="whitespace-nowrap text-lg font-semibold text-ink">{t("rows.today")}</span>
      </div>
    </div>
  );
}

function PatientHeader() {
  const t = useTranslations("demo.journey");
  return (
    <div className="flex items-start justify-between gap-3">
      <p className="text-xl font-semibold text-ink">Marc T.</p>
      <span className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs font-medium text-ink">
        <SlidersHorizontal className="h-3.5 w-3.5" strokeWidth={1.75} />
        {t("manage")}
      </span>
    </div>
  );
}

// Dates en septembre : demo.journey.weekRange / dateSept ; jours et
// étiquettes : demo.journey.days.<day> / dayLabels.<label>.
const WEEKS = [
  { n: 1, from: 8, to: 14, tone: "active" as const, exercises: ["kneeExt", "stepUp"] as ExId[] },
  { n: 2, from: 15, to: 21, tone: "active" as const, exercises: ["kneeExt", "stepUp"] as ExId[] },
  { n: 3, from: 22, to: 28, tone: "danger" as const, exercises: ["kneeExt", "stepUp", "squat"] as ExId[] },
];

const DAYS = [
  { day: "mon", date: 22, tone: "active" as const, label: "done" },
  { day: "tue", date: 23, tone: "default" as const, label: "notDone" },
  { day: "wed", date: 24, tone: "danger" as const, label: "highPain" },
  { day: "thu", date: 25, tone: "current" as const, label: "notDone", today: true },
  { day: "fri", date: 26, tone: "default" as const, label: "notDone" },
  { day: "sat", date: 27, tone: "default" as const, label: "notDone" },
  { day: "sun", date: 28, tone: "default" as const, label: "notDone" },
];

const LIBRARY: ExId[] = ["splitSquat", "bridge", "hamCurl", "stepUp"];
// Clés dans demo.journey.bodyParts.
const BODY_PARTS = ["knee", "hip", "ankle", "back", "shoulder", "neck"];

export default function KineJourneyDemo() {
  const t = useTranslations("demo.journey");
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.4, once: false });
  const reduced = useReducedMotion();
  const [i, setI] = useState(0);
  useEffect(() => {
    if (!inView || reduced) return;
    const t = setTimeout(() => setI((k) => (k + 1) % PHASES.length), PHASES[i].duration);
    return () => clearTimeout(t);
  }, [inView, reduced, i]);
  const ph = reduced ? STATIC : PHASES[i];

  const [stage, setStage] = useState<HTMLDivElement | null>(null);
  const [marcEl, setMarcEl] = useState<HTMLElement | null>(null);
  const [weekEl, setWeekEl] = useState<HTMLButtonElement | null>(null);
  const [adjustEl, setAdjustEl] = useState<HTMLElement | null>(null);
  const [squatEl, setSquatEl] = useState<HTMLElement | null>(null);
  const [pontEl, setPontEl] = useState<HTMLElement | null>(null);
  const [saveEl, setSaveEl] = useState<HTMLElement | null>(null);
  const targetEl =
    ph.target === "marc" ? marcEl
    : ph.target === "week" ? weekEl
    : ph.target === "adjust" ? adjustEl
    : ph.target === "squat" ? squatEl
    : ph.target === "pont" ? pontEl
    : ph.target === "save" ? saveEl
    : null;

  const captionLead = t(`captions.${ph.caption[0]}`);
  const captionRest = t(`captions.${ph.caption[1]}`);

  const weekItems: SegmentItem[] = WEEKS.map((w) => ({
    key: String(w.n),
    tone: w.tone,
    badge: w.n === 3 ? t("thisWeek") : undefined,
    ariaLabel: t("weekN", { n: w.n }),
    buttonRef: w.n === 3 ? setWeekEl : undefined,
    content: (
      <div className="flex h-full w-full flex-col items-center justify-between gap-1">
        <div className="flex flex-col items-center">
          <span className="flex items-center gap-1.5 whitespace-nowrap text-sm font-semibold">
            {t("weekN", { n: w.n })}
            {w.tone === "danger" ? <AlertTriangle className="h-4 w-4" strokeWidth={2} /> : <CheckCircle2 className="h-4 w-4" strokeWidth={2} />}
          </span>
          <span className="text-[11px] font-medium opacity-90">({t("weekRange", { from: w.from, to: w.to })})</span>
        </div>
        <span className="flex w-full items-start justify-center gap-1">
          {w.exercises.map((e) => (
            <span key={e} className="flex w-11 flex-col items-center gap-0.5">
              <Fig id={e} size="h-9 w-9" />
              <span className="line-clamp-2 text-center text-[8px] font-medium leading-tight">{t(`exercises.${e}`)}</span>
            </span>
          ))}
        </span>
      </div>
    ),
  }));

  const dayItems: SegmentItem[] = DAYS.map((d) => ({
    key: d.day,
    tone: d.tone,
    badge: d.today ? t("rows.today") : undefined,
    disabled: true,
    ariaLabel: t(`days.${d.day}`),
    content: (
      <>
        <span className="text-[11px] font-semibold">{t(`days.${d.day}`)}</span>
        <span className="text-[10px] opacity-80">{t("dateSept", { d: d.date })}</span>
        {d.tone === "danger" ? (
          <AlertTriangle className="h-3.5 w-3.5" strokeWidth={2} />
        ) : d.tone === "active" ? (
          <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2} />
        ) : (
          <Circle className="h-3.5 w-3.5" strokeWidth={1.5} />
        )}
        <span className="text-[10px]">{t(`dayLabels.${d.label}`)}</span>
      </>
    ),
  }));

  const currentExercises: ExId[] = ["kneeExt", "stepUp", "squat"];

  // No card padding around the screen itself — it should read like an
  // embedded video/product screenshot (full width, flush edges), not a
  // screenshot floating inside a second frame (Philippe, 2026-09-09).
  return (
    <div ref={ref}>
      {/* Pastille masquée sur téléphone et écran peu haut : la place va à la démo. */}
      <div className="hidden flex-wrap items-center justify-center gap-3 sm:flex sm:short:hidden">
        <span className="rounded-full bg-brand px-4 py-1.5 text-sm font-medium text-white">{t("badge")}</span>
      </div>

      {/* Sur téléphone, mêmes écrans que sur ordinateur, réduits comme une
          capture (ScaleToWidth) — pas une version simplifiée (Philippe,
          2026-10-02). La légende, elle, reste en taille normale. */}
      <ScaleToWidth designWidth={760} stable className="sm:mt-6 sm:short:mt-0">
      <div
        ref={setStage}
        // inert : une image animée, pas des vrais boutons (la frise réutilise
        // le vrai SegmentRow, dont les cartes sont des <button>).
        inert
        className="relative flex w-full overflow-hidden rounded-2xl border border-line bg-surface shadow-md"
        aria-hidden
      >
        <SidebarMock />

        <div className="flex min-w-0 flex-1 flex-col bg-app-bg/40">
          <motion.div layout transition={{ layout: { duration: 0.35, ease: "easeInOut" } }} className="relative">
            <AnimatePresence mode="wait">
              {ph.scene === 1 && (
                <motion.div key="scene1" initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { duration: 0.4 } }} exit={{ opacity: 0, transition: { duration: 0.12 } }} className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xl font-semibold text-ink">{t("sidebar.patients")}</p>
                      <p className="mt-0.5 text-xs text-muted">{t("patientsSubtitle")}</p>
                    </div>
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-brand px-3 py-1.5 text-xs font-medium text-white">
                      <Plus className="h-3.5 w-3.5" strokeWidth={2} />
                      {t("addPatient")}
                    </span>
                  </div>
                  <div className="mt-4 flex items-center gap-2">
                    <span className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden whitespace-nowrap rounded-lg border border-line bg-surface px-2.5 py-1.5 text-[11px] text-muted">
                      <Search className="h-3.5 w-3.5" strokeWidth={1.75} />
                      {t("searchPatient")}
                    </span>
                    <span className="flex shrink-0 items-center gap-0.5 whitespace-nowrap rounded-full border border-line bg-app-bg p-0.5 text-[10px] font-medium">
                      <span className="rounded-full bg-surface px-2 py-0.5 text-ink shadow-sm">{t("segAll")}</span>
                      <span className="px-2 py-0.5 text-muted">{t("segWatch")}</span>
                      <span className="px-2 py-0.5 text-muted">{t("segUpToDate")}</span>
                      <span className="px-2 py-0.5 text-muted">{t("segLapsed")}</span>
                    </span>
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-line bg-surface px-2 py-1.5 text-[10px] font-medium text-ink">
                      <SlidersHorizontal className="h-3.5 w-3.5" strokeWidth={1.75} />
                      {t("filters")}
                    </span>
                  </div>
                  <div className="mt-3 rounded-xl border border-line bg-surface">
                    <div className="grid gap-x-2 grid-cols-[minmax(0,2.5fr)_0.8fr_1fr_0.9fr_minmax(0,1.6fr)_2.25rem] border-b border-line px-3 py-2 text-[10px] font-medium uppercase tracking-wide text-muted">
                      <span>{t("colPatient")}</span><span>{t("colPhase")}</span><span>{t("lastSession")}</span><span>{t("adherence")}</span><span>{t("colSignal")}</span><span />
                    </div>
                    {PATIENT_ROWS.map((r) => (
                      <div
                        key={r.name}
                        ref={r.name === "Marc T." ? setMarcEl : undefined}
                        className={`grid gap-x-2 grid-cols-[minmax(0,2.5fr)_0.8fr_1fr_0.9fr_minmax(0,1.6fr)_2.25rem] items-center border-b border-line px-3 py-2.5 last:border-b-0 ${
                          r.name === "Marc T." && ph.target === "marc" && ph.clicking ? "bg-app-bg" : ""
                        }`}
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[11px] font-semibold text-brand">{r.initials}</span>
                          <span className="min-w-0">
                            <span className="block truncate text-xs font-semibold text-ink">{r.name}</span>
                            <span className="block truncate text-[10px] text-muted">{t(`rows.${r.condition}`)}</span>
                          </span>
                        </span>
                        <span><span className="rounded-full bg-brand-soft px-2 py-0.5 text-[10px] font-semibold text-brand">{t("phaseN", { n: r.phase })}</span></span>
                        <span className="text-xs font-semibold tabular-nums text-ink">{t(`rows.${r.last}`)}</span>
                        <span className="pr-3">
                          <span className={`text-sm font-semibold tabular-nums ${TONE_TEXT[r.adhTone]}`}>{r.adherence} %</span>
                          <span className="mt-1 block h-1 w-full rounded-full bg-line">
                            <span className={`block h-1 rounded-full ${TONE_BAR[r.adhTone]}`} style={{ width: `${r.adherence}%` }} />
                          </span>
                        </span>
                        <span className={`flex min-w-0 items-center gap-1 text-[11px] font-medium ${TONE_TEXT[r.signalTone]}`}>
                          {r.signalTone === "ok" && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-ok" />}
                          {r.signalTone === "danger" && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-danger" />}
                          <span className="leading-tight">{t(`rows.${r.signal}`)}</span>
                        </span>
                        <span className="flex items-center justify-end gap-0.5 text-muted">
                          <MoreVertical className="h-3.5 w-3.5" strokeWidth={1.75} />
                          <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.75} />
                        </span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {ph.scene === 2 && (
                <motion.div key="scene2" initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { duration: 0.4 } }} exit={{ opacity: 0, transition: { duration: 0.12 } }} className="p-5">
                  <span className="flex items-center gap-1.5 text-xs font-medium text-muted">
                    <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.75} />
                    {t("backToList")}
                  </span>
                  <div className="mt-2"><PatientHeader /></div>
                  <div className="mt-3"><StatBar /></div>
                  <div className="mt-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-ink">{t("programmeTitle")}</p>
                      <p className="text-[11px] text-muted">{t("programmeHint")}</p>
                    </div>
                    <span className="flex gap-1 text-muted">
                      <span className="rounded-full border border-line p-1"><ChevronLeft className="h-3.5 w-3.5" strokeWidth={2} /></span>
                      <span className="rounded-full border border-line p-1"><ChevronRight className="h-3.5 w-3.5" strokeWidth={2} /></span>
                    </span>
                  </div>
                  <div className="-mb-6 -mt-4">
                    <SegmentRow items={weekItems} height={150} scrollable={false} compact />
                  </div>
                </motion.div>
              )}

              {(ph.scene === 3 || ph.scene === 4) && (
                <motion.div key="scene3" initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { duration: 0.4 } }} exit={{ opacity: 0, transition: { duration: 0.12 } }} className="p-5">
                  <span className="flex items-center gap-1.5 text-xs font-medium text-muted">
                    <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.75} />
                    {t("backToList")}
                  </span>
                  <div className="mt-2"><PatientHeader /></div>
                  {ph.saved && (
                    <p className="mt-2 flex items-center gap-1.5 rounded-lg bg-ok-soft px-3 py-2 text-xs font-medium text-ok">
                      <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2} />
                      {t("adjustedNotice")}
                    </p>
                  )}
                  <div className="mt-3"><StatBar /></div>
                  <div className="mt-3 rounded-2xl border border-line bg-surface p-4 shadow-sm">
                    <span className="flex items-center gap-1.5 text-xs font-medium text-muted">
                      <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
                      {t("allWeeks")}
                    </span>
                    <div className="mt-2 flex items-start justify-between gap-3">
                      <div>
                        <p className="flex items-center gap-1.5 text-base font-semibold text-ink">
                          <ChevronLeft className="h-3.5 w-3.5 text-muted" strokeWidth={2} />
                          {t("weekN", { n: 3 })}
                          <ChevronRight className="h-3.5 w-3.5 text-muted" strokeWidth={2} />
                        </p>
                        <p className="text-xs text-muted">{t("weekRange", { from: 22, to: 28 })}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-[10px] font-medium text-muted">{t("sessionThisWeek")}</p>
                          <p className="text-xs font-semibold text-ink">{t("seanceName")}</p>
                        </div>
                        <span ref={setAdjustEl} className="rounded-full bg-brand px-3 py-1.5 text-xs font-medium text-white">
                          {t("adjustOrChange")}
                        </span>
                      </div>
                    </div>
                    <SegmentRow items={dayItems} height={84} scrollable={false} compact />
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </motion.div>
        </div>

        {/* « Ajuster la séance » recouvre tout l'écran, barre latérale
            comprise, comme la vraie fenêtre (portail plein écran). */}
        <AnimatePresence>
              {ph.scene === 4 && (
                <motion.div key="scene4" initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { duration: 0.4 } }} exit={{ opacity: 0, transition: { duration: 0.12 } }} className="absolute inset-0 z-10 flex items-center justify-center bg-ink/45 p-5">
                  <div className="flex w-full flex-col rounded-2xl bg-surface shadow-xl">
                    <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5">
                      <div className="flex min-w-0 items-baseline gap-2">
                        <p className="shrink-0 text-base font-semibold text-ink">{t("adjustTitle")}</p>
                        <p className="truncate text-xs text-muted">{t("adjustSubtitle", { seance: t("seanceName"), name: "Marc" })}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <span className="inline-flex items-center gap-1 rounded-full bg-brand-dark px-3 py-1 text-xs font-semibold text-white">
                          <Repeat className="h-3.5 w-3.5" strokeWidth={2} />
                          {t("changeSession")}
                        </span>
                        <X className="ml-1 h-4 w-4 text-muted" strokeWidth={1.75} />
                      </div>
                    </div>
                    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-4 px-4 py-3">
                      <div className="rounded-xl border border-line bg-app-bg p-3">
                        <div className="flex items-baseline justify-between">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">{t("currentSessionTitle")}</p>
                          <span className="text-[10px] text-muted">{t("exerciseCount", { n: 3 })}</span>
                        </div>
                        <p className="mt-0.5 text-[10px] text-muted">{t("clickToRemove")}</p>
                        <div className="mt-2 space-y-1.5">
                          {currentExercises.map((e) => {
                            const out = e === "squat" && ph.squatOut;
                            return (
                              <div
                                key={e}
                                ref={e === "squat" ? setSquatEl : undefined}
                                className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 text-[11px] transition-colors duration-300 ${
                                  out ? "border-danger-soft bg-danger-soft text-danger" : "border-line bg-surface text-ink"
                                }`}
                              >
                                <Fig id={e} size="h-6 w-6" />
                                <span className={`flex-1 truncate ${out ? "line-through" : ""}`}>{t(`exercises.${e}`)}</span>
                                {out && <span className="flex shrink-0 items-center gap-0.5 font-medium">{t("toRemove")} <X className="h-3 w-3" strokeWidth={2} /></span>}
                              </div>
                            );
                          })}
                          {ph.pontIn && (
                            <div className="flex items-center gap-2 rounded-lg border border-ok-soft bg-ok-soft px-2 py-1.5 text-[11px] text-ok">
                              <Fig id="bridge" size="h-6 w-6" />
                              <span className="flex-1 truncate">{t("exercises.bridge")}</span>
                              <span className="shrink-0 font-medium">{t("added")}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">{t("addExercise")}</p>
                        <span className="mt-1.5 flex items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-[11px] text-muted">
                          <Search className="h-3.5 w-3.5" strokeWidth={1.75} />
                          {t("searchExercise")}
                        </span>
                        <div className="mt-1.5 grid grid-cols-6 gap-1">
                          {BODY_PARTS.map((bp, k) => (
                            <span key={bp} className={`rounded-lg border px-1 py-1 text-center text-[10px] font-medium ${k === 0 ? "border-brand bg-brand-soft text-brand" : "border-line text-muted"}`}>
                              {t(`bodyParts.${bp}`)}
                            </span>
                          ))}
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-1.5">
                          {LIBRARY.map((e) => {
                            const added = e === "bridge" && ph.pontIn;
                            return (
                              <div
                                key={e}
                                ref={e === "bridge" ? setPontEl : undefined}
                                className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 text-[11px] transition-colors duration-300 ${
                                  added ? "border-brand bg-brand-soft text-brand" : "border-line text-ink"
                                }`}
                              >
                                <Fig id={e} size="h-6 w-6" />
                                <span className="flex-1 truncate">{t(`exercises.${e}`)}</span>
                                {added ? <Check className="h-3.5 w-3.5" strokeWidth={2} /> : <Plus className="h-3.5 w-3.5 text-brand" strokeWidth={2} />}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2 border-t border-line px-4 py-2.5">
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-danger">
                        <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                        {t("removeSession")}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {ph.squatOut && <span className="rounded-full bg-danger-soft px-2.5 py-0.5 text-[10px] font-medium text-danger">{t("oneRemoved")}</span>}
                        {ph.pontIn && <span className="rounded-full bg-ok-soft px-2.5 py-0.5 text-[10px] font-medium text-ok">{t("oneAdded")}</span>}
                        <span className="rounded-full border border-line px-3 py-1.5 text-[11px] font-medium text-ink">{t("cancel")}</span>
                        <span ref={setSaveEl} className="rounded-full bg-brand px-3 py-1.5 text-[11px] font-medium text-white">
                          {t("saveChanges")}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
        </AnimatePresence>

        {/* Rendered against the outer stage (sidebar + content), not the
            content pane alone — its position is computed as a % of the
            whole screen, so it must be absolutely positioned relative to
            that same box (Philippe, 2026-09-09). */}
        {!reduced && <Cursor stageEl={stage} targetEl={targetEl} clicking={ph.clicking} />}
      </div>
      </ScaleToWidth>

      {/* Commentaire — en gras, lisible sans avoir à suivre le curseur, et qui
          ne change qu'entre les étapes (pas à chaque micro-mouvement) pour
          rester lisible à un rythme lent (Philippe, 2026-09-09). */}
      <div className="mt-3 text-center sm:short:mt-2">
        <AnimatePresence mode="wait">
          <motion.p
            key={captionLead + captionRest}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.3 } }}
            exit={{ opacity: 0, transition: { duration: 0.12 } }}
            className="text-base leading-relaxed text-slate-600 sm:short:text-sm"
          >
            <span className="font-semibold text-slate-900">{captionLead}</span> {captionRest}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}
