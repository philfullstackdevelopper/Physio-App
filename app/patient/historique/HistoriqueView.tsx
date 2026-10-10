import Link from "next/link";
import { ChevronRight, Lock } from "lucide-react";

export type HistoryGroup = { day: string; logs: { id: string; name: string; time: string }[] };

// Affichage seul de l'Historique (les données viennent de page.tsx) — séparé
// pour pouvoir le prévisualiser avec des données fictives sans connexion
// (/prototypes/patient-ecrans?ecran=historique).
//
// Une page = un écran (audit des formats, 2026-10-10) : le titre reste en
// place et seule la liste des séances défile — avant, la page entière
// s'allongeait avec l'historique.
export default function HistoriqueView({
  groups,
  lockedDays,
}: {
  /** Jours visibles en clair, du plus récent au plus ancien. */
  groups: HistoryGroup[];
  /** Jours plus anciens verrouillés par l'offre du patient. */
  lockedDays: string[];
}) {
  const empty = groups.length === 0 && lockedDays.length === 0;
  return (
    <main className="flex flex-col p-6 max-sm:h-[calc(100dvh-var(--phone-chrome))] max-sm:p-4 sm:h-dvh sm:p-8 short:sm:py-4">
      <div className="mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col">
        <h1 className="font-display text-3xl font-semibold text-slate-900 short:text-2xl">Historique</h1>
        <p className="mt-1 text-sm text-slate-500">Toutes vos séances terminées.</p>

        {empty ? (
          <div className="mt-8 rounded-xl border border-slate-100 bg-white p-6 text-center text-sm text-slate-500 shadow-sm">
            Aucune séance terminée pour le moment.
          </div>
        ) : (
          <div className="-mx-1 mt-6 min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain px-1 pb-1 short:mt-3 short:space-y-4">
            {groups.map((g) => (
              <div key={g.day}>
                <h2 className="text-sm font-medium capitalize text-slate-500">{g.day}</h2>
                <div className="mt-2 space-y-2">
                  {g.logs.map((log) => (
                    <Link
                      key={log.id}
                      href={`/patient/historique/${log.id}`}
                      className="flex items-center justify-between rounded-xl border border-slate-100 bg-white px-4 py-3.5 shadow-sm transition hover:shadow-md"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-900">{log.name}</p>
                        <p className="text-xs text-slate-400">{log.time}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" strokeWidth={2} />
                    </Link>
                  ))}
                </div>
              </div>
            ))}

            {lockedDays.length > 0 && (
              <div>
                <h2 className="text-sm font-medium capitalize text-slate-400">
                  {lockedDays.length} jour{lockedDays.length > 1 ? "s" : ""} plus ancien
                  {lockedDays.length > 1 ? "s" : ""}
                </h2>
                <div className="mt-2 space-y-2">
                  {lockedDays.map((day) => (
                    <div
                      key={day}
                      className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3.5"
                    >
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200/70 text-slate-400">
                          <Lock className="h-3.5 w-3.5" strokeWidth={2} />
                        </span>
                        <p className="truncate text-sm font-medium capitalize text-slate-400">{day}</p>
                      </div>
                      {/* Téléphone : texte court, sinon le lien écrasait le jour. */}
                      <Link href="/patient/compte" className="shrink-0 text-xs font-semibold text-brand hover:underline">
                        <span className="max-sm:hidden">Passez à Standard pour avoir accès à cette partie !</span>
                        <span className="sm:hidden">Passer à Standard</span>
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
