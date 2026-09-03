"use client";

// =============================================================================
// ExerciseLibraryGrid — browse the whole exercise library (yours + platform)
// by body part. A top row of category tiles (capped, with "voir plus") opens
// a filtered 3-per-row card grid for the selected category. Each card shows
// an honest image placeholder (ExerciseIllustration) until real illustrations
// exist, plus the existing video-upload control.
// =============================================================================

import { useMemo, useState } from "react";
import { MoreVertical, EyeOff, Eye, Search } from "lucide-react";
import ExerciseIllustration from "@/components/ExerciseIllustration";
import BodyPartIllustration from "@/components/BodyPartIllustration";
import ExerciseVideoUpload from "@/components/ExerciseVideoUpload";
import SubmitButton from "@/components/SubmitButton";

const TILES_COLLAPSED_COUNT = 6;

export interface BodyPart {
  id: string;
  slug: string;
  label: string;
  position: number;
}

export interface LibraryExercise {
  id: string;
  name: string;
  instructions: string | null;
  media_url: string | null;
  media_start_seconds: number;
  created_by: string | null;
  bodyPartIds: string[];
  /** Old French names this exercise was renamed or merged away from
   *  (migration 0042/0043) — a kiné who still types "Pont fessier" should
   *  find "Glute Bridge". Searched, never displayed. */
  search_keywords: string[];
  /** Hidden by the CURRENT instructor from their own search — a personal
   *  filter, not a deletion (see migration 0037). */
  hidden: boolean;
}

/** Three-dot menu on an exercise card — hide/unhide, the only action for now. */
function ExerciseCardMenu({
  hidden,
  onHide,
  onUnhide,
}: {
  hidden: boolean;
  onHide: () => void;
  onUnhide: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Options"
        className="rounded p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
      >
        <MoreVertical className="h-4 w-4" strokeWidth={2} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-20 mt-1 w-44 rounded-lg border border-stone-200 bg-white py-1 shadow-lg">
            {hidden ? (
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onUnhide();
                }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-stone-700 hover:bg-stone-50"
              >
                <Eye className="h-3.5 w-3.5" strokeWidth={2} />
                Réafficher
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onHide();
                }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-stone-700 hover:bg-stone-50"
              >
                <EyeOff className="h-3.5 w-3.5" strokeWidth={2} />
                Masquer cet exercice
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default function ExerciseLibraryGrid({
  bodyParts,
  exercises,
  currentUserId,
  createExercise,
  hideExercise,
  unhideExercise,
}: {
  bodyParts: BodyPart[];
  exercises: LibraryExercise[];
  currentUserId: string;
  createExercise: (formData: FormData) => void | Promise<void>;
  hideExercise: (formData: FormData) => void | Promise<void>;
  unhideExercise: (formData: FormData) => void | Promise<void>;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(bodyParts[0]?.id ?? null);
  const [showAllTiles, setShowAllTiles] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showHidden, setShowHidden] = useState(false);
  const [query, setQuery] = useState("");

  const runAction = (action: (formData: FormData) => void | Promise<void>, exerciseId: string) => {
    const fd = new FormData();
    fd.set("exercise_id", exerciseId);
    action(fd);
  };

  const hiddenCount = useMemo(() => exercises.filter((ex) => ex.hidden).length, [exercises]);

  function selectBodyPart(id: string) {
    setSelectedId(id);
    setShowCreateForm(false);
    setQuery("");
  }

  const countByBodyPart = useMemo(() => {
    const counts = new Map<string, number>();
    for (const ex of exercises) {
      if (ex.hidden) continue;
      for (const bpId of ex.bodyPartIds) {
        counts.set(bpId, (counts.get(bpId) ?? 0) + 1);
      }
    }
    return counts;
  }, [exercises]);

  const visibleTiles = showAllTiles ? bodyParts : bodyParts.slice(0, TILES_COLLAPSED_COUNT);

  // A non-empty search searches the whole library regardless of the selected
  // body-part tile — narrowing to a single category first would defeat the
  // point of a search bar. Clearing it falls back to the category filter.
  //
  // Matches name, the old French names an exercise was renamed/merged from
  // (search_keywords — see migration 0043), and instructions text — the
  // whole library is English-named now, but instructions stay French, so a
  // kiné typing a French term like "pont" or "mollet" still finds the
  // matching exercise even with no keyword recorded for it.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q) {
      return exercises.filter(
        (ex) =>
          !ex.hidden &&
          (ex.name.toLowerCase().includes(q) ||
            ex.instructions?.toLowerCase().includes(q) ||
            ex.search_keywords.some((k) => k.toLowerCase().includes(q))),
      );
    }
    return selectedId
      ? exercises.filter((ex) => ex.bodyPartIds.includes(selectedId) && !ex.hidden)
      : [];
  }, [exercises, selectedId, query]);

  return (
    <div className="mt-8">
      <h2 className="font-display text-lg font-semibold text-stone-900">Bibliothèque d&apos;exercices</h2>
      <p className="mt-1 text-sm text-stone-500">
        {exercises.length - hiddenCount} exercices, classés par zone du corps.
      </p>

      <div className="relative mt-4">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400"
          strokeWidth={1.5}
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher un exercice…"
          className="w-full rounded-lg border border-stone-300 py-2 pl-9 pr-3 text-stone-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {visibleTiles.map((bp) => {
          const active = bp.id === selectedId;
          return (
            <button
              key={bp.id}
              type="button"
              onClick={() => selectBodyPart(bp.id)}
              className={`flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition-colors duration-150 ${
                active
                  ? "border-blue-600 bg-blue-50"
                  : "border-stone-200 bg-white hover:bg-stone-50"
              }`}
            >
              <BodyPartIllustration slug={bp.slug} className="h-8 w-8" active={active} />
              <span className="text-sm font-medium text-stone-900">{bp.label}</span>
              <span className="text-xs text-stone-400">{countByBodyPart.get(bp.id) ?? 0} exercices</span>
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex flex-col items-start gap-3">
        {bodyParts.length > TILES_COLLAPSED_COUNT && (
          <button
            type="button"
            onClick={() => setShowAllTiles((v) => !v)}
            className="text-sm font-medium text-blue-700 hover:underline"
          >
            {showAllTiles ? "Voir moins" : "Voir plus"}
          </button>
        )}

        {selectedId && (
          <button
            type="button"
            onClick={() => setShowCreateForm((v) => !v)}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 active:scale-95"
          >
            + Ajouter un nouvel exercice
          </button>
        )}
      </div>

      {selectedId && showCreateForm && (
        <form
          key={selectedId}
          action={createExercise}
          className="mt-3 rounded-xl border border-stone-200 bg-white p-5"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-stone-900">
              Nouvel exercice — {bodyParts.find((bp) => bp.id === selectedId)?.label}
            </h3>
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="text-sm text-stone-400 hover:text-stone-600"
            >
              Annuler
            </button>
          </div>
          <div className="mt-3 flex flex-col gap-3">
            <input
              name="name"
              required
              placeholder="Nom de l'exercice"
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
            <textarea
              name="instructions"
              placeholder="Instructions (optionnel)"
              rows={2}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <p className="mt-4 text-xs font-medium text-stone-500">Zones du corps concernées</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {bodyParts.map((bp) => (
              <label
                key={bp.id}
                className="flex cursor-pointer items-center gap-1.5 rounded-full border border-stone-300 px-3 py-1 text-sm text-stone-700 transition-colors duration-150 has-[:checked]:border-blue-600 has-[:checked]:bg-blue-50 has-[:checked]:text-blue-700"
              >
                <input
                  type="checkbox"
                  name="body_part_ids"
                  value={bp.id}
                  defaultChecked={bp.id === selectedId}
                  className="hidden"
                />
                {bp.label}
              </label>
            ))}
          </div>

          <SubmitButton
            pendingText="Création…"
            className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 active:scale-95"
          >
            Créer
          </SubmitButton>
        </form>
      )}

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {filtered.length === 0 ? (
          <p className="col-span-full rounded-xl border border-stone-200 bg-white p-6 text-center text-sm text-stone-500">
            {query.trim()
              ? `Aucun exercice ne correspond à « ${query.trim()} ».`
              : "Aucun exercice dans cette catégorie pour le moment."}
          </p>
        ) : (
          filtered.map((ex) => (
            <div key={ex.id} className="rounded-xl border border-stone-200 bg-white p-4">
              <div className="flex items-start justify-between gap-2">
                <ExerciseIllustration name={ex.name} className="h-28 w-full text-blue-600" />
                <ExerciseCardMenu
                  hidden={ex.hidden}
                  onHide={() => runAction(hideExercise, ex.id)}
                  onUnhide={() => runAction(unhideExercise, ex.id)}
                />
              </div>
              <p className="mt-3 font-medium text-stone-900">{ex.name}</p>
              {ex.created_by === currentUserId && (
                <span className="mt-1 inline-block text-xs text-stone-400">Votre exercice</span>
              )}
              {ex.instructions && (
                <p className="mt-1 line-clamp-2 text-sm text-stone-500">{ex.instructions}</p>
              )}
              <ExerciseVideoUpload
                exerciseId={ex.id}
                initialUrl={ex.media_url}
                initialStartSeconds={ex.media_start_seconds}
              />
            </div>
          ))
        )}
      </div>

      {hiddenCount > 0 && (
        <div className="mt-6 border-t border-stone-200 pt-4">
          <button
            type="button"
            onClick={() => setShowHidden((v) => !v)}
            className="text-sm font-medium text-stone-500 hover:text-stone-700 hover:underline"
          >
            {showHidden ? "Masquer la liste" : `${hiddenCount} exercice${hiddenCount > 1 ? "s" : ""} masqué${hiddenCount > 1 ? "s" : ""} — afficher`}
          </button>
          {showHidden && (
            <ul className="mt-3 space-y-1.5">
              {exercises
                .filter((ex) => ex.hidden)
                .map((ex) => (
                  <li
                    key={ex.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2"
                  >
                    <span className="text-sm text-stone-600">{ex.name}</span>
                    <button
                      type="button"
                      onClick={() => runAction(unhideExercise, ex.id)}
                      className="shrink-0 text-xs font-medium text-blue-700 hover:underline"
                    >
                      Réafficher
                    </button>
                  </li>
                ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
