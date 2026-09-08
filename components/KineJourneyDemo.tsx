"use client";

import { useEffect, useRef, useState } from "react";
import { useInView } from "motion/react";
import { ArrowRight, Check, CheckCircle2, ChevronRight, Lightbulb, Plus, Search, Smartphone, X } from "lucide-react";
import { Cursor } from "@/components/KineDemoScreens";
import ExerciseIllustration from "@/components/ExerciseIllustration";
import { useReducedMotion } from "@/components/PhoneDemoScreens";

// Trois panneaux côte à côte = les trois vrais écrans (tableau de bord,
// fiche patient, modale d'ajustement), simplifiés. Un curseur enchaîne :
// clic Marc T. → panneau 2 s'allume → clic « Ajuster la séance » →
// panneau 3 → clic « Squat assisté » (à retirer) → clic « Enregistrer »
// → résumé + bandeau. Boucle ≈ 12 s. Reduced-motion : tout allumé, sans curseur.
type Target = "marc" | "adjust" | "squat" | "save" | null;
type Phase = { target: Target; clicking: boolean; lit2: boolean; lit3: boolean; marcHi: boolean; squatOut: boolean; saved: boolean; duration: number };

// Démo animée (Everkinetic) à côté de chaque exercice cité dans la démo.
// Clé = libellé affiché, valeur = nom présent dans EXERCISE_ILLUSTRATION_MAP.
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
  { target: null,     clicking: false, lit2: false, lit3: false, marcHi: false, squatOut: false, saved: false, duration: 1200 },
  { target: "marc",   clicking: false, lit2: false, lit3: false, marcHi: false, squatOut: false, saved: false, duration: 700 },
  { target: "marc",   clicking: true,  lit2: false, lit3: false, marcHi: true,  squatOut: false, saved: false, duration: 500 },
  { target: null,     clicking: false, lit2: true,  lit3: false, marcHi: true,  squatOut: false, saved: false, duration: 1300 },
  { target: "adjust", clicking: false, lit2: true,  lit3: false, marcHi: true,  squatOut: false, saved: false, duration: 700 },
  { target: "adjust", clicking: true,  lit2: true,  lit3: false, marcHi: true,  squatOut: false, saved: false, duration: 500 },
  { target: null,     clicking: false, lit2: true,  lit3: true,  marcHi: true,  squatOut: false, saved: false, duration: 1100 },
  { target: "squat",  clicking: false, lit2: true,  lit3: true,  marcHi: true,  squatOut: false, saved: false, duration: 700 },
  { target: "squat",  clicking: true,  lit2: true,  lit3: true,  marcHi: true,  squatOut: true,  saved: false, duration: 600 },
  { target: "save",   clicking: false, lit2: true,  lit3: true,  marcHi: true,  squatOut: true,  saved: false, duration: 800 },
  { target: "save",   clicking: true,  lit2: true,  lit3: true,  marcHi: true,  squatOut: true,  saved: true,  duration: 500 },
  { target: null,     clicking: false, lit2: true,  lit3: true,  marcHi: true,  squatOut: true,  saved: true,  duration: 2500 },
];

const STATIC: Phase = { target: null, clicking: false, lit2: true, lit3: true, marcHi: true, squatOut: true, saved: true, duration: 0 };

function PanelTitle({ n, title, sub }: { n: number; title: string; sub: string }) {
  return (
    <p className="flex items-center gap-2 text-sm text-ink">
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand text-[11px] font-semibold text-white">{n}</span>
      <span className="font-semibold">{title}</span>
      <span className="text-muted">— {sub}</span>
    </p>
  );
}

function Initials({ text, tone }: { text: string; tone: "brand" | "ok" | "warn" | "danger" }) {
  const cls = { brand: "bg-brand-soft text-brand", ok: "bg-ok-soft text-ok", warn: "bg-warn-soft text-warn", danger: "bg-surface text-danger" }[tone];
  return <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${cls}`}>{text}</span>;
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
  const [saveEl, setSaveEl] = useState<HTMLElement | null>(null);
  const targetEl = ph.target === "marc" ? marcEl : ph.target === "adjust" ? adjustEl : ph.target === "squat" ? squatEl : ph.target === "save" ? saveEl : null;

  const panel = (lit: boolean) => `rounded-2xl border border-line bg-surface p-4 transition-opacity duration-500 ${lit ? "opacity-100" : "opacity-45"}`;

  return (
    <div ref={ref} className="rounded-[2rem] border border-slate-200/70 bg-white p-5 shadow-sm sm:p-8">
      <div className="flex flex-wrap items-center justify-center gap-3">
        <span className="rounded-full bg-brand px-4 py-1.5 text-sm font-medium text-white">Démo interactive</span>
        <span className="text-sm text-slate-500">Regardez le parcours, du tableau de bord à l&apos;ajustement.</span>
      </div>

      <div ref={setStage} className="relative mt-6 grid gap-4 lg:grid-cols-[1fr_auto_1fr_auto_1fr] lg:items-stretch" aria-hidden>
        {/* 1 — Tableau de bord */}
        <div className={panel(true)}>
          <PanelTitle n={1} title="Dashboard" sub="Ce qui compte aujourd'hui" />
          <div className="mt-3 flex items-center justify-between"><p className="text-sm font-semibold text-ink">Bonjour Julien</p><span className="text-[11px] text-muted">Mercredi 3 septembre</span></div>
          <div className="mt-3 grid grid-cols-4 gap-1.5 text-center">
            {[["8", "Séances faites", "text-ok"], ["2", "Douleurs signalées", "text-danger"], ["1", "Sans activité", "text-warn"], ["12", "Patients suivis", "text-ink"]].map(([v, l, c]) => (
              <div key={l} className="rounded-lg border border-line p-1.5"><p className={`text-base font-semibold tabular-nums ${c}`}>{v}</p><p className="text-[9px] leading-tight text-muted">{l}</p></div>
            ))}
          </div>
          <p className="mt-3 text-[11px] font-semibold text-ink">À traiter aujourd&apos;hui</p>
          <div ref={setMarcEl} className={`mt-1.5 flex items-center gap-2 rounded-lg border px-2 py-1.5 transition-colors duration-300 ${ph.marcHi ? "border-danger/30 bg-danger-soft" : "border-danger-soft bg-danger-soft/60"}`}>
            <Initials text="MT" tone="danger" /><span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold text-ink">Marc T.</span><span className="block text-[10px] text-danger">Douleur signalée</span></span><span className="text-xs font-semibold text-danger">5/10</span><ChevronRight className="h-3.5 w-3.5 text-muted" strokeWidth={1.75} />
          </div>
          <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-line px-2 py-1.5"><Initials text="SR" tone="warn" /><span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold text-ink">Sophie R.</span><span className="block text-[10px] text-warn">Aucune séance depuis 4 jours</span></span><ChevronRight className="h-3.5 w-3.5 text-muted" strokeWidth={1.75} /></div>
          <p className="mt-3 text-[11px] font-semibold text-ink">Activité récente</p>
          {[["PM", "Paul M.", "Aujourd'hui"], ["JL", "Julie L.", "Hier"], ["CD", "Claire D.", "Hier"]].map(([ini, n, w]) => (
            <div key={n} className="mt-1 flex items-center gap-2 px-1 py-1"><Initials text={ini} tone="ok" /><span className="flex-1 truncate text-[11px] text-ink"><b className="font-semibold">{n}</b> a terminé sa séance</span><span className="text-[10px] text-muted">{w}</span></div>
          ))}
        </div>

        <ArrowRight className="hidden h-5 w-5 self-center text-blue-300 lg:block" strokeWidth={1.75} />

        {/* 2 — Fiche patient */}
        <div className={panel(ph.lit2)}>
          <PanelTitle n={2} title="Patient" sub="Comprendre le suivi" />
          <div className="mt-3 flex items-start justify-between gap-2">
            <div><p className="text-sm font-semibold text-ink">Marc T.</p><p className="text-[11px] text-muted">Prothèse genou · Phase 1</p></div>
            <span ref={setAdjustEl} className="rounded-full bg-brand px-3 py-1.5 text-[11px] font-medium text-white">Ajuster la séance</span>
          </div>
          <div className="mt-3 grid grid-cols-3 divide-x divide-line rounded-lg border border-line text-center">
            <div className="p-2"><p className="text-[9px] text-muted">Douleur</p><p className="text-sm font-semibold text-danger">5/10</p><p className="text-[9px] text-danger">↑2 depuis hier</p></div>
            <div className="p-2"><p className="text-[9px] text-muted">Adhérence</p><p className="text-sm font-semibold text-ink">82 %</p><span className="rounded-full bg-ok-soft px-1.5 text-[9px] text-ok">Bonne</span></div>
            <div className="p-2"><p className="text-[9px] text-muted">Dernière séance</p><p className="text-sm font-semibold text-ink">Aujourd&apos;hui</p><p className="text-[9px] text-muted">15 min · 3 exercices</p></div>
          </div>
          <p className="mt-3 text-[11px] font-semibold text-ink">Calendrier</p>
          <div className="mt-1.5 grid grid-cols-7 gap-1">
            {[["L", "ok"], ["M", "ok"], ["M", "muted"], ["J", "ok"], ["V", "danger"], ["S", "muted"], ["D", "muted"]].map(([d, t], k) => (
              <span key={k} className={`flex aspect-square items-center justify-center rounded-full text-[9px] font-semibold ${t === "ok" ? "bg-ok-soft text-ok" : t === "danger" ? "bg-danger-soft text-danger" : "bg-app-bg text-muted"}`}>{d}</span>
            ))}
          </div>
          <p className="mt-3 text-[11px] font-semibold text-ink">Séance recommandée</p>
          <p className="text-xs font-semibold text-ink">Initiation genou <span className="font-normal text-muted">· 15 min · 3 exercices</span></p>
          <ul className="mt-1.5 divide-y divide-line rounded-lg border border-line">
            {["Extension du genou assise", "Montée de marche", "Squat assisté"].map((e) => (
              <li key={e} className="flex items-center gap-2 px-2 py-1 text-[11px] text-ink"><Fig label={e} size="h-6 w-6" />{e}</li>
            ))}
          </ul>
        </div>

        <ArrowRight className="hidden h-5 w-5 self-center text-blue-300 lg:block" strokeWidth={1.75} />

        {/* 3 — Ajuster */}
        <div className={panel(ph.lit3)}>
          <PanelTitle n={3} title="Action" sub="Ajuster en deux clics" />
          <p className="mt-3 text-sm font-semibold text-ink">Ajuster la séance</p>
          <p className="text-[11px] text-muted">Initiation genou — les modifications ne concernent que Marc.</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-wide text-muted">Exercices actuels</p>
              {["Extension du genou assise", "Montée de marche"].map((e) => (
                <div key={e} className="mt-1 flex items-center gap-1.5 rounded-lg border border-line px-2 py-1.5 text-[10px] text-ink"><Fig label={e} /><span className="flex-1 truncate">{e}</span><Check className="h-3 w-3 text-brand" strokeWidth={2} /></div>
              ))}
              <div ref={setSquatEl} className={`mt-1 flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-[10px] transition-colors duration-300 ${ph.squatOut ? "border-danger-soft bg-danger-soft text-danger" : "border-line text-ink"}`}>
                <Fig label="Squat assisté" /><span className="flex-1 truncate">Squat assisté</span>{ph.squatOut ? <span className="flex items-center gap-0.5 font-medium">À retirer <X className="h-3 w-3" strokeWidth={2} /></span> : <Check className="h-3 w-3 text-brand" strokeWidth={2} />}
              </div>
            </div>
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-wide text-muted">Ajouter un exercice</p>
              <div className="mt-1 flex items-center gap-1 rounded-lg border border-line px-2 py-1.5 text-[10px] text-muted"><Search className="h-3 w-3" strokeWidth={1.75} />Rechercher…</div>
              {[["Fente statique", false], ["Pont fessier", ph.saved || ph.squatOut], ["Extension ischio debout", false]].map(([e, on]) => (
                <div key={String(e)} className={`mt-1 flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-[10px] transition-colors duration-300 ${on ? "border-ok-soft bg-ok-soft text-ok" : "border-line text-ink"}`}><Fig label={String(e)} /><span className="flex-1 truncate">{String(e)}</span>{on ? <span className="font-medium">À ajouter</span> : <Plus className="h-3 w-3 text-brand" strokeWidth={2} />}</div>
              ))}
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5 text-[10px]">
            <span className={`rounded-full px-2 py-0.5 font-medium transition-opacity ${ph.squatOut ? "bg-danger-soft text-danger opacity-100" : "opacity-0"}`}>1 exercice retiré</span>
            <span className={`rounded-full px-2 py-0.5 font-medium transition-opacity ${ph.squatOut ? "bg-ok-soft text-ok opacity-100" : "opacity-0"}`}>1 exercice ajouté</span>
          </div>
          <div className="mt-3 flex justify-end gap-1.5">
            <span className="rounded-full border border-line px-3 py-1.5 text-[11px] font-medium text-ink">Annuler</span>
            <span ref={setSaveEl} className={`rounded-full px-3 py-1.5 text-[11px] font-medium text-white transition-colors ${ph.saved ? "bg-ok" : "bg-brand"}`}>{ph.saved ? "Enregistré ✓" : "Enregistrer les modifications"}</span>
          </div>
        </div>

        {!reduced && <Cursor stageEl={stage} targetEl={targetEl} clicking={ph.clicking} />}
      </div>

      <div className={`mt-5 flex items-center gap-2 rounded-xl bg-brand-soft px-4 py-2.5 text-sm text-brand transition-opacity duration-500 ${ph.saved || !ph.lit2 ? "opacity-100" : "opacity-0"}`}>
        <Lightbulb className="h-4 w-4 shrink-0" strokeWidth={1.75} />
        {ph.saved ? "Marc T. verra sa séance ajustée dès sa prochaine connexion." : "Marc T. a signalé une douleur pendant sa séance."}
      </div>

      <div className="mt-6 flex flex-col items-center justify-center gap-4 border-t border-slate-200 pt-6 sm:flex-row sm:gap-6">
        <p className="flex items-center gap-2 text-sm text-slate-600"><Smartphone className="h-5 w-5 text-blue-600" strokeWidth={1.75} />Le patient verra son nouveau programme dès sa prochaine connexion.</p>
        <ArrowRight className="hidden h-4 w-4 text-slate-400 sm:block" strokeWidth={1.75} />
        <div className={`rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm shadow-sm transition-opacity duration-500 ${ph.saved ? "opacity-100" : "opacity-40"}`}>
          <p className="font-medium text-slate-900">Programme mis à jour par votre kiné</p>
          <p className="flex items-center gap-1 text-xs text-emerald-600"><CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2} />Nouvelle séance disponible</p>
        </div>
      </div>
    </div>
  );
}
