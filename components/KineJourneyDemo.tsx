"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useInView } from "motion/react";
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
  caption: [string, string];
};

const DEMO_FIGURE: Record<string, string> = {
  "Extension du genou assise": "Leg Extension",
  "Montée de marche": "Step-Up",
  "Squat assisté": "Bodyweight Squat",
  "Fente statique": "Split Squat",
  "Pont fessier": "Glute Bridge",
  "Extension ischio debout": "Leg Curl",
};
function Fig({ label, size = "h-7 w-7" }: { label: string; size?: string }) {
  return <ExerciseIllustration name={DEMO_FIGURE[label] ?? label} animate={false} className={`${size} shrink-0 text-brand`} />;
}

const base = { clicking: false, squatOut: false, pontIn: false, saved: false };
const PHASES: Phase[] = [
  { ...base, scene: 1, target: null, duration: 2400,
    caption: ["1. La liste des patients.", "Marc a signalé une douleur à 7/10 pendant sa dernière séance."] },
  { ...base, scene: 1, target: "marc", duration: 1000,
    caption: ["1. La liste des patients.", "Le kiné ouvre la fiche de Marc."] },
  { ...base, scene: 1, target: "marc", clicking: true, duration: 700,
    caption: ["1. La liste des patients.", "Le kiné ouvre la fiche de Marc."] },
  { ...base, scene: 2, target: null, duration: 2600,
    caption: ["2. La fiche de Marc.", "Douleur, adhérence, dernière séance, et son programme semaine par semaine."] },
  { ...base, scene: 2, target: "week", duration: 1000,
    caption: ["2. La fiche de Marc.", "La semaine en cours est en rouge : le kiné l'ouvre."] },
  { ...base, scene: 2, target: "week", clicking: true, duration: 700,
    caption: ["2. La fiche de Marc.", "La semaine en cours est en rouge : le kiné l'ouvre."] },
  { ...base, scene: 3, target: null, duration: 2200,
    caption: ["3. La semaine, jour par jour.", "Mercredi, douleur élevée pendant la séance."] },
  { ...base, scene: 3, target: "adjust", duration: 1000,
    caption: ["3. La semaine, jour par jour.", "Le kiné clique sur « Ajuster / changer la séance »."] },
  { ...base, scene: 3, target: "adjust", clicking: true, duration: 700,
    caption: ["3. La semaine, jour par jour.", "Le kiné clique sur « Ajuster / changer la séance »."] },
  { ...base, scene: 4, target: null, duration: 1900,
    caption: ["4. Ajuster la séance.", "Un exercice à retirer, un autre à ajouter — pour Marc uniquement."] },
  { ...base, scene: 4, target: "squat", duration: 1000,
    caption: ["4. Ajuster la séance.", "Le squat assisté était trop douloureux : il clique pour le retirer."] },
  { ...base, scene: 4, target: "squat", clicking: true, squatOut: true, duration: 1200,
    caption: ["4. Ajuster la séance.", "Le squat assisté était trop douloureux : retiré."] },
  { ...base, scene: 4, target: "pont", squatOut: true, duration: 1000,
    caption: ["4. Ajuster la séance.", "Il clique sur « Pont fessier » pour l'ajouter à la place."] },
  { ...base, scene: 4, target: "pont", clicking: true, squatOut: true, pontIn: true, duration: 1200,
    caption: ["4. Ajuster la séance.", "Le pont fessier remplace le squat assisté."] },
  { ...base, scene: 4, target: "save", squatOut: true, pontIn: true, duration: 1000,
    caption: ["4. Ajuster la séance.", "Le kiné clique sur « Enregistrer les modifications »."] },
  { ...base, scene: 4, target: "save", clicking: true, squatOut: true, pontIn: true, duration: 700,
    caption: ["4. Ajuster la séance.", "Le kiné clique sur « Enregistrer les modifications »."] },
  { ...base, scene: 3, target: null, squatOut: true, pontIn: true, saved: true, duration: 3400,
    caption: ["C'est fait.", "Marc est prévenu et voit sa séance mise à jour dès sa prochaine connexion."] },
];

const STATIC: Phase = PHASES[0];

type Tone = "ok" | "warn" | "danger";
const TONE_TEXT: Record<Tone, string> = { ok: "text-ok", warn: "text-warn", danger: "text-danger" };
const TONE_BAR: Record<Tone, string> = { ok: "bg-ok", warn: "bg-warn", danger: "bg-danger" };

const PATIENT_ROWS = [
  { initials: "MT", name: "Marc T.", condition: "Gonarthrose", phase: "Phase 1", last: "Aujourd'hui", adherence: 82, adhTone: "ok" as Tone, signal: "Douleur signalée 7/10", signalTone: "danger" as Tone },
  { initials: "SR", name: "Sophie R.", condition: "Tendinopathie de l'épaule", phase: "Phase 2", last: "Il y a 4 jours", adherence: 41, adhTone: "warn" as Tone, signal: "Dernière séance faite il y a 4 jours", signalTone: "warn" as Tone },
  { initials: "PM", name: "Paul M.", condition: "Lombalgie chronique", phase: "Phase 3", last: "Hier", adherence: 94, adhTone: "ok" as Tone, signal: "À jour", signalTone: "ok" as Tone },
  { initials: "JL", name: "Julie L.", condition: "Entorse de cheville", phase: "Phase 2", last: "Aujourd'hui", adherence: 88, adhTone: "ok" as Tone, signal: "À jour", signalTone: "ok" as Tone },
];

const SIDEBAR_LINKS = [
  { label: "Tableau de bord", icon: LayoutDashboard, active: false },
  { label: "Mes patients", icon: UsersRound, active: true },
  { label: "Messages", icon: MessageCircle, active: false },
  { label: "Mes séances", icon: Dumbbell, active: false },
  { label: "Mes exercices", icon: ListChecks, active: false },
  { label: "Tarif & paiements", icon: Wallet, active: false },
];

// Reprend components/DashboardSidebar.tsx (colonne sombre, mêmes six
// destinations, avatar + nom en bas) — visible sur toutes les scènes pour que
// la démo se lise comme "l'appli", pas comme des pages isolées.
function SidebarMock() {
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
            {l.label}
          </span>
        ))}
      </nav>
      <div className="flex items-center gap-2 border-t border-white/10 px-1 pt-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand text-[10px] font-semibold">JR</span>
        <div className="min-w-0">
          <p className="truncate text-xs font-medium">Julien R.</p>
          <p className="text-[10px] text-white/60">Kinésithérapeute</p>
        </div>
      </div>
      <span className="mt-1.5 flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-white/70">
        <LogOut className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
        Se déconnecter
      </span>
    </aside>
  );
}

// Fiche patient : bandeau de chiffres sur une ligne, comme la vraie page.
function StatBar() {
  return (
    <div className="grid grid-cols-3 divide-x divide-line rounded-xl border border-line">
      <div className="px-3 py-2">
        <p className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-xs text-muted">Douleur</span>
          <span className="text-lg font-semibold text-danger">7/10</span>
        </p>
        <p className="text-[10px] leading-tight text-danger">↑ 2 depuis la séance précédente</p>
      </div>
      <div className="flex flex-wrap items-center gap-x-2 px-3 py-2">
        <span className="text-xs text-muted">Adhérence</span>
        <span className="text-lg font-semibold text-ok">82 %</span>
        <span className="rounded-full bg-ok-soft px-2 py-0.5 text-[10px] font-medium text-ok">Bonne</span>
      </div>
      <div className="flex flex-wrap items-center gap-x-2 px-3 py-2">
        <span className="text-xs text-muted">Dernière séance</span>
        <span className="whitespace-nowrap text-lg font-semibold text-ink">Aujourd&apos;hui</span>
      </div>
    </div>
  );
}

function PatientHeader() {
  return (
    <div className="flex items-start justify-between gap-3">
      <p className="text-xl font-semibold text-ink">Marc T.</p>
      <span className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs font-medium text-ink">
        <SlidersHorizontal className="h-3.5 w-3.5" strokeWidth={1.75} />
        Gérer
      </span>
    </div>
  );
}

const WEEKS = [
  { n: 1, range: "8 – 14 sept.", tone: "active" as const, exercises: ["Extension du genou assise", "Montée de marche"] },
  { n: 2, range: "15 – 21 sept.", tone: "active" as const, exercises: ["Extension du genou assise", "Montée de marche"] },
  { n: 3, range: "22 – 28 sept.", tone: "danger" as const, exercises: ["Extension du genou assise", "Montée de marche", "Squat assisté"] },
];

const DAYS = [
  { day: "Lundi", date: "22 sept.", tone: "active" as const, label: "Réalisée" },
  { day: "Mardi", date: "23 sept.", tone: "default" as const, label: "Non fait" },
  { day: "Mercredi", date: "24 sept.", tone: "danger" as const, label: "Douleur élevée" },
  { day: "Jeudi", date: "25 sept.", tone: "current" as const, label: "Non fait", today: true },
  { day: "Vendredi", date: "26 sept.", tone: "default" as const, label: "Non fait" },
  { day: "Samedi", date: "27 sept.", tone: "default" as const, label: "Non fait" },
  { day: "Dimanche", date: "28 sept.", tone: "default" as const, label: "Non fait" },
];

const LIBRARY = ["Fente statique", "Pont fessier", "Extension ischio debout", "Montée de marche"];
const BODY_PARTS = ["Genou", "Hanche", "Cheville", "Dos", "Épaule", "Cou"];

export default function KineJourneyDemo() {
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

  const [captionLead, captionRest] = ph.caption;

  const weekItems: SegmentItem[] = WEEKS.map((w) => ({
    key: String(w.n),
    tone: w.tone,
    badge: w.n === 3 ? "Cette semaine" : undefined,
    ariaLabel: `Semaine ${w.n}`,
    buttonRef: w.n === 3 ? setWeekEl : undefined,
    content: (
      <div className="flex h-full w-full flex-col items-center justify-between gap-1">
        <div className="flex flex-col items-center">
          <span className="flex items-center gap-1.5 whitespace-nowrap text-sm font-semibold">
            Semaine {w.n}
            {w.tone === "danger" ? <AlertTriangle className="h-4 w-4" strokeWidth={2} /> : <CheckCircle2 className="h-4 w-4" strokeWidth={2} />}
          </span>
          <span className="text-[11px] font-medium opacity-90">({w.range})</span>
        </div>
        <span className="flex w-full items-start justify-center gap-1">
          {w.exercises.map((e) => (
            <span key={e} className="flex w-11 flex-col items-center gap-0.5">
              <Fig label={e} size="h-9 w-9" />
              <span className="line-clamp-2 text-center text-[8px] font-medium leading-tight">{e}</span>
            </span>
          ))}
        </span>
      </div>
    ),
  }));

  const dayItems: SegmentItem[] = DAYS.map((d) => ({
    key: d.day,
    tone: d.tone,
    badge: d.today ? "Aujourd'hui" : undefined,
    disabled: true,
    ariaLabel: d.day,
    content: (
      <>
        <span className="text-[11px] font-semibold">{d.day}</span>
        <span className="text-[10px] opacity-80">{d.date}</span>
        {d.tone === "danger" ? (
          <AlertTriangle className="h-3.5 w-3.5" strokeWidth={2} />
        ) : d.tone === "active" ? (
          <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2} />
        ) : (
          <Circle className="h-3.5 w-3.5" strokeWidth={1.5} />
        )}
        <span className="text-[10px]">{d.label}</span>
      </>
    ),
  }));

  const currentExercises = ["Extension du genou assise", "Montée de marche", "Squat assisté"];

  // No card padding around the screen itself — it should read like an
  // embedded video/product screenshot (full width, flush edges), not a
  // screenshot floating inside a second frame (Philippe, 2026-09-09).
  return (
    <div ref={ref}>
      {/* Pastille masquée sur téléphone et écran peu haut : la place va à la démo. */}
      <div className="hidden flex-wrap items-center justify-center gap-3 sm:flex sm:short:hidden">
        <span className="rounded-full bg-brand px-4 py-1.5 text-sm font-medium text-white">Démo interactive</span>
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
                      <p className="text-xl font-semibold text-ink">Mes patients</p>
                      <p className="mt-0.5 text-xs text-muted">Suivez tous vos patients et intervenez en quelques clics.</p>
                    </div>
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-brand px-3 py-1.5 text-xs font-medium text-white">
                      <Plus className="h-3.5 w-3.5" strokeWidth={2} />
                      Ajouter un patient
                    </span>
                  </div>
                  <div className="mt-4 flex items-center gap-2">
                    <span className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden whitespace-nowrap rounded-lg border border-line bg-surface px-2.5 py-1.5 text-[11px] text-muted">
                      <Search className="h-3.5 w-3.5" strokeWidth={1.75} />
                      Rechercher un patient…
                    </span>
                    <span className="flex shrink-0 items-center gap-0.5 whitespace-nowrap rounded-full border border-line bg-app-bg p-0.5 text-[10px] font-medium">
                      <span className="rounded-full bg-surface px-2 py-0.5 text-ink shadow-sm">Tous (4)</span>
                      <span className="px-2 py-0.5 text-muted">À surveiller (2)</span>
                      <span className="px-2 py-0.5 text-muted">À jour (2)</span>
                      <span className="px-2 py-0.5 text-muted">Ne paient plus (0)</span>
                    </span>
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-line bg-surface px-2 py-1.5 text-[10px] font-medium text-ink">
                      <SlidersHorizontal className="h-3.5 w-3.5" strokeWidth={1.75} />
                      Filtres
                    </span>
                  </div>
                  <div className="mt-3 rounded-xl border border-line bg-surface">
                    <div className="grid gap-x-2 grid-cols-[minmax(0,2.5fr)_0.8fr_1fr_0.9fr_minmax(0,1.6fr)_2.25rem] border-b border-line px-3 py-2 text-[10px] font-medium uppercase tracking-wide text-muted">
                      <span>Patient</span><span>Phase</span><span>Dernière séance</span><span>Adhérence</span><span>Signal</span><span />
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
                            <span className="block truncate text-[10px] text-muted">{r.condition}</span>
                          </span>
                        </span>
                        <span><span className="rounded-full bg-brand-soft px-2 py-0.5 text-[10px] font-semibold text-brand">{r.phase}</span></span>
                        <span className="text-xs font-semibold tabular-nums text-ink">{r.last}</span>
                        <span className="pr-3">
                          <span className={`text-sm font-semibold tabular-nums ${TONE_TEXT[r.adhTone]}`}>{r.adherence} %</span>
                          <span className="mt-1 block h-1 w-full rounded-full bg-line">
                            <span className={`block h-1 rounded-full ${TONE_BAR[r.adhTone]}`} style={{ width: `${r.adherence}%` }} />
                          </span>
                        </span>
                        <span className={`flex min-w-0 items-center gap-1 text-[11px] font-medium ${TONE_TEXT[r.signalTone]}`}>
                          {r.signalTone === "ok" && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-ok" />}
                          {r.signalTone === "danger" && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-danger" />}
                          <span className="leading-tight">{r.signal}</span>
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
                    Retour à la liste
                  </span>
                  <div className="mt-2"><PatientHeader /></div>
                  <div className="mt-3"><StatBar /></div>
                  <div className="mt-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-ink">Programme, semaine par semaine</p>
                      <p className="text-[11px] text-muted">Cliquez sur une semaine pour voir le détail jour par jour et changer la séance.</p>
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
                    Retour à la liste
                  </span>
                  <div className="mt-2"><PatientHeader /></div>
                  {ph.saved && (
                    <p className="mt-2 flex items-center gap-1.5 rounded-lg bg-ok-soft px-3 py-2 text-xs font-medium text-ok">
                      <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2} />
                      Séance ajustée — le patient a été prévenu.
                    </p>
                  )}
                  <div className="mt-3"><StatBar /></div>
                  <div className="mt-3 rounded-2xl border border-line bg-surface p-4 shadow-sm">
                    <span className="flex items-center gap-1.5 text-xs font-medium text-muted">
                      <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
                      Toutes les semaines
                    </span>
                    <div className="mt-2 flex items-start justify-between gap-3">
                      <div>
                        <p className="flex items-center gap-1.5 text-base font-semibold text-ink">
                          <ChevronLeft className="h-3.5 w-3.5 text-muted" strokeWidth={2} />
                          Semaine 3
                          <ChevronRight className="h-3.5 w-3.5 text-muted" strokeWidth={2} />
                        </p>
                        <p className="text-xs text-muted">22 – 28 sept.</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-[10px] font-medium text-muted">Séance cette semaine</p>
                          <p className="text-xs font-semibold text-ink">Initiation genou</p>
                        </div>
                        <span ref={setAdjustEl} className="rounded-full bg-brand px-3 py-1.5 text-xs font-medium text-white">
                          Ajuster / changer la séance
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
                        <p className="shrink-0 text-base font-semibold text-ink">Ajuster la séance</p>
                        <p className="truncate text-xs text-muted">Initiation genou · pour Marc uniquement</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <span className="inline-flex items-center gap-1 rounded-full bg-brand-dark px-3 py-1 text-xs font-semibold text-white">
                          <Repeat className="h-3.5 w-3.5" strokeWidth={2} />
                          Changer de séance
                        </span>
                        <X className="ml-1 h-4 w-4 text-muted" strokeWidth={1.75} />
                      </div>
                    </div>
                    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-4 px-4 py-3">
                      <div className="rounded-xl border border-line bg-app-bg p-3">
                        <div className="flex items-baseline justify-between">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Séance actuelle</p>
                          <span className="text-[10px] text-muted">3 exercices</span>
                        </div>
                        <p className="mt-0.5 text-[10px] text-muted">Cliquez sur un exercice pour le retirer.</p>
                        <div className="mt-2 space-y-1.5">
                          {currentExercises.map((e) => {
                            const out = e === "Squat assisté" && ph.squatOut;
                            return (
                              <div
                                key={e}
                                ref={e === "Squat assisté" ? setSquatEl : undefined}
                                className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 text-[11px] transition-colors duration-300 ${
                                  out ? "border-danger-soft bg-danger-soft text-danger" : "border-line bg-surface text-ink"
                                }`}
                              >
                                <Fig label={e} size="h-6 w-6" />
                                <span className={`flex-1 truncate ${out ? "line-through" : ""}`}>{e}</span>
                                {out && <span className="flex shrink-0 items-center gap-0.5 font-medium">À retirer <X className="h-3 w-3" strokeWidth={2} /></span>}
                              </div>
                            );
                          })}
                          {ph.pontIn && (
                            <div className="flex items-center gap-2 rounded-lg border border-ok-soft bg-ok-soft px-2 py-1.5 text-[11px] text-ok">
                              <Fig label="Pont fessier" size="h-6 w-6" />
                              <span className="flex-1 truncate">Pont fessier</span>
                              <span className="shrink-0 font-medium">Ajouté</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Ajouter un exercice</p>
                        <span className="mt-1.5 flex items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-[11px] text-muted">
                          <Search className="h-3.5 w-3.5" strokeWidth={1.75} />
                          Rechercher un exercice…
                        </span>
                        <div className="mt-1.5 grid grid-cols-6 gap-1">
                          {BODY_PARTS.map((bp, k) => (
                            <span key={bp} className={`rounded-lg border px-1 py-1 text-center text-[10px] font-medium ${k === 0 ? "border-brand bg-brand-soft text-brand" : "border-line text-muted"}`}>
                              {bp}
                            </span>
                          ))}
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-1.5">
                          {LIBRARY.map((e) => {
                            const added = e === "Pont fessier" && ph.pontIn;
                            return (
                              <div
                                key={e}
                                ref={e === "Pont fessier" ? setPontEl : undefined}
                                className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 text-[11px] transition-colors duration-300 ${
                                  added ? "border-brand bg-brand-soft text-brand" : "border-line text-ink"
                                }`}
                              >
                                <Fig label={e} size="h-6 w-6" />
                                <span className="flex-1 truncate">{e}</span>
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
                        Retirer cette séance
                      </span>
                      <div className="flex items-center gap-1.5">
                        {ph.squatOut && <span className="rounded-full bg-danger-soft px-2.5 py-0.5 text-[10px] font-medium text-danger">1 retiré</span>}
                        {ph.pontIn && <span className="rounded-full bg-ok-soft px-2.5 py-0.5 text-[10px] font-medium text-ok">1 ajouté</span>}
                        <span className="rounded-full border border-line px-3 py-1.5 text-[11px] font-medium text-ink">Annuler</span>
                        <span ref={setSaveEl} className="rounded-full bg-brand px-3 py-1.5 text-[11px] font-medium text-white">
                          Enregistrer les modifications
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
