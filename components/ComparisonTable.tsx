import { Check, Minus } from "lucide-react";
import { LogoMark } from "@/components/Logo";
import RevealGroup, { RevealItem } from "@/components/RevealGroup";

type CellValue = string | { check: true };

const ROWS: {
  label: string;
  paper: CellValue;
  sms: CellValue;
  app: CellValue;
}[] = [
  {
    label: "Démonstration de l'exercice",
    paper: "Schémas sur une feuille",
    sms: "—",
    app: "Vidéo + consignes à l'écran",
  },
  {
    label: "Suivi entre deux rendez-vous",
    paper: "Rien entre les consultations",
    sms: "« Vu / pas vu »",
    app: "Séance par séance : durée et ressenti",
  },
  {
    label: "Signalement d'une douleur",
    paper: "Au prochain rendez-vous (souvent 4 à 6 semaines)",
    sms: "Non prévu",
    app: "Le jour même, remontée au praticien",
  },
  {
    label: "Ajustement du programme",
    paper: "À la consultation suivante",
    sms: "Jamais",
    app: "Après chaque séance signalée difficile",
  },
  {
    label: "Coût pour le patient",
    paper: { check: true },
    sms: "Variable selon l'opérateur",
    app: { check: true },
  },
];

function Cell({ value }: { value: string | { check: true } }) {
  if (typeof value === "object") {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-700">
        <Check className="h-4 w-4 shrink-0 text-blue-600" strokeWidth={2.5} />
        Gratuit
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5 text-sm leading-snug text-slate-600">
      {value === "—" && <Minus className="h-4 w-4 shrink-0 text-slate-300" strokeWidth={2} />}
      {value !== "—" ? value : null}
    </span>
  );
}

export default function ComparisonTable() {
  const cols = ["Programme papier", "Rappels SMS", "Physio-App"];

  return (
    <div className="overflow-x-auto rounded-3xl border border-slate-200/70 bg-white shadow-sm">
      <table className="w-full min-w-[640px] border-collapse text-left">
        <thead>
          <tr className="border-b border-slate-100">
            <th className="px-6 py-5" />
            {cols.map((c) => (
              <th
                key={c}
                scope="col"
                className={`px-6 py-5 text-sm font-semibold ${
                  c === "Physio-App"
                    ? "bg-blue-50/70 text-blue-700"
                    : "text-slate-500"
                }`}
              >
                <span className="flex items-center gap-2">
                  {c === "Physio-App" && <LogoMark size={20} />}
                  {c}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <RevealGroup as="tbody">
          {ROWS.map((row) => (
            <RevealItem as="tr" key={row.label} className="border-b border-slate-50 last:border-0">
              <th scope="row" className="px-6 py-4 text-sm font-medium text-slate-800">
                {row.label}
              </th>
              <td className="px-6 py-4 pr-10">
                <Cell value={row.paper} />
              </td>
              <td className="px-6 py-4">
                <Cell value={row.sms} />
              </td>
              <td className="bg-blue-50/40 px-6 py-4">
                <Cell value={row.app} />
              </td>
            </RevealItem>
          ))}
        </RevealGroup>
      </table>
    </div>
  );
}
