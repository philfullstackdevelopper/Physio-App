"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useInView } from "motion/react";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Dumbbell,
  Flame,
  LayoutDashboard,
  ListChecks,
  LogOut,
  MessageCircle,
  Plus,
  Search,
  UsersRound,
  Wallet,
  X,
} from "lucide-react";
import { Cursor } from "@/components/KineDemoScreens";
import ExerciseIllustration from "@/components/ExerciseIllustration";
import { useReducedMotion } from "@/components/PhoneDemoScreens";

// One big screen instead of three small side-by-side panels, modeled on the
// actual three real screens (components/PatientsTable.tsx, the patient
// detail page, components/AdjustWorkoutModal.tsx) rather than an invented
// simplification — Philippe, 2026-09-09: "base it on the full screen the
// kiné sees". It plays slowly (long holds, not a quick loop) with a bold
// caption under the screen at each step, like a narrated walkthrough rather
// than a fast ambient animation — a visitor should be able to read every
// step, not just notice motion. Auto-animated, not visitor-clickable
// (confirmed with Philippe): a fake cursor drives the same three clicks a
// kiné would make — patient row → "Ajuster la séance" → swap an exercise →
// "Enregistrer" — then loops.
type Scene = 1 | 2 | 3;
type Target = "marc" | "adjust" | "squat" | "pont" | "save" | null;
type Phase = {
  scene: Scene;
  target: Target;
  clicking: boolean;
  marcHi: boolean;
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
  return <ExerciseIllustration name={DEMO_FIGURE[label] ?? label} className={`${size} shrink-0 text-brand`} />;
}

const PHASES: Phase[] = [
  { scene: 1, target: null, clicking: false, marcHi: false, squatOut: false, pontIn: false, saved: false, duration: 2200,
    caption: ["1. La liste des patients.", "Marc a signalé une douleur pendant sa dernière séance."] },
  { scene: 1, target: "marc", clicking: false, marcHi: false, squatOut: false, pontIn: false, saved: false, duration: 1000,
    caption: ["1. La liste des patients.", "Le kiné ouvre la fiche de Marc."] },
  { scene: 1, target: "marc", clicking: true, marcHi: true, squatOut: false, pontIn: false, saved: false, duration: 700,
    caption: ["1. La liste des patients.", "Le kiné ouvre la fiche de Marc."] },
  { scene: 2, target: null, clicking: false, marcHi: true, squatOut: false, pontIn: false, saved: false, duration: 2200,
    caption: ["2. La fiche de Marc.", "Douleur, adhérence, dernière séance : tout est là, en un coup d'œil."] },
  { scene: 2, target: "adjust", clicking: false, marcHi: true, squatOut: false, pontIn: false, saved: false, duration: 1000,
    caption: ["2. La fiche de Marc.", "Le kiné clique sur « Ajuster la séance »."] },
  { scene: 2, target: "adjust", clicking: true, marcHi: true, squatOut: false, pontIn: false, saved: false, duration: 700,
    caption: ["2. La fiche de Marc.", "Le kiné clique sur « Ajuster la séance »."] },
  { scene: 3, target: null, clicking: false, marcHi: true, squatOut: false, pontIn: false, saved: false, duration: 1900,
    caption: ["3. Ajuster la séance.", "Un exercice à retirer, un autre à ajouter — tout depuis cet écran."] },
  { scene: 3, target: "squat", clicking: false, marcHi: true, squatOut: false, pontIn: false, saved: false, duration: 1000,
    caption: ["3. Ajuster la séance.", "Le squat assisté était trop douloureux : il clique pour le retirer."] },
  { scene: 3, target: "squat", clicking: true, marcHi: true, squatOut: true, pontIn: false, saved: false, duration: 1200,
    caption: ["3. Ajuster la séance.", "Le squat assisté était trop douloureux : retiré."] },
  { scene: 3, target: "pont", clicking: false, marcHi: true, squatOut: true, pontIn: false, saved: false, duration: 1000,
    caption: ["3. Ajuster la séance.", "Il clique sur « Pont fessier » pour l'ajouter à la place."] },
  { scene: 3, target: "pont", clicking: true, marcHi: true, squatOut: true, pontIn: true, saved: false, duration: 1200,
    caption: ["3. Ajuster la séance.", "Le pont fessier remplace le squat assisté."] },
  { scene: 3, target: "save", clicking: false, marcHi: true, squatOut: true, pontIn: true, saved: false, duration: 1000,
    caption: ["3. Ajuster la séance.", "Le kiné clique sur « Enregistrer »."] },
  { scene: 3, target: "save", clicking: true, marcHi: true, squatOut: true, pontIn: true, saved: true, duration: 1000,
    caption: ["3. Ajuster la séance.", "Le kiné clique sur « Enregistrer »."] },
  { scene: 3, target: null, clicking: false, marcHi: true, squatOut: true, pontIn: true, saved: true, duration: 3200,
    caption: ["C'est fait.", "Marc verra sa séance mise à jour dès sa prochaine connexion — sans rien faire de plus."] },
];

const STATIC: Phase = PHASES[PHASES.length - 1];

const PATIENT_ROWS = [
  { initials: "MT", name: "Marc T.", tone: "danger" as const, phase: "Genou · P1", signal: "Douleur signalée · 5/10", signalTone: "danger" as const, adherence: 82 },
  { initials: "SR", name: "Sophie R.", tone: "warn" as const, phase: "Épaule · P2", signal: "Aucune séance depuis 4 jours", signalTone: "warn" as const, adherence: 41 },
  { initials: "PM", name: "Paul M.", tone: "ok" as const, phase: "Dos · P3", signal: "À jour", signalTone: "ok" as const, adherence: 94 },
  { initials: "JL", name: "Julie L.", tone: "ok" as const, phase: "Cheville · P2", signal: "À jour", signalTone: "ok" as const, adherence: 88 },
];

function Avatar({ text, tone }: { text: string; tone: "brand" | "ok" | "warn" | "danger" }) {
  const cls = { brand: "bg-brand-soft text-brand", ok: "bg-ok-soft text-ok", warn: "bg-warn-soft text-warn", danger: "bg-danger-soft text-danger" }[tone];
  return <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${cls}`}>{text}</span>;
}

const SIDEBAR_LINKS = [
  { label: "Tableau de bord", icon: LayoutDashboard, active: false },
  { label: "Mes patients", icon: UsersRound, active: true },
  { label: "Messages", icon: MessageCircle, active: false },
  { label: "Mes séances", icon: Dumbbell, active: false },
  { label: "Mes exercices", icon: ListChecks, active: false },
  { label: "Tarif & paiements", icon: Wallet, active: false },
];

// Reprend components/DashboardSidebar.tsx (colonne sombre, mêmes six
// destinations, avatar + nom en bas) — visible sur les trois scènes pour que
// la démo se lise comme "l'appli", pas comme trois pages isolées (Philippe,
// 2026-09-09 : "vraiment vu d'ensemble de ce à quoi ressemble l'interface").
function SidebarMock() {
  return (
    <aside className="hidden w-52 shrink-0 flex-col bg-sidebar p-3 text-white sm:flex">
      <div className="flex items-center gap-2 px-1 py-1">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-brand text-xs font-bold">E</span>
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
  const [adjustEl, setAdjustEl] = useState<HTMLElement | null>(null);
  const [squatEl, setSquatEl] = useState<HTMLElement | null>(null);
  const [pontEl, setPontEl] = useState<HTMLElement | null>(null);
  const [saveEl, setSaveEl] = useState<HTMLElement | null>(null);
  const targetEl =
    ph.target === "marc" ? marcEl
    : ph.target === "adjust" ? adjustEl
    : ph.target === "squat" ? squatEl
    : ph.target === "pont" ? pontEl
    : ph.target === "save" ? saveEl
    : null;

  const [captionLead, captionRest] = ph.caption;

  // No card padding around the screen itself — it should read like an
  // embedded video/product screenshot (full width, flush edges), not a
  // screenshot floating inside a second frame (Philippe, 2026-09-09: "look
  // at how there's no white space surrounding [a video demo]").
  return (
    <div ref={ref}>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <span className="rounded-full bg-brand px-4 py-1.5 text-sm font-medium text-white">Démo interactive</span>
      </div>

      <div
        ref={setStage}
        className="relative mt-6 flex w-full overflow-hidden rounded-2xl border border-line bg-surface shadow-md"
        aria-hidden
      >
        <SidebarMock />

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Barre de navigation — reprend "← Retour à la liste" de la vraie
              fiche patient (app/dashboard/patients/[id]/page.tsx) plutôt qu'un
              chrome de navigateur inventé. */}
          <div className="flex items-center border-b border-line bg-app-bg/60 px-5 py-3">
            {ph.scene === 1 ? (
              <span className="text-xs font-medium text-muted">Mes patients</span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs font-medium text-muted">
                <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.75} />
                Retour à la liste
              </span>
            )}
          </div>

        {/* layout (not a fixed min-height) so the frame hugs whichever
            scene is showing — scene 3 has visibly less content than the
            patients list or the patient page, and a shared fixed height
            left a slab of dead white space under it (Philippe,
            2026-09-09: "take ALL the space"). */}
        <motion.div layout transition={{ layout: { duration: 0.35, ease: "easeInOut" } }} className="relative">
          <AnimatePresence mode="wait">
            {ph.scene === 1 && (
              <motion.div key="scene1" initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { duration: 0.4 } }} exit={{ opacity: 0, transition: { duration: 0.12 } }} className="p-5">
                <div className="flex items-center justify-between">
                  <p className="text-base font-semibold text-ink">Mes patients</p>
                  <span className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs text-muted"><Search className="h-3.5 w-3.5" strokeWidth={1.75} />Rechercher…</span>
                </div>
                <div className="mt-3 flex items-center gap-1 self-start rounded-full border border-line bg-app-bg p-1 text-xs font-medium">
                  <span className="rounded-full bg-surface px-3 py-1 text-ink shadow-sm">Tous (4)</span>
                  <span className="px-3 py-1 text-muted">À surveiller (2)</span>
                  <span className="px-3 py-1 text-muted">À jour (2)</span>
                </div>
                <div className="mt-4 divide-y divide-line rounded-xl border border-line">
                  {PATIENT_ROWS.map((r) => {
                    const isMarc = r.name === "Marc T.";
                    return (
                      <div
                        key={r.name}
                        ref={isMarc ? (setMarcEl as never) : undefined}
                        className={`flex items-center gap-3 px-4 py-3 transition-colors duration-300 ${isMarc && ph.marcHi ? "bg-danger-soft/50" : ""}`}
                      >
                        <Avatar text={r.initials} tone={r.tone} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-ink">{r.name}</span>
                          <span className={`block truncate text-xs ${r.signalTone === "danger" ? "text-danger" : r.signalTone === "warn" ? "text-warn" : "text-ok"}`}>{r.signal}</span>
                        </span>
                        <span className="hidden rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-medium text-brand sm:inline">{r.phase}</span>
                        <span className="hidden w-16 text-right text-xs font-semibold tabular-nums text-ink sm:inline">{r.adherence}%</span>
                        <ChevronRight className="h-4 w-4 shrink-0 text-muted" strokeWidth={1.75} />
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {ph.scene === 2 && (
              <motion.div key="scene2" initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { duration: 0.4 } }} exit={{ opacity: 0, transition: { duration: 0.12 } }} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold text-ink">Marc T.</p>
                    <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                      <span className="rounded-full bg-app-bg px-2 py-0.5 font-medium text-ink">Genou · P1</span>
                      <span className="flex items-center gap-1"><Flame className="h-3.5 w-3.5" strokeWidth={1.75} />6 j d&apos;affilée · 14 séances</span>
                    </p>
                  </div>
                  <span ref={setAdjustEl as never} className="rounded-full bg-brand px-4 py-2 text-xs font-medium text-white">Ajuster la séance</span>
                </div>
                <div className="mt-5 grid divide-y divide-line rounded-xl border border-line sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                  <div className="p-4"><p className="text-xs font-medium text-muted">Douleur</p><p className="mt-1 text-xl font-semibold text-danger">5/10</p><p className="mt-0.5 text-[11px] text-danger">↑2 depuis hier</p></div>
                  <div className="p-4"><p className="text-xs font-medium text-muted">Adhérence</p><p className="mt-1 text-xl font-semibold text-ink">82 %</p><span className="mt-0.5 inline-flex rounded-full bg-ok-soft px-2 py-0.5 text-[11px] font-medium text-ok">Bonne</span></div>
                  <div className="p-4"><p className="text-xs font-medium text-muted">Dernière séance</p><p className="mt-1 text-xl font-semibold text-ink">Aujourd&apos;hui</p><p className="mt-0.5 text-[11px] text-muted">15 min · 3 exercices</p></div>
                </div>
                <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-muted">Séance de cette semaine — Initiation genou</p>
                <ul className="mt-2 divide-y divide-line rounded-xl border border-line">
                  {["Extension du genou assise", "Montée de marche", "Squat assisté"].map((e) => (
                    <li key={e} className="flex items-center gap-2.5 px-3 py-2 text-sm text-ink"><Fig label={e} />{e}</li>
                  ))}
                </ul>
              </motion.div>
            )}

            {ph.scene === 3 && (
              <motion.div key="scene3" initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { duration: 0.4 } }} exit={{ opacity: 0, transition: { duration: 0.12 } }} className="p-5">
                <p className="text-base font-semibold text-ink">Ajuster la séance</p>
                <p className="text-xs text-muted">Initiation genou — les modifications ne concernent que Marc.</p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Exercices actuels</p>
                    <div className="mt-2 space-y-1.5">
                      {["Extension du genou assise", "Montée de marche"].map((e) => (
                        <div key={e} className="flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-xs text-ink"><Fig label={e} size="h-6 w-6" /><span className="flex-1 truncate">{e}</span><Check className="h-3.5 w-3.5 text-brand" strokeWidth={2} /></div>
                      ))}
                      <div ref={setSquatEl as never} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-colors duration-300 ${ph.squatOut ? "border-danger-soft bg-danger-soft text-danger" : "border-line text-ink"}`}>
                        <Fig label="Squat assisté" size="h-6 w-6" /><span className="flex-1 truncate">Squat assisté</span>{ph.squatOut ? <span className="flex items-center gap-0.5 font-medium">À retirer <X className="h-3.5 w-3.5" strokeWidth={2} /></span> : <Check className="h-3.5 w-3.5 text-brand" strokeWidth={2} />}
                      </div>
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Ajouter un exercice</p>
                    <div className="mt-2 flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-xs text-muted"><Search className="h-3.5 w-3.5" strokeWidth={1.75} />Rechercher…</div>
                    <div className="mt-1.5 space-y-1.5">
                      <div className="flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-xs text-ink"><Fig label="Fente statique" size="h-6 w-6" /><span className="flex-1 truncate">Fente statique</span><Plus className="h-3.5 w-3.5 text-brand" strokeWidth={2} /></div>
                      <div ref={setPontEl as never} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-colors duration-300 ${ph.pontIn ? "border-ok-soft bg-ok-soft text-ok" : "border-line text-ink"}`}>
                        <Fig label="Pont fessier" size="h-6 w-6" /><span className="flex-1 truncate">Pont fessier</span>{ph.pontIn ? <span className="font-medium">À ajouter</span> : <Plus className="h-3.5 w-3.5 text-brand" strokeWidth={2} />}
                      </div>
                      <div className="flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-xs text-ink"><Fig label="Extension ischio debout" size="h-6 w-6" /><span className="flex-1 truncate">Extension ischio debout</span><Plus className="h-3.5 w-3.5 text-brand" strokeWidth={2} /></div>
                    </div>
                  </div>
                </div>
                {(ph.squatOut || ph.pontIn) && (
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {ph.squatOut && <span className="rounded-full bg-danger-soft px-3 py-1 text-xs font-medium text-danger">1 exercice retiré</span>}
                    {ph.pontIn && <span className="rounded-full bg-ok-soft px-3 py-1 text-xs font-medium text-ok">1 exercice ajouté</span>}
                  </div>
                )}
                <div className="mt-4 flex justify-end gap-2">
                  <span className="rounded-full border border-line px-4 py-2 text-xs font-medium text-ink">Annuler</span>
                  <span ref={setSaveEl as never} className={`rounded-full px-4 py-2 text-xs font-medium text-white transition-colors ${ph.saved ? "bg-ok" : "bg-brand"}`}>{ph.saved ? "Enregistré ✓" : "Enregistrer les modifications"}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
        </div>

        {/* Rendered against the outer stage (sidebar + content), not the
            content pane alone — its position is computed as a % of the
            whole screen, so it must be absolutely positioned relative to
            that same box, or it lands offset by the sidebar's width
            (Philippe, 2026-09-09: "elle ne clique pas exactement sur le
            bouton"). */}
        {!reduced && <Cursor stageEl={stage} targetEl={targetEl} clicking={ph.clicking} />}
      </div>

      {/* Commentaire — en gras, lisible sans avoir à suivre le curseur, et qui
          ne change qu'entre les étapes (pas à chaque micro-mouvement) pour
          rester lisible à un rythme lent (Philippe, 2026-09-09). */}
      <div className="mt-3 text-center">
        <AnimatePresence mode="wait">
          <motion.p
            key={captionLead}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.3 } }}
            exit={{ opacity: 0, transition: { duration: 0.12 } }}
            className="text-base leading-relaxed text-slate-600"
          >
            <span className="font-semibold text-slate-900">{captionLead}</span> {captionRest}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}
