"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Check, ClipboardList, Pause, Search, Send, SlidersHorizontal, Video } from "lucide-react";
import ExerciseIllustration from "@/components/ExerciseIllustration";
import RevealGroup, { RevealItem } from "@/components/RevealGroup";

// Landing-page "Trois étapes" section. Each card leads with a large mock of
// the real screen (kiné builder → patient player → kiné follow-up). The
// exercise figures are the vendored Everkinetic illustrations the product
// itself uses (3-frame cross-fade), so the "demo" is the actual demo the
// patient sees — not a stock photo. No human video exists yet; the player
// mock simulates playback (rep counter + progress) on top of the figure.

// Names must exist in EXERCISE_ILLUSTRATION_MAP; the label is what we show.
const PROGRAM = [
  { name: "Lateral Raise", label: "Élévation latérale", dose: "3 × 12 répétitions" },
  { name: "Banded Row", label: "Rowing élastique", dose: "3 × 12 répétitions", active: true },
  { name: "Side Plank", label: "Gainage latéral", dose: "3 × 30 secondes" },
  { name: "Glute Bridge", label: "Pont fessier", dose: "2 × 10 répétitions" },
];

const PLAYER = PROGRAM[1];
const TOTAL_REPS = 10;
const REP_MS = 1800; // half a cross-fade cycle: counter and figure stay in step

function usePlayback() {
  const [rep, setRep] = useState(6);
  useEffect(() => {
    const id = setInterval(() => setRep((r) => (r >= TOTAL_REPS ? 1 : r + 1)), REP_MS);
    return () => clearInterval(id);
  }, []);
  return rep;
}

function Figure({ name, className }: { name: string; className: string }) {
  return <ExerciseIllustration name={name} className={`${className} text-blue-600`} />;
}

function Phone({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`absolute -bottom-3 -right-2 w-[112px] rounded-[18px] border-[3px] border-slate-900 bg-white p-1.5 shadow-lg sm:-right-4 ${className}`}
    >
      {children}
    </div>
  );
}

/* ── Step 1 : kiné builds the program ─────────────────────────── */
function BuilderMock() {
  return (
    <div className="relative">
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
          <p className="text-xs font-semibold text-slate-900">
            Programme de Julien <span className="font-normal text-slate-400">· Phase 2</span>
          </p>
          <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
            8 exercices
          </span>
        </div>
        <div className="mx-3 mt-2 flex items-center gap-1.5 rounded-md border border-slate-200 px-2 py-1 text-[10px] text-slate-400">
          <Search className="h-3 w-3" strokeWidth={2} /> Rechercher un exercice…
        </div>
        <ul className="space-y-1.5 p-3">
          {PROGRAM.map((ex) => (
            <li
              key={ex.name}
              className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 ${
                ex.active ? "border-blue-500 bg-blue-50/60" : "border-slate-100"
              }`}
            >
              <Figure name={ex.name} className="h-9 w-9 shrink-0" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[11px] font-semibold text-slate-900">{ex.label}</span>
                <span className="block text-[10px] text-slate-500">{ex.dose}</span>
              </span>
              <span
                className={`flex h-4 w-4 items-center justify-center rounded-full ${
                  ex.active ? "bg-blue-600 text-white" : "border border-slate-300 text-transparent"
                }`}
              >
                <Check className="h-2.5 w-2.5" strokeWidth={3} />
              </span>
            </li>
          ))}
        </ul>
        <div className="mx-3 mb-3 flex items-center justify-center gap-1 rounded-lg border border-dashed border-slate-300 py-1.5 text-[11px] font-medium text-blue-700">
          + Ajouter un exercice
        </div>
      </div>
      <Phone className="w-[104px]">
        <div className="rounded-md bg-blue-600 px-2 py-1.5 text-[9px] font-semibold text-white">
          Programme · Phase 2
        </div>
        <ul className="mt-1.5 space-y-1">
          {PROGRAM.map((ex) => (
            <li
              key={ex.name}
              className={`flex items-center gap-1 rounded px-1 py-0.5 ${ex.active ? "bg-blue-50" : ""}`}
            >
              <Figure name={ex.name} className="h-5 w-5 shrink-0" />
              <span className="truncate text-[7px] text-slate-700">{ex.label}</span>
            </li>
          ))}
        </ul>
      </Phone>
    </div>
  );
}

/* ── Step 2 : patient follows the guided session ──────────────── */
function PlayerMock() {
  const rep = usePlayback();
  const pct = (rep / TOTAL_REPS) * 100;
  return (
    <div className="relative">
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-start justify-between px-4 pt-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">{PLAYER.label}</p>
            <p className="text-[11px] text-slate-500">{PLAYER.dose}</p>
          </div>
          <div className="relative flex h-11 w-11 items-center justify-center">
            <svg viewBox="0 0 36 36" className="absolute inset-0 -rotate-90">
              <circle cx="18" cy="18" r="15.5" fill="none" stroke="#e2e8f0" strokeWidth="3" />
              <circle
                cx="18"
                cy="18"
                r="15.5"
                fill="none"
                stroke="#2563eb"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={`${pct} 100`}
                pathLength={100}
                className="transition-[stroke-dasharray] duration-700 ease-out"
              />
            </svg>
            <span className="text-[10px] font-semibold tabular-nums text-blue-700">
              {rep}/{TOTAL_REPS}
            </span>
          </div>
        </div>
        <div className="relative mx-3 mt-2 rounded-lg bg-slate-50">
          <Figure name={PLAYER.name} className="h-40 w-full" />
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-medium text-slate-600 shadow-sm">
            <Video className="h-3 w-3 text-blue-600" strokeWidth={2} /> Démonstration
          </span>
        </div>
        <div className="flex items-center gap-2 px-4 py-3">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white">
            <Pause className="h-3 w-3 fill-current" strokeWidth={0} />
          </span>
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-blue-600 transition-[width] duration-700 ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-[10px] tabular-nums text-slate-500">
            00:{String(Math.round(rep * 4.5)).padStart(2, "0")} / 00:45
          </span>
        </div>
      </div>
      <Phone>
        <p className="px-1 text-[9px] font-semibold text-slate-900">{PLAYER.label}</p>
        <Figure name={PLAYER.name} className="h-14 w-full" />
        <p className="px-1 text-[8px] text-slate-500">{PLAYER.dose}</p>
        <div className="mt-1 rounded bg-slate-50 px-1.5 py-1 text-[7px] leading-snug text-slate-600">
          <span className="font-semibold text-slate-800">Consigne</span> Gardez le coude collé au corps
          et tirez lentement.
        </div>
        <div className="mt-1 rounded-md bg-blue-600 py-1 text-center text-[8px] font-semibold text-white">
          Terminer la série
        </div>
      </Phone>
    </div>
  );
}

/* ── Step 3 : kiné adjusts from the patient's feedback ────────── */
function PainScale() {
  // Five plain dots, the middle one selected — no emoji faces.
  return (
    <div className="flex items-center justify-between px-1">
      {[0, 1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className={`h-4 w-4 rounded-full border ${
            i === 2 ? "border-red-500 bg-red-500" : "border-slate-300"
          }`}
        />
      ))}
    </div>
  );
}

function FollowUpMock() {
  return (
    <div className="relative">
      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <p className="text-sm font-semibold text-slate-900">Suivi de Julien</p>
        <div className="mt-2 space-y-2">
          <div className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2">
            <span>
              <span className="block text-[11px] font-semibold text-slate-900">Douleur signalée</span>
              <span className="block text-[10px] text-slate-500">Hier · Élévation latérale</span>
            </span>
            <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-600">
              5/10
            </span>
          </div>
          <div className="rounded-lg border border-slate-100 px-3 py-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-900">Adhérence cette semaine</span>
              <span className="text-[11px] font-semibold text-emerald-600">82 %</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full w-[82%] origin-left animate-[growX_1.4s_ease-out_both] rounded-full bg-emerald-500" />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2">
            <span>
              <span className="block text-[11px] font-semibold text-slate-900">Dernière séance</span>
              <span className="block text-[10px] text-slate-500">Aujourd&apos;hui · 7 exercices</span>
            </span>
            <Check className="h-4 w-4 text-emerald-500" strokeWidth={2.5} />
          </div>
        </div>
      </div>
      <Phone>
        <div className="rounded-md bg-blue-600 px-2 py-1.5 text-[9px] font-semibold text-white">Mon ressenti</div>
        <p className="mt-1.5 px-1 text-[8px] text-slate-600">Comment vous sentez-vous ?</p>
        <p className="mt-1 px-1 text-[8px] font-semibold text-slate-800">Douleur ressentie</p>
        <div className="mt-1">
          <PainScale />
        </div>
        <p className="mt-0.5 text-center text-[8px] font-semibold text-red-500">5/10</p>
        <div className="mt-1 rounded bg-slate-50 px-1.5 py-1 text-[7px] leading-snug text-slate-600">
          Douleur à l&apos;épaule après l&apos;élévation latérale.
        </div>
        <div className="mt-1 flex items-center justify-center gap-1 rounded-md bg-blue-600 py-1 text-[8px] font-semibold text-white">
          Envoyer <Send className="h-2 w-2" strokeWidth={2.5} />
        </div>
      </Phone>
    </div>
  );
}

const STEPS = [
  {
    title: "Votre kiné construit votre programme",
    body: "Il choisit les exercices et la phase adaptés à votre situation, depuis sa bibliothèque.",
    mock: <BuilderMock />,
    icon: ClipboardList,
    foot: "Un programme sur-mesure",
    footSub: "Adapté à votre pathologie et à vos objectifs.",
  },
  {
    title: "Vous suivez vos séances, guidées pas à pas",
    body: "Des démonstrations et des consignes claires pour chaque mouvement, un exercice à la fois.",
    mock: <PlayerMock />,
    icon: Video,
    foot: "Guidé à chaque mouvement",
    footSub: "Des démonstrations claires et des consignes précises.",
  },
  {
    title: "Il ajuste selon vos retours",
    body: "Douleur ou difficulté ? Votre praticien le voit et adapte le programme le jour même.",
    mock: <FollowUpMock />,
    icon: SlidersHorizontal,
    foot: "Un suivi personnalisé",
    footSub: "Votre kiné ajuste pour une récupération plus rapide et efficace.",
  },
];

export default function StepsShowcase() {
  return (
    <RevealGroup className="mt-10 grid gap-8 lg:grid-cols-3 lg:gap-6">
      {STEPS.map((step, i) => (
        <RevealItem key={step.title} className="relative flex">
          <article className="flex flex-1 flex-col rounded-2xl border border-slate-200/80 bg-white/80 p-5 shadow-sm backdrop-blur-sm">
            <div className="flex items-start gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white">
                {i + 1}
              </span>
              <div>
                <h3 className="text-base font-semibold leading-snug text-slate-900">{step.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-500">{step.body}</p>
              </div>
            </div>
            <div className="mt-5 flex-1 pb-4 pr-4">{step.mock}</div>
            <div className="mt-6 flex items-center gap-3 border-t border-slate-100 pt-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                <step.icon className="h-5 w-5" strokeWidth={1.75} />
              </span>
              <span>
                <span className="block text-sm font-semibold text-slate-900">{step.foot}</span>
                <span className="block text-xs text-slate-500">{step.footSub}</span>
              </span>
            </div>
          </article>
          {i < STEPS.length - 1 && (
            <span
              aria-hidden
              className="absolute -right-5 top-1/2 z-10 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-blue-600 shadow-sm lg:flex"
            >
              <ArrowRight className="h-4 w-4" strokeWidth={2} />
            </span>
          )}
        </RevealItem>
      ))}
    </RevealGroup>
  );
}
