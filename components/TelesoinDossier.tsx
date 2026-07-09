// Live "dossier de suivi" shown to the kiné during a télésoin call: adherence,
// per-exercise difficulty (hardest first), and recent pain/notes. Presentational
// only — the call page fetches the data and passes it in.

export interface DossierExercise {
  name: string;
  count: number;
  avgDifficulty: number | null; // 1-10
  lastNote: string | null;
}
export interface DossierFeedback {
  recordedFor: string;
  pain: number;
  difficulty: number | null;
  notes: string | null;
}
export interface DossierData {
  totalSessions: number;
  weekSessions: number;
  streak: number;
  avgPain: number | null;
  exercises: DossierExercise[];
  recentFeedback: DossierFeedback[];
}

const difficultyLabel = (avg: number) => (avg < 4 ? "Facile" : avg < 7 ? "Moyen" : "Difficile");

export default function TelesoinDossier({ patientName, data }: { patientName: string; data: DossierData }) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Dossier de suivi</h2>
        <p className="text-sm text-slate-500">{patientName}</p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Séances totales", value: data.totalSessions },
          { label: "Cette semaine", value: data.weekSessions },
          { label: "Jours d'affilée", value: `${data.streak} 🔥` },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-slate-100 bg-white p-3 text-center shadow-sm">
            <div className="text-xl font-semibold text-slate-900 tabular-nums">{s.value}</div>
            <div className="mt-0.5 text-[11px] text-slate-500">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="flex items-baseline justify-between">
          <h3 className="text-sm font-medium text-slate-900">Exercices — du plus dur au plus facile</h3>
          {data.avgPain !== null && (
            <span className="text-xs text-slate-500">
              Douleur moy. <span className="font-semibold text-slate-800">{data.avgPain}/10</span>
            </span>
          )}
        </div>
        {data.exercises.length === 0 ? (
          <p className="mt-2 text-sm text-slate-400">Pas encore de ressenti par exercice.</p>
        ) : (
          <ul className="mt-2 divide-y divide-slate-100 text-sm">
            {data.exercises.map((e) => (
              <li key={e.name} className="py-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-slate-800">{e.name}</span>
                  <span className="whitespace-nowrap text-slate-700">
                    {e.avgDifficulty !== null ? (
                      <>
                        <span className="font-semibold">{Math.round(e.avgDifficulty * 10) / 10}/10</span>{" "}
                        <span className="text-slate-500">{difficultyLabel(e.avgDifficulty)}</span>
                      </>
                    ) : (
                      <span className="text-slate-400">Pas de note</span>
                    )}
                  </span>
                </div>
                <span className="text-xs text-slate-400">
                  {e.count} retour{e.count > 1 ? "s" : ""}
                </span>
                {e.lastNote && <p className="mt-0.5 italic text-slate-600">« {e.lastNote} »</p>}
              </li>
            ))}
          </ul>
        )}
      </div>

      {data.recentFeedback.length > 0 && (
        <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-medium text-slate-900">Ressenti récent par séance</h3>
          <ul className="mt-2 divide-y divide-slate-100 text-sm">
            {data.recentFeedback.map((f, i) => (
              <li key={i} className="py-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">{f.recordedFor}</span>
                  <span className="text-slate-700">
                    Douleur <span className="font-semibold">{f.pain}/10</span>
                    {f.difficulty != null && <> · Difficulté {f.difficulty}/10</>}
                  </span>
                </div>
                {f.notes && <p className="mt-0.5 italic text-slate-600">« {f.notes} »</p>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
