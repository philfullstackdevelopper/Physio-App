"use client";

import { useMemo, useState } from "react";
import { Check, Plus, Search } from "lucide-react";
import { type BodyPart } from "@/lib/exercise/category";
import ExerciseIllustration from "@/components/ExerciseIllustration";
import BodyPartIllustration from "@/components/BodyPartIllustration";

export type PickerExercise = { id: string; name: string; bodyPartIds: string[]; searchKeywords?: string[] | null };

// La colonne de droite « Ajouter un exercice », partagée par les deux fenêtres
// qui composent une séance : « Ajuster la séance » d'un patient
// (AdjustWorkoutModal) et « Nouvelle séance » (NewSeanceModal) — Philippe,
// 2026-10-02 : même format aux deux endroits.
//
// Recherche (nom + mots-clés français) OU catégorie : une recherche non vide
// cherche dans TOUTE la bibliothèque, sans tenir compte de la catégorie.
// Catégories : une case par zone, toutes sur une ligne et de même largeur,
// icône au-dessus du libellé, nombre d'exercices au survol ; sur téléphone la
// ligne défile. L'état (recherche, catégorie) est local : il repart de zéro à
// chaque ouverture de la fenêtre, qui remonte ce composant.
export default function ExerciseLibraryPicker({
  exercises,
  bodyParts,
  selectedIds,
  onToggle,
}: {
  exercises: PickerExercise[];
  bodyParts: BodyPart[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
}) {
  const countByBodyPart = useMemo(() => {
    const counts = new Map<string, number>();
    for (const ex of exercises) for (const bpId of ex.bodyPartIds) counts.set(bpId, (counts.get(bpId) ?? 0) + 1);
    return counts;
  }, [exercises]);

  const [q, setQ] = useState("");
  const [bodyPartId, setBodyPartId] = useState<string | null>(
    () => bodyParts.find((bp) => (countByBodyPart.get(bp.id) ?? 0) > 0)?.id ?? bodyParts[0]?.id ?? null,
  );
  const query = q.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (query) {
      return exercises.filter(
        (ex) => ex.name.toLowerCase().includes(query) || (ex.searchKeywords ?? []).some((k) => k.toLowerCase().includes(query)),
      );
    }
    return bodyPartId ? exercises.filter((ex) => ex.bodyPartIds.includes(bodyPartId)) : [];
  }, [exercises, bodyPartId, query]);

  return (
    <section className="flex min-h-0 flex-col">
      {/* Titre et recherche sur la même ligne, cases de catégories plus
          basses : la liste d'exercices récupère la hauteur (Philippe,
          2026-10-02 : « encore plus de place pour choisir »). */}
      <div className="flex items-center gap-3">
        <p className="shrink-0 text-xs font-semibold uppercase tracking-wide text-muted">Ajouter un exercice</p>
        <label className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" strokeWidth={1.75} />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher un exercice…"
            className="w-full rounded-lg border border-line bg-surface py-1.5 pl-9 pr-3 text-sm text-ink placeholder:text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-soft"
          />
        </label>
      </div>
      {!query && (
        <div
          style={{ gridTemplateColumns: `repeat(${bodyParts.length}, minmax(0, 1fr))` }}
          className="mt-2 flex gap-1 overflow-x-auto md:grid md:overflow-visible"
        >
          {bodyParts.map((bp) => {
            const active = bp.id === bodyPartId;
            const count = countByBodyPart.get(bp.id) ?? 0;
            return (
              <button
                key={bp.id}
                type="button"
                title={`${bp.label} — ${count} exercice${count > 1 ? "s" : ""}`}
                onClick={() => setBodyPartId(bp.id)}
                disabled={count === 0}
                className={`flex w-20 shrink-0 flex-col items-center rounded-xl border px-1 py-0.5 text-center text-[10px] font-medium leading-tight transition-colors disabled:cursor-not-allowed disabled:opacity-40 md:w-auto md:min-w-0 ${
                  active ? "border-brand bg-brand-soft text-brand" : "border-line bg-surface text-ink hover:bg-app-bg"
                }`}
              >
                <BodyPartIllustration slug={bp.slug} className="h-6 w-6 shrink-0" active={active} />
                <span className="line-clamp-2">{bp.label}</span>
              </button>
            );
          })}
        </div>
      )}
      <div className="mt-2 max-h-80 overflow-y-auto pr-1 md:min-h-0 md:max-h-none md:flex-1">
        {filtered.length === 0 && (
          <p className="text-sm text-muted">
            {query ? `Aucun exercice ne correspond à « ${q.trim()} ».` : "Aucun exercice dans cette catégorie."}
          </p>
        )}
        {/* Lignes compactes, sur 2 colonnes en grand écran. */}
        <div className="grid content-start gap-1.5 lg:grid-cols-2">
          {filtered.map((ex) => {
            const marked = selectedIds.has(ex.id);
            return (
              <button
                key={ex.id}
                type="button"
                onClick={() => onToggle(ex.id)}
                title={ex.name}
                className={`flex w-full items-center gap-2 rounded-lg border px-2 py-1 text-left text-sm transition-colors ${
                  marked ? "border-ok/30 bg-ok-soft text-ok" : "border-line bg-surface text-ink hover:border-brand/40 hover:bg-app-bg"
                }`}
              >
                <ExerciseIllustration name={ex.name} animate={false} className={`h-7 w-7 shrink-0 ${marked ? "text-ok" : "text-brand"}`} />
                <span className="flex-1 truncate">{ex.name}</span>
                {marked ? <Check className="h-4 w-4 shrink-0" strokeWidth={2} /> : <Plus className="h-4 w-4 shrink-0 text-brand" strokeWidth={2} />}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
