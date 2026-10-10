import Link from "next/link";
import { ChevronLeft, CheckCircle2 } from "lucide-react";

// Affichage seul du détail d'une séance passée (les données viennent de
// page.tsx) — séparé pour pouvoir le prévisualiser avec des données fictives
// sans connexion (/prototypes/patient-ecrans?ecran=historique-detail).
//
// Une page = un écran (audit des formats, 2026-10-10) : le titre reste en
// place, seule la liste des exercices défile si elle dépasse.
export default function HistoriqueDetailView({
  name,
  dateLabel,
  feedback,
  exercises,
}: {
  name: string;
  dateLabel: string;
  /** Ressenti enregistré pour CETTE séance ; null s'il n'y en a pas. */
  feedback: { pain_score: number; notes: string | null } | null;
  exercises: string[];
}) {
  return (
    <main className="flex flex-col p-6 max-sm:h-[calc(100dvh-var(--phone-chrome))] max-sm:p-4 sm:h-dvh sm:p-8 short:sm:py-4">
      <div className="mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col">
        <Link href="/patient/historique" className="flex items-center gap-1 self-start text-sm text-slate-500 hover:underline">
          <ChevronLeft className="h-4 w-4" strokeWidth={2} />
          Historique
        </Link>

        <h1 className="font-display mt-3 text-2xl font-semibold text-slate-900 short:mt-2">{name}</h1>
        <p className="mt-1 text-sm text-slate-500">{dateLabel}</p>

        <div className="-mx-1 mt-5 min-h-0 flex-1 overflow-y-auto overscroll-contain px-1 pb-1 short:mt-3">
          {feedback && (
            <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 pl-3.5 border-l-2 border-l-blue-600 short:mb-4">
              <p className="text-sm font-medium text-slate-900">Douleur ressentie : {feedback.pain_score}/10</p>
              {feedback.notes && <p className="mt-1 text-sm text-slate-600">« {feedback.notes} »</p>}
            </div>
          )}

          <h2 className="text-sm font-medium text-slate-700">Exercices réalisés</h2>
          <ol className="mt-3 space-y-2">
            {exercises.map((exerciseName, i) => (
              <li key={i} className="flex items-start gap-3 rounded-xl border border-slate-100 bg-white p-4 shadow-sm short:p-3">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" strokeWidth={2} />
                <p className="flex-1 font-medium text-slate-900">{exerciseName}</p>
              </li>
            ))}
          </ol>

          {!feedback && <p className="mt-6 text-center text-xs text-slate-400">Aucun ressenti enregistré pour cette séance.</p>}
        </div>
      </div>
    </main>
  );
}
