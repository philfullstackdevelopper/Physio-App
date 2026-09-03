import { Check } from "lucide-react";
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

function Value({ value }: { value: string | { check: true } }) {
  if (typeof value === "object") {
    return (
      <span className="inline-flex items-center gap-1.5">
        <Check className="h-4 w-4 shrink-0 text-blue-600" strokeWidth={2.5} />
        Gratuit
      </span>
    );
  }
  return <>{value}</>;
}

// A literal 3-column spreadsheet table is the classic "AI comparison page"
// signature. The same information reads as a comparison without the grid:
// each row leads with the criterion, then Papier/SMS trail off in quiet
// text while EasyPhysio's answer is the one thing styled to stand out —
// the eye still lands on the same "we win" story a table would tell.
export default function ComparisonTable() {
  return (
    <div className="divide-y divide-slate-200">
      <RevealGroup>
        {ROWS.map((row) => (
          <RevealItem key={row.label} className="py-6 first:pt-0 last:pb-0">
            <p className="font-display text-base font-semibold text-slate-900">{row.label}</p>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              Papier : <Value value={row.paper} /> · SMS : <Value value={row.sms} />
            </p>
            <p className="mt-1.5 flex items-center gap-2 text-sm font-medium text-blue-700">
              <LogoMark size={16} />
              <Value value={row.app} />
            </p>
          </RevealItem>
        ))}
      </RevealGroup>
    </div>
  );
}
