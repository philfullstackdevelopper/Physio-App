import {
  Activity,
  Check,
  Minus,
  Sparkles,
  UserRound,
  X,
  type LucideIcon,
} from "lucide-react";
import RevealGroup, { RevealItem } from "@/components/RevealGroup";

// "Ce qui change vraiment pour le patient": a 3-column matrix (EasyPhysio
// vs. une appli fitness généraliste vs. rien du tout), one row per critère.
// Layout borrowed from a classic SaaS "comparison grid" pattern, restyled
// in the site's own blue/emerald/slate palette.

type Status = "yes" | "partial" | "no";

const COLUMNS: { name: string; sub: string; icon: LucideIcon; highlight?: boolean }[] = [
  { name: "EasyPhysio", sub: "avec votre kiné", icon: Sparkles, highlight: true },
  { name: "Appli fitness généraliste", sub: "sans suivi clinique", icon: Activity },
  { name: "Rien", sub: "mémoire seule", icon: UserRound },
];

const ROWS: { label: string; values: [Status, Status, Status] }[] = [
  { label: "Démonstrations et consignes claires", values: ["yes", "partial", "no"] },
  { label: "Suivi de l'évolution par le kiné", values: ["yes", "no", "no"] },
  { label: "Signalement de douleur en temps réel", values: ["yes", "no", "no"] },
  { label: "Ajustement du programme à distance", values: ["yes", "no", "no"] },
  { label: "Coût clair, sans surprise", values: ["yes", "partial", "yes"] },
];

function scoreOf(col: number) {
  return ROWS.reduce((total, row) => {
    const v = row.values[col];
    return total + (v === "yes" ? 1 : v === "partial" ? 0.5 : 0);
  }, 0);
}

function StatusIcon({ value }: { value: Status }) {
  if (value === "yes") {
    return (
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
        <Check className="h-4 w-4" strokeWidth={2.75} />
      </span>
    );
  }
  if (value === "partial") {
    return (
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        <Minus className="h-4 w-4" strokeWidth={2.5} />
      </span>
    );
  }
  return (
    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-50 text-slate-300">
      <X className="h-4 w-4" strokeWidth={2.5} />
    </span>
  );
}

export default function ComparisonTable() {
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[640px] rounded-3xl border border-slate-200/80 bg-white p-2 shadow-sm sm:p-3">
        {/* Header row: label column + 3 product columns */}
        <div className="grid grid-cols-[1.3fr_1fr_1fr_1fr] items-end gap-2 px-4 pb-6 pt-8 sm:gap-4 sm:px-6">
          <span />
          {COLUMNS.map((col) => (
            <div key={col.name} className="relative flex flex-col items-center text-center">
              {col.highlight && (
                <span className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-emerald-600 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                  Le meilleur choix
                </span>
              )}
              <span
                className={`flex h-10 w-10 items-center justify-center rounded-full ${
                  col.highlight
                    ? "bg-blue-600 text-white"
                    : "border border-slate-200 bg-slate-50 text-slate-400"
                }`}
              >
                <col.icon className="h-5 w-5" strokeWidth={1.75} />
              </span>
              <p
                className={`mt-2 text-sm font-semibold leading-tight ${
                  col.highlight ? "text-slate-900" : "text-slate-500"
                }`}
              >
                {col.name}
              </p>
              <p className="mt-0.5 text-xs text-slate-400">{col.sub}</p>
            </div>
          ))}
        </div>

        <RevealGroup className="space-y-1 px-2 sm:px-3">
          {ROWS.map((row) => (
            <RevealItem
              key={row.label}
              className="grid grid-cols-[1.3fr_1fr_1fr_1fr] items-center gap-2 rounded-xl px-2 py-3 odd:bg-slate-50/70 sm:gap-4 sm:px-4"
            >
              <p className="text-sm leading-snug text-slate-700">{row.label}</p>
              {row.values.map((value, i) => (
                <div key={i} className="flex justify-center">
                  <StatusIcon value={value} />
                </div>
              ))}
            </RevealItem>
          ))}
        </RevealGroup>

        {/* Score total row */}
        <div className="mt-1 grid grid-cols-[1.3fr_1fr_1fr_1fr] items-center gap-2 rounded-2xl bg-blue-50/70 px-4 py-4 sm:gap-4 sm:px-6">
          <p className="text-sm font-semibold text-slate-900">Score total</p>
          {COLUMNS.map((col, i) => (
            <p
              key={col.name}
              className={`text-center text-lg font-semibold ${
                col.highlight ? "text-emerald-600" : "text-slate-400"
              }`}
            >
              {scoreOf(i)}/{ROWS.length}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ComparisonBadge() {
  return (
    <div className="inline-flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm">
      <Sparkles className="h-5 w-5 shrink-0 text-blue-600" strokeWidth={1.75} />
      <span className="text-sm leading-snug text-slate-700">
        Un accompagnement continu
        <br />
        qui fait toute la différence
      </span>
    </div>
  );
}
