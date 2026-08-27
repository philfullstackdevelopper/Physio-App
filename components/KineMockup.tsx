import { CheckCircle2, AlertTriangle, Clock, TrendingUp } from "lucide-react";

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

export default function KineMockup() {
  return (
    <div className="relative mx-auto w-full max-w-md" aria-hidden>
      <div className="overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-white shadow-xl shadow-blue-900/5">
        {/* Browser chrome */}
        <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/80 px-4 py-2.5">
          <span className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-300" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
          </span>
          <span className="flex-1 truncate rounded-full bg-white px-3 py-1 text-center text-[10px] text-slate-400">
            app.physio-app.fr/cabinet
          </span>
        </div>

        <div className="p-5">
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
            {PATIENTS.map((p) => (
              <div
                key={p.name}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 px-3 py-2.5"
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
            ))}
          </div>
        </div>
      </div>

      {/* Floating callout */}
      <div className="absolute -right-4 -top-4 hidden rotate-2 items-center gap-2 rounded-2xl border border-blue-100 bg-white px-3 py-2 shadow-md sm:flex">
        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" strokeWidth={2} />
        <span className="whitespace-nowrap text-xs font-semibold text-slate-700">
          Programme ajusté en 2 clics
        </span>
      </div>
    </div>
  );
}
