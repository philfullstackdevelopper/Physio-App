"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";

type ListItem = {
  id: string;
  name: string;
  conditionName?: string;
  stageLabel?: string;
  extra?: string;
};

type Tab = "mine" | "templates" | "search";

export default function SeancesTabs({
  mine,
  templates,
  duplicateSeance,
}: {
  mine: ListItem[];
  templates: ListItem[];
  duplicateSeance: (formData: FormData) => void;
}) {
  const [tab, setTab] = useState<Tab>("mine");
  const [query, setQuery] = useState("");

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    const all = [
      ...mine.map((s) => ({ ...s, source: "mine" as const })),
      ...templates.map((t) => ({ ...t, source: "templates" as const })),
    ];
    if (!q) return all;
    return all.filter(
      (s) => s.name.toLowerCase().includes(q) || s.conditionName?.toLowerCase().includes(q),
    );
  }, [mine, templates, query]);

  return (
    <div className="mt-8">
      <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
        <button
          type="button"
          onClick={() => setTab("mine")}
          className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
            tab === "mine" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Mes séances personnalisées ({mine.length})
        </button>
        <button
          type="button"
          onClick={() => setTab("templates")}
          className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
            tab === "templates"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Séances prévues ({templates.length})
        </button>
        <button
          type="button"
          onClick={() => setTab("search")}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
            tab === "search" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <Search className="h-4 w-4" strokeWidth={1.75} />
          Rechercher une séance
        </button>
      </div>

      {tab === "mine" && (
        <div className="mt-3 rounded-xl bg-white p-2 shadow-sm">
          {mine.length === 0 ? (
            <p className="p-6 text-center text-sm text-slate-500">
              Aucune séance personnalisée pour le moment. Créez-en une ci-dessus, ou
              dupliquez un modèle dans l&apos;onglet &laquo; Séances prévues &raquo;.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {mine.map((s) => (
                <li key={s.id}>
                  <Link
                    href={`/dashboard/seances/${s.id}`}
                    className="flex items-center justify-between px-4 py-3 hover:bg-slate-50"
                  >
                    <div>
                      <p className="font-medium text-slate-900">{s.name}</p>
                      <p className="text-sm text-slate-500">
                        {s.conditionName ?? "—"}
                        {s.stageLabel && <span> · {s.stageLabel}</span>}
                        {s.extra && <span className="text-slate-400"> · {s.extra}</span>}
                      </p>
                    </div>
                    <span className="text-slate-400">→</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === "templates" && (
        <div className="mt-3">
          <p className="text-sm text-slate-500">
            Déjà disponibles pour tous les kinés. Dupliquez-en une pour en faire votre
            propre version modifiable.
          </p>
          <div className="mt-3 rounded-xl bg-white p-2 shadow-sm">
            {templates.length === 0 ? (
              <p className="p-6 text-center text-sm text-slate-500">Aucun modèle disponible.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {templates.map((t) => (
                  <li key={t.id} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="font-medium text-slate-900">{t.conditionName ?? t.name}</p>
                      <p className="text-sm text-slate-500">{t.stageLabel ?? t.name}</p>
                    </div>
                    <form action={duplicateSeance}>
                      <input type="hidden" name="template_id" value={t.id} />
                      <button
                        type="submit"
                        className="rounded-md border border-blue-600 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-50"
                      >
                        Dupliquer
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {tab === "search" && (
        <div className="mt-3">
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nom de la séance ou de la condition…"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-blue-600 focus:outline-none"
          />

          <div className="mt-3 rounded-xl bg-white p-2 shadow-sm">
            {searchResults.length === 0 ? (
              <p className="p-6 text-center text-sm text-slate-500">
                Aucune séance ne correspond à &laquo; {query} &raquo;.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {searchResults.map((s) => (
                  <li key={`${s.source}-${s.id}`} className="flex items-center justify-between px-4 py-3">
                    {s.source === "mine" ? (
                      <Link
                        href={`/dashboard/seances/${s.id}`}
                        className="flex flex-1 items-center justify-between gap-3 hover:bg-slate-50"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-slate-900">{s.name}</p>
                            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                              Personnalisée
                            </span>
                          </div>
                          <p className="text-sm text-slate-500">
                            {s.conditionName ?? "—"}
                            {s.stageLabel && <span> · {s.stageLabel}</span>}
                            {s.extra && <span className="text-slate-400"> · {s.extra}</span>}
                          </p>
                        </div>
                        <span className="shrink-0 text-slate-400">→</span>
                      </Link>
                    ) : (
                      <>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-slate-900">{s.conditionName ?? s.name}</p>
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                              Plateforme
                            </span>
                          </div>
                          <p className="text-sm text-slate-500">{s.stageLabel ?? s.name}</p>
                        </div>
                        <form action={duplicateSeance}>
                          <input type="hidden" name="template_id" value={s.id} />
                          <button
                            type="submit"
                            className="rounded-md border border-blue-600 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-50"
                          >
                            Dupliquer
                          </button>
                        </form>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
