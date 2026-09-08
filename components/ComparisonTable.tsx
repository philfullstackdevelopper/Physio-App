import {
  ArrowRight,
  Bell,
  CalendarDays,
  Check,
  CircleCheck,
  CircleEuro,
  PlayCircle,
  ShieldCheck,
  SlidersHorizontal,
  Star,
  X,
  type LucideIcon,
} from "lucide-react";
import ExerciseIllustration from "@/components/ExerciseIllustration";
import RevealGroup, { RevealItem } from "@/components/RevealGroup";

// "Ce qui change vraiment pour le patient": one row per criterion, split
// Sans / Avec. Each "Avec" cell ends with a tiny live visual of the feature
// (the demo figure is the same Everkinetic illustration the app shows).

function DemoVisual() {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-1">
      <ExerciseIllustration name="Glute Bridge" className="h-14 w-full text-blue-600" />
    </div>
  );
}

function TrendVisual() {
  const pts = [22, 16, 19, 12, 14, 8, 5];
  const d = pts.map((y, i) => `${i === 0 ? "M" : "L"} ${i * 20 + 4} ${y}`).join(" ");
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-1.5">
      <svg viewBox="0 0 128 28" className="h-14 w-full">
        {pts.map((y, i) => (
          <rect key={i} x={i * 20 + 0.5} y={y + 4} width="7" height={26 - y} rx="1" fill="#dbeafe" />
        ))}
        <path
          d={d}
          fill="none"
          stroke="#2563eb"
          strokeWidth="1.5"
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray={1}
          className="animate-[drawLine_1.6s_ease-out_both]"
        />
        {pts.map((y, i) => (
          <circle key={i} cx={i * 20 + 4} cy={y} r="1.8" fill="#fff" stroke="#2563eb" strokeWidth="1.2" />
        ))}
      </svg>
    </div>
  );
}

function PainVisual() {
  return (
    <div className="flex items-center justify-between rounded-lg border border-red-100 bg-white px-3 py-2.5">
      <span>
        <span className="block text-[11px] font-semibold text-slate-900">Douleur signalée</span>
        <span className="block text-[10px] text-slate-500">Aujourd&apos;hui, 16:30</span>
      </span>
      <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-600">5/10</span>
    </div>
  );
}

function ProgramCard({ title, tone }: { title: string; tone: "old" | "new" }) {
  return (
    <div
      className={`flex-1 rounded-lg border px-2 py-1.5 ${
        tone === "new" ? "border-blue-200 bg-blue-50/60" : "border-slate-200 bg-white"
      }`}
    >
      <p className={`text-[9px] font-semibold ${tone === "new" ? "text-blue-700" : "text-slate-500"}`}>{title}</p>
      <ul className="mt-1 space-y-1">
        {[70, 55, 62].map((w) => (
          <li key={w} className="flex items-center gap-1">
            <span className={`h-2 w-2 rounded-full ${tone === "new" ? "bg-blue-500" : "bg-slate-300"}`} />
            <span
              className={`h-1 rounded-full ${tone === "new" ? "bg-blue-200" : "bg-slate-200"}`}
              style={{ width: `${w}%` }}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

function AdjustVisual() {
  return (
    <div className="flex items-center gap-1.5">
      <ProgramCard title="Programme actuel" tone="old" />
      <ArrowRight className="h-3 w-3 shrink-0 text-blue-500" strokeWidth={2} />
      <ProgramCard title="Programme ajusté" tone="new" />
    </div>
  );
}

function FreeVisual() {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50/60 px-3 py-2.5">
      <CircleCheck className="h-5 w-5 text-emerald-600" strokeWidth={1.75} />
      <span>
        <span className="block text-[11px] font-semibold text-emerald-700">Gratuit</span>
        <span className="block text-[10px] text-slate-600">pour le patient</span>
      </span>
    </div>
  );
}

const ROWS: {
  icon: LucideIcon;
  label: string;
  without: string;
  withTitle: string;
  withBody: string;
  visual: React.ReactNode;
}[] = [
  {
    icon: PlayCircle,
    label: "Démonstration de l'exercice",
    without: "Des explications souvent incomplètes ou vite oubliées.",
    withTitle: "Démonstrations et consignes claires",
    withBody: "Mouvement animé + consignes à l'écran, accessibles à tout moment.",
    visual: <DemoVisual />,
  },
  {
    icon: CalendarDays,
    label: "Suivi entre deux rendez-vous",
    without: "Aucun suivi entre les consultations, on ne sait pas comment ça se passe.",
    withTitle: "Suivi en continu",
    withBody: "Le kiné suit l'évolution séance par séance.",
    visual: <TrendVisual />,
  },
  {
    icon: Bell,
    label: "Signalement d'une douleur",
    without: "La douleur est signalée tardivement, souvent au prochain rendez-vous.",
    withTitle: "Signalement en temps réel",
    withBody: "Le patient signale sa douleur au moment où elle apparaît.",
    visual: <PainVisual />,
  },
  {
    icon: SlidersHorizontal,
    label: "Ajustement du programme",
    without: "Ajustements uniquement lors des consultations.",
    withTitle: "Ajustements rapides",
    withBody: "Le programme est adapté sans attendre.",
    visual: <AdjustVisual />,
  },
  {
    icon: CircleEuro,
    label: "Coût pour le patient",
    without: "Coûts variables selon l'opérateur ou les moyens utilisés.",
    withTitle: "100 % pris en charge",
    withBody: "Inclus dans la prise en charge, sans frais supplémentaires.",
    visual: <FreeVisual />,
  },
];

export default function ComparisonTable() {
  return (
    <div>
      <div className="hidden grid-cols-[minmax(0,1.1fr)_minmax(0,1.2fr)_minmax(0,1.9fr)] gap-4 px-6 pb-3 lg:grid">
        <span />
        <span className="text-center text-sm font-semibold text-slate-600">Sans EasyPhysio</span>
        <span className="text-center text-sm font-semibold text-blue-600">Avec EasyPhysio</span>
      </div>

      <RevealGroup className="space-y-3">
        {ROWS.map((row) => (
          <RevealItem
            key={row.label}
            className="grid gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.2fr)_minmax(0,1.9fr)] lg:items-center lg:px-6"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <row.icon className="h-5 w-5" strokeWidth={1.75} />
              </span>
              <p className="font-display text-base font-semibold leading-snug text-slate-900">{row.label}</p>
            </div>

            <div className="flex items-start gap-3 lg:border-l lg:border-slate-100 lg:pl-5">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                <X className="h-3 w-3" strokeWidth={2.5} />
              </span>
              <p className="text-sm leading-relaxed text-slate-500">
                <span className="mr-1 font-medium text-slate-600 lg:hidden">Sans :</span>
                {row.without}
              </p>
            </div>

            <div className="flex items-center gap-3 lg:border-l lg:border-slate-100 lg:pl-5">
              <span
                aria-hidden
                className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-400 lg:flex"
              >
                <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
              </span>
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 lg:mt-0">
                <Check className="h-3 w-3" strokeWidth={2.5} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-blue-700">{row.withTitle}</p>
                <p className="mt-0.5 text-sm leading-relaxed text-slate-600">{row.withBody}</p>
              </div>
              <div className="hidden w-44 shrink-0 sm:block">{row.visual}</div>
            </div>
          </RevealItem>
        ))}
      </RevealGroup>

      <div className="mx-auto mt-8 flex max-w-2xl items-center gap-4 rounded-2xl bg-blue-50/70 px-6 py-5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
          <Star className="h-4 w-4 fill-current" strokeWidth={0} />
        </span>
        <p className="text-sm leading-relaxed text-slate-700">
          <span className="font-semibold text-slate-900">
            Plus d&apos;autonomie. Moins d&apos;oublis. De meilleurs résultats.
          </span>
          <br />
          EasyPhysio prolonge votre expertise au quotidien, même à distance.
        </p>
      </div>
    </div>
  );
}

export function ComparisonBadge() {
  return (
    <div className="inline-flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm">
      <ShieldCheck className="h-5 w-5 shrink-0 text-blue-600" strokeWidth={1.75} />
      <span className="text-sm leading-snug text-slate-700">
        Un accompagnement continu
        <br />
        qui fait toute la différence
      </span>
    </div>
  );
}
