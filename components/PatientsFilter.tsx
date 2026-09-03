"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, UserPlus } from "lucide-react";

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
          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100 sm:flex-1"
        />
        <select
          value={conditionFilter}
          onChange={(e) => setConditionFilter(e.target.value)}
          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100 sm:w-48"
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
          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100 sm:w-40"
        >
          <option value="">Toutes phases</option>
          {stages.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-3 rounded-xl border border-stone-200 bg-white p-2 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-8px_rgba(120,53,15,0.16)]">
        {patients.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-stone-100">
              <UserPlus className="h-6 w-6 text-stone-500" strokeWidth={1.5} />
            </span>
            <div>
              <p className="font-medium text-stone-900">Aucun patient pour le moment</p>
              <p className="mt-1 text-sm text-stone-500">
                Ajoutez votre premier patient pour lui assigner une condition et un programme
                d&rsquo;exercices.
              </p>
            </div>
            <Link
              href="/dashboard/patients/new"
              className="mt-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-blue-700"
            >
              Ajouter un patient
            </Link>
          </div>
        ) : filtered.length === 0 ? (
          <p className="p-6 text-center text-sm text-stone-500">
            {hasActiveFilters
              ? "Aucun patient ne correspond à ces critères."
              : "Aucun patient pour le moment."}
          </p>
        ) : (
          <ul className="divide-y divide-stone-100">
            {filtered.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/dashboard/patients/${p.id}`}
                  className="group flex items-center justify-between gap-3 rounded-lg px-4 py-3 transition-colors duration-150 hover:bg-stone-50"
                >
                  <div>
                    <p className="font-medium text-stone-800">{p.name}</p>
                    <p className="text-sm text-stone-500">
                      {p.conditionName ?? "Condition non assignée"}
                      {p.stageLabel && <span className="text-stone-400"> · {p.stageLabel}</span>}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-stone-400 transition-transform duration-150 group-hover:translate-x-0.5" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
