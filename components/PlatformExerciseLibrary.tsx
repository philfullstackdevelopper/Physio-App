"use client";

// =============================================================================
// PlatformExerciseLibrary — the shared starter-set exercises (created_by is
// null), searchable, each with a video upload control. Separate from "Mes
// exercices" above: these aren't owned by the instructor, so only their
// demo video can be attached here (via set_exercise_media, migration 0022) —
// never their name or instructions.
// =============================================================================

import { useMemo, useState } from "react";
import ExerciseVideoUpload from "@/components/ExerciseVideoUpload";

export interface PlatformExercise {
  id: string;
  name: string;
  media_url: string | null;
  media_start_seconds: number;
}

export default function PlatformExerciseLibrary({ exercises }: { exercises: PlatformExercise[] }) {
  const [query, setQuery] = useState("");

  const withVideo = exercises.filter((e) => e.media_url).length;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return exercises;
    return exercises.filter((e) => e.name.toLowerCase().includes(q));
  }, [exercises, query]);

  return (
    <div className="mt-8">
      <h2 className="text-lg font-medium text-slate-900">Bibliothèque partagée</h2>
      <p className="mt-1 text-sm text-slate-500">
        Ajoutez une vidéo de démonstration à ces exercices — visibles par tous les patients.
        {" "}
        <span className="font-medium text-slate-700">
          {withVideo}/{exercises.length}
        </span>{" "}
        ont déjà une vidéo.
      </p>

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Rechercher un exercice…"
        className="mt-3 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-blue-600 focus:outline-none"
      />

      <div className="mt-4 max-h-[32rem] space-y-3 overflow-y-auto pr-1">
        {filtered.length === 0 ? (
          <p className="rounded-xl bg-white p-6 text-center text-sm text-slate-500 shadow-sm">
            Aucun exercice ne correspond à « {query} ».
          </p>
        ) : (
          filtered.map((ex) => (
            <div key={ex.id} className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
              <p className="font-medium text-slate-900">{ex.name}</p>
              <ExerciseVideoUpload
                exerciseId={ex.id}
                initialUrl={ex.media_url}
                initialStartSeconds={ex.media_start_seconds}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
