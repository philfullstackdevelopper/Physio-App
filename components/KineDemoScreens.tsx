"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  CheckCircle2,
  AlertTriangle,
  Clock,
  TrendingUp,
  ChevronLeft,
  MousePointer2,
  Dumbbell,
  Bike,
  Footprints,
} from "lucide-react";
import { useReducedMotion } from "@/components/PhoneDemoScreens";

// Shared choreography for the kiné-side "watch someone use it" demo — the
// counterpart to PhoneDemoScreens on the patient side. Two screens (this is
// a desktop dashboard, not a phone app): the roster, then one patient's own
// page — calendar and recommended séances side by side, exactly what the
// kiné actually sees at app/dashboard/patients/[id]/page.tsx (PatientCalendar
// + "Séances disponibles"), simplified for a small illustrative mockup. A
// visible, animated cursor drives every interaction — click the patient,
// click "Ajuster", the exercise picker (same idea as the real body-part
// library at /dashboard/exercices) opens in place of the séance card.

export type KineScreen = 0 | 1;
export type DetailTab = "seance" | "exercises";
export type CursorTarget = "patient-row" | "adjust-button" | null;

type Phase = {
  name: string;
  screen: KineScreen;
  tab: DetailTab;
  cursorTarget: CursorTarget;
  clicking: boolean;
  rowHighlight: boolean;
  adjustHighlight: boolean;
  confirmCallout: boolean;
  duration: number;
  badge: string;
  title: string;
};

const DASH_CAPTION = { badge: "Le tableau de bord", title: "Tous ses patients, en un coup d'œil." };
const DETAIL_CAPTION = { badge: "La fiche patient", title: "Son calendrier et ses séances, côte à côte." };

export const PHASES: Phase[] = [
  { name: "dash-idle", screen: 0, tab: "seance", cursorTarget: null, clicking: false, rowHighlight: false, adjustHighlight: false, confirmCallout: false, duration: 1100, ...DASH_CAPTION },
  { name: "dash-move", screen: 0, tab: "seance", cursorTarget: "patient-row", clicking: false, rowHighlight: false, adjustHighlight: false, confirmCallout: false, duration: 550, ...DASH_CAPTION },
  { name: "dash-click", screen: 0, tab: "seance", cursorTarget: "patient-row", clicking: true, rowHighlight: true, adjustHighlight: false, confirmCallout: false, duration: 450, ...DASH_CAPTION },
  { name: "detail-idle", screen: 1, tab: "seance", cursorTarget: null, clicking: false, rowHighlight: false, adjustHighlight: false, confirmCallout: false, duration: 1000, ...DETAIL_CAPTION },
  { name: "detail-move", screen: 1, tab: "seance", cursorTarget: "adjust-button", clicking: false, rowHighlight: false, adjustHighlight: false, confirmCallout: false, duration: 550, ...DETAIL_CAPTION },
  { name: "detail-click", screen: 1, tab: "seance", cursorTarget: "adjust-button", clicking: true, rowHighlight: false, adjustHighlight: true, confirmCallout: false, duration: 450, ...DETAIL_CAPTION },
  { name: "exercises", screen: 1, tab: "exercises", cursorTarget: null, clicking: false, rowHighlight: false, adjustHighlight: false, confirmCallout: true, duration: 2600, badge: "Ajuster le programme", title: "De nouveaux exercices, prêts à assigner." },
  { name: "reset", screen: 0, tab: "seance", cursorTarget: null, clicking: false, rowHighlight: false, adjustHighlight: false, confirmCallout: false, duration: 500, ...DASH_CAPTION },
];

export function useKineDemo(active: boolean) {
  const [phaseIndex, setPhaseIndex] = useState(0);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (!active || reducedMotion) return;
    const timer = setTimeout(() => {
      setPhaseIndex((i) => (i + 1) % PHASES.length);
    }, PHASES[phaseIndex].duration);
    return () => clearTimeout(timer);
  }, [active, phaseIndex, reducedMotion]);

  return { phase: PHASES[reducedMotion ? 0 : phaseIndex], phaseIndex, reducedMotion };
}

// A small pointer that travels to whichever element registered itself under
// `target`, measured against `stageEl` — no hardcoded coordinates, so it
// always lands exactly on the real button/row regardless of text length.
export function Cursor({
  stageEl,
  targetEl,
  clicking,
}: {
  stageEl: HTMLElement | null;
  targetEl: HTMLElement | null;
  clicking: boolean;
}) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!stageEl || !targetEl) {
      setPos(null);
      return;
    }
    const stageRect = stageEl.getBoundingClientRect();
    const targetRect = targetEl.getBoundingClientRect();
    setPos({
      x: ((targetRect.left + targetRect.width / 2 - stageRect.left) / stageRect.width) * 100,
      y: ((targetRect.top + targetRect.height / 2 - stageRect.top) / stageRect.height) * 100,
    });
  }, [stageEl, targetEl]);

  return (
    <AnimatePresence>
      {pos && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, left: `${pos.x}%`, top: `${pos.y}%` }}
          exit={{ opacity: 0 }}
          transition={{
            opacity: { duration: 0.2 },
            left: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
            top: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
          }}
          className="pointer-events-none absolute z-30"
        >
          <MousePointer2 className="h-4 w-4 -translate-x-1 -translate-y-1 fill-slate-900 text-slate-900 drop-shadow-md" strokeWidth={1.5} />
          <AnimatePresence>
            {clicking && (
              <motion.span
                initial={{ opacity: 0.45, scale: 0.3 }}
                animate={{ opacity: 0, scale: 2 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.45, ease: "easeOut" }}
                className="absolute left-0 top-0 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500"
              />
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const PATIENTS = [
  {
    initials: "CD",
    name: "Claire D.",
    program: "Tendinite épaule · Phase 2",
    status: "Séance du jour faite",
    tone: "text-emerald-600 bg-emerald-50",
    icon: CheckCircle2,
  },
  {
    initials: "MT",
    name: "Marc T.",
    program: "Prothèse genou · Phase 1",
    status: "Douleur signalée hier",
    tone: "text-amber-600 bg-amber-50",
    icon: AlertTriangle,
  },
  {
    initials: "SR",
    name: "Sophie R.",
    program: "Lombalgie chronique",
    status: "Aucune séance depuis 4 jours",
    tone: "text-slate-500 bg-slate-100",
    icon: Clock,
  },
];

const WEEK_BARS = [
  { day: "L", value: 72 },
  { day: "M", value: 81 },
  { day: "M", value: 64 },
  { day: "J", value: 88 },
  { day: "V", value: 76 },
  { day: "S", value: 45 },
  { day: "D", value: 58 },
];

export function DashboardScreen({
  highlighted,
  registerRowRef,
}: {
  highlighted: boolean;
  registerRowRef: (el: HTMLDivElement | null) => void;
}) {
  return (
    <>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="font-display text-lg font-semibold text-slate-900">Bonjour Julien</p>
          <p className="text-xs text-slate-500">Votre cabinet cette semaine</p>
        </div>
        <span className="flex h-8 items-center rounded-full bg-blue-50 px-3 text-[11px] font-semibold text-blue-700">
          14 patients actifs
        </span>
      </div>

      {/* Stats */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-slate-100 p-3">
          <p className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-slate-400">
            <TrendingUp className="h-3 w-3" strokeWidth={2} />
            Assiduité
          </p>
          <p className="mt-0.5 font-display text-xl font-semibold text-slate-900">82 %</p>
          <p className="text-[10px] text-emerald-600">+6 pts vs semaine dernière</p>
        </div>
        <div className="rounded-xl border border-slate-100 p-3">
          <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
            Séances complétées
          </p>
          <p className="mt-0.5 font-display text-xl font-semibold text-slate-900">63</p>
          <p className="text-[10px] text-slate-400">sur 77 programmées</p>
        </div>
      </div>

      {/* Weekly adherence bars */}
      <div className="mt-4 flex items-end justify-between rounded-xl border border-slate-100 p-3">
        {WEEK_BARS.map((b, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <div className="flex h-14 items-end">
              <div
                className={`w-4 rounded-t-sm ${b.value >= 60 ? "bg-blue-500" : "bg-blue-200"}`}
                style={{ height: `${b.value}%` }}
              />
            </div>
            <span className="text-[9px] text-slate-400">{b.day}</span>
          </div>
        ))}
      </div>

      {/* Patient rows */}
      <div className="mt-4 space-y-2">
        {PATIENTS.map((p, i) => {
          const isTarget = i === 1; // Marc T. — the one whose fiche we open
          return (
            <div
              key={p.name}
              ref={isTarget ? registerRowRef : undefined}
              className="flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 transition-colors duration-300"
              style={{
                borderColor: isTarget && highlighted ? "#bfdbfe" : "#f1f5f9",
                backgroundColor: isTarget && highlighted ? "#f8faff" : undefined,
              }}
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[10px] font-semibold text-blue-700">
                  {p.initials}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-slate-800">{p.name}</p>
                  <p className="truncate text-[11px] text-slate-400">{p.program}</p>
                </div>
              </div>
              <span
                className={`flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[10px] font-medium ${p.tone}`}
              >
                <p.icon className="h-3 w-3" strokeWidth={2} />
                {p.status}
              </span>
            </div>
          );
        })}
      </div>
    </>
  );
}

// A fortnight of illustrative adherence-calendar dots — same green/red/grey
// grading language as the real PatientCalendar, shrunk down. Day 12 is
// Marc's reported pain, matching "Douleur signalée hier" on the roster.
const CAL_DOT: Record<"green" | "red" | "grey", string> = {
  green: "bg-emerald-400",
  red: "bg-red-400",
  grey: "bg-slate-100",
};
const CAL_DAYS: { day: number; grade: "green" | "red" | "grey" }[] = [
  { day: 1, grade: "grey" }, { day: 2, grade: "grey" }, { day: 3, grade: "green" },
  { day: 4, grade: "grey" }, { day: 5, grade: "green" }, { day: 6, grade: "grey" }, { day: 7, grade: "grey" },
  { day: 8, grade: "green" }, { day: 9, grade: "grey" }, { day: 10, grade: "green" },
  { day: 11, grade: "grey" }, { day: 12, grade: "red" }, { day: 13, grade: "grey" }, { day: 14, grade: "grey" },
];
const WEEKDAY_LABELS = ["L", "M", "M", "J", "V", "S", "D"];

// Same idea as the real exercise library grid at /dashboard/exercices —
// grouped by body part, one honest icon per exercise — condensed to a
// 3-row picker for this small panel.
const PICKABLE_EXERCISES = [
  { name: "Extension du genou assise", icon: Dumbbell },
  { name: "Montée de marche", icon: Footprints },
  { name: "Vélo statique léger", icon: Bike },
];

function CalendarPanel() {
  return (
    <div className="rounded-xl border border-slate-100 p-2.5">
      <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">Calendrier</p>
      <div className="mt-2 grid grid-cols-7 gap-[3px]">
        {WEEKDAY_LABELS.map((w, i) => (
          <span key={i} className="text-center text-[6px] font-medium uppercase text-slate-300">
            {w}
          </span>
        ))}
        {CAL_DAYS.map((d) => (
          <span
            key={d.day}
            className={`flex aspect-square items-center justify-center rounded-full text-[6px] font-semibold text-white ${CAL_DOT[d.grade]}`}
          >
            {d.grade === "grey" ? "" : d.day}
          </span>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-2 text-[7px] text-slate-400">
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Fait
        </span>
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-red-400" /> Douleur
        </span>
      </div>
    </div>
  );
}

function SeancePanel({
  highlighted,
  registerAdjustRef,
}: {
  highlighted: boolean;
  registerAdjustRef: (el: HTMLButtonElement | null) => void;
}) {
  return (
    <div className="rounded-xl border border-slate-100 p-2.5">
      <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">
        Séance recommandée
      </p>
      <div className="mt-2 rounded-lg border border-slate-100 p-2">
        <p className="text-[10px] font-semibold text-slate-800">Initiation genou</p>
        <p className="text-[9px] text-slate-400">15 min · 3×/semaine</p>
        <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-amber-50 px-1.5 py-0.5 text-[9px] font-medium text-amber-600">
          <AlertTriangle className="h-2.5 w-2.5" strokeWidth={2} />
          Douleur signalée
        </span>
        <button
          type="button"
          ref={registerAdjustRef}
          tabIndex={-1}
          className="relative mt-2 flex w-full items-center justify-center rounded-md px-2 py-1.5 text-[9px] font-semibold text-white transition-transform duration-150"
          style={{
            backgroundColor: "#2563eb",
            transform: highlighted ? "scale(0.95)" : "scale(1)",
          }}
        >
          Ajuster
        </button>
      </div>
    </div>
  );
}

function ExercisesPanel() {
  return (
    <div className="rounded-xl border border-slate-100 p-2.5">
      <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">
        Exercices · Genou
      </p>
      <div className="mt-2 space-y-1.5">
        {PICKABLE_EXERCISES.map((ex) => (
          <div
            key={ex.name}
            className="flex items-center gap-1.5 rounded-lg border border-slate-100 px-1.5 py-1.5"
          >
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
              <ex.icon className="h-3 w-3" strokeWidth={1.75} />
            </span>
            <span className="truncate text-[9px] font-medium text-slate-700">{ex.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PatientDetailScreen({
  tab,
  adjustHighlighted,
  registerAdjustRef,
}: {
  tab: DetailTab;
  adjustHighlighted: boolean;
  registerAdjustRef: (el: HTMLButtonElement | null) => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2">
        <ChevronLeft className="h-4 w-4 text-slate-400" strokeWidth={2} />
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[10px] font-semibold text-blue-700">
          MT
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-900">Marc T.</p>
          <p className="truncate text-[10px] text-slate-400">Prothèse genou · Phase 1</p>
        </div>
      </div>

      <div className="flex flex-1 flex-col justify-center">
        <div className="grid grid-cols-2 gap-3">
          <CalendarPanel />
          <AnimatePresence mode="wait">
            {tab === "seance" ? (
              <motion.div
                key="seance"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <SeancePanel highlighted={adjustHighlighted} registerAdjustRef={registerAdjustRef} />
              </motion.div>
            ) : (
              <motion.div
                key="exercises"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <ExercisesPanel />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

export function KineDemoBody({
  screen,
  tab,
  rowHighlight,
  adjustHighlight,
  registerRowRef,
  registerAdjustRef,
}: {
  screen: KineScreen;
  tab: DetailTab;
  rowHighlight: boolean;
  adjustHighlight: boolean;
  registerRowRef: (el: HTMLDivElement | null) => void;
  registerAdjustRef: (el: HTMLButtonElement | null) => void;
}) {
  return (
    <AnimatePresence mode="wait">
      {screen === 0 && (
        <motion.div
          key="dashboard"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          className="absolute inset-0 px-5 pb-4 pt-5"
        >
          <DashboardScreen highlighted={rowHighlight} registerRowRef={registerRowRef} />
        </motion.div>
      )}
      {screen === 1 && (
        <motion.div
          key="detail"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          className="absolute inset-0 px-5 pb-4 pt-5"
        >
          <PatientDetailScreen
            tab={tab}
            adjustHighlighted={adjustHighlight}
            registerAdjustRef={registerAdjustRef}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
