"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

type Patient = {
  id: string;
  name: string;
  conditionId: string | null;
  conditionName?: string;
  stage?: string;
  stageLabel?: string;
};

export default function PatientsFilter({
  patients,
  conditions,
  stages,
}: {
  patients: Patient[];
  conditions: { id: string; name: string }[];
  stages: { value: string; label: string }[];
}) {
  const [query, setQuery] = useState("");
  const [conditionFilter, setConditionFilter] = useState("");
  const [stageFilter, setStageFilter] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return patients.filter((p) => {
      if (q && !p.name.toLowerCase().includes(q)) return false;
      if (conditionFilter && p.conditionId !== conditionFilter) return false;
      if (stageFilter && p.stage !== stageFilter) return false;
      return true;
    });
  }, [patients, query, conditionFilter, stageFilter]);

  const hasActiveFilters = query || conditionFilter || stageFilter;

  return (
    <div>
      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher un patient…"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none sm:flex-1"
        />
        <select
          value={conditionFilter}
          onChange={(e) => setConditionFilter(e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none sm:w-48"
        >
          <option value="">Toutes conditions</option>
          {conditions.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-teal-600 focus:outline-none sm:w-40"
        >
          <option value="">Toutes phases</option>
          {stages.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-3 rounded-xl bg-white p-2 shadow-sm">
        {patients.length === 0 ? (
          <p className="p-6 text-center text-sm text-slate-500">
            Aucun patient pour le moment. Cliquez sur « Ajouter » pour commencer.
          </p>
        ) : filtered.length === 0 ? (
          <p className="p-6 text-center text-sm text-slate-500">
            {hasActiveFilters
              ? "Aucun patient ne correspond à ces critères."
              : "Aucun patient pour le moment."}
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {filtered.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/dashboard/patients/${p.id}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-slate-50"
                >
                  <div>
                    <p className="font-medium text-slate-900">{p.name}</p>
                    <p className="text-sm text-slate-500">
                      {p.conditionName ?? "Condition non assignée"}
                      {p.stageLabel && <span className="text-slate-400"> · {p.stageLabel}</span>}
                    </p>
                  </div>
                  <span className="text-slate-400">→</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
