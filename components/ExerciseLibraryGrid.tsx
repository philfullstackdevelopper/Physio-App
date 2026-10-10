"use client";

// =============================================================================
// ExerciseLibraryGrid — browse the whole exercise library (yours + platform)
// by body part. A compact row of category chips (all visible — Philippe,
// 2026-10-02: the page must show exercises without scrolling) filters a
// 2-to-4-per-row card grid. Each card shows
// an honest image placeholder (ExerciseIllustration) until real illustrations
// exist, plus the existing video-upload control.
// =============================================================================

import { useMemo, useState } from "react";
import { MoreVertical, EyeOff, Eye, Search } from "lucide-react";
import ExerciseIllustration from "@/components/ExerciseIllustration";
import BodyPartIllustration from "@/components/BodyPartIllustration";
import ExerciseVideoUpload from "@/components/ExerciseVideoUpload";
import SubmitButton from "@/components/SubmitButton";

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
        className="rounded p-1 text-muted hover:bg-app-bg hover:text-ink"
      >
        <MoreVertical className="h-4 w-4" strokeWidth={2} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-20 mt-1 w-44 rounded-lg border border-line bg-surface py-1 shadow-sm max-sm:z-[45]">
            {hidden ? (
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onUnhide();
                }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-ink hover:bg-app-bg"
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
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-ink hover:bg-app-bg"
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
  isAdmin = false,
  createExercise,
  hideExercise,
  unhideExercise,
}: {
  bodyParts: BodyPart[];
  exercises: LibraryExercise[];
  currentUserId: string;
  isAdmin?: boolean;
  createExercise: (formData: FormData) => void | Promise<void>;
  hideExercise: (formData: FormData) => void | Promise<void>;
  unhideExercise: (formData: FormData) => void | Promise<void>;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(bodyParts[0]?.id ?? null);
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
    <div className="mt-4 flex min-h-0 flex-1 flex-col max-sm:mt-3">
      {/* Recherche + création sur une seule ligne, puis les catégories en
          pastilles compactes : les exercices apparaissent dès l'arrivée sur
          la page (Philippe, 2026-10-02). */}
      <div className="flex flex-wrap items-center gap-3 max-sm:flex-nowrap max-sm:gap-2">
        <div className="relative min-w-[14rem] flex-1 max-sm:min-w-0">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
            strokeWidth={1.5}
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Rechercher parmi ${exercises.length - hiddenCount} exercices…`}
            className="w-full rounded-lg border border-line bg-surface py-2 pl-9 pr-3 text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-soft max-sm:h-10 max-sm:rounded-xl max-sm:border-0 max-sm:shadow-soft"
          />
        </div>
        {selectedId && (
          <button
            type="button"
            onClick={() => setShowCreateForm((v) => !v)}
            aria-label="Ajouter un exercice"
            className="shrink-0 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-dark active:scale-95 max-sm:h-10 max-sm:rounded-xl max-sm:px-3.5"
          >
            +<span className="max-sm:hidden"> Ajouter un exercice</span>
          </button>
        )}
      </div>

      {!query.trim() && (
        // Téléphone : les catégories sur une seule ligne qui glisse au doigt,
        // au lieu de 3-4 lignes de pastilles avant le premier exercice.
        <div className="mt-3 flex flex-wrap gap-1.5 max-sm:-mx-4 max-sm:flex-nowrap max-sm:overflow-x-auto max-sm:px-4 max-sm:py-0.5 max-sm:[scrollbar-width:none]">
          {bodyParts.map((bp) => {
            const active = bp.id === selectedId;
            const count = countByBodyPart.get(bp.id) ?? 0;
            return (
              <button
                key={bp.id}
                type="button"
                onClick={() => selectBodyPart(bp.id)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors duration-150 max-sm:shrink-0 max-sm:whitespace-nowrap ${
                  active ? "border-brand bg-brand-soft text-brand" : "border-line bg-surface text-ink hover:bg-app-bg max-sm:border-transparent max-sm:shadow-soft"
                }`}
              >
                <BodyPartIllustration slug={bp.slug} className="h-5 w-5" active={active} />
                {bp.label}
                <span className={active ? "text-brand/70" : "text-muted"}>{count}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Seule cette zone défile : recherche et catégories restent en place,
          la page ne dépasse jamais l'écran (audit 2026-10-10). */}
      <div className="mt-3 min-h-0 flex-1 overflow-y-auto overscroll-contain max-sm:-mx-1 max-sm:px-1 max-sm:pb-1 sm:-mr-2 sm:pr-2">
      {selectedId && showCreateForm && (
        <form
          key={selectedId}
          action={createExercise}
          className="mb-4 rounded-xl border border-line bg-surface p-5"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-ink">
              Nouvel exercice — {bodyParts.find((bp) => bp.id === selectedId)?.label}
            </h3>
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="text-sm text-muted hover:text-ink"
            >
              Annuler
            </button>
          </div>
          <div className="mt-3 flex flex-col gap-3">
            <input
              name="name"
              required
              placeholder="Nom de l'exercice"
              className="w-full rounded-lg border border-line px-3 py-2 text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-soft"
            />
            <textarea
              name="instructions"
              placeholder="Instructions (optionnel)"
              rows={2}
              className="w-full rounded-lg border border-line px-3 py-2 text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-soft"
            />
          </div>

          <p className="mt-4 text-xs font-medium text-muted">Zones du corps concernées</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {bodyParts.map((bp) => (
              <label
                key={bp.id}
                className="flex cursor-pointer items-center gap-1.5 rounded-full border border-line px-3 py-1 text-sm text-ink transition-colors duration-150 has-[:checked]:border-brand has-[:checked]:bg-brand-soft has-[:checked]:text-brand"
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
            className="mt-4 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-dark active:scale-95"
          >
            Créer
          </SubmitButton>
        </form>
      )}

      {/* Téléphone : une ligne compacte par exercice (dessin à gauche, nom
          et consignes au milieu, menu à droite), comme Mes séances. */}
      <div className="grid grid-cols-1 gap-3 max-sm:gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.length === 0 ? (
          <p className="col-span-full rounded-xl border border-line bg-surface p-6 text-center text-sm text-muted">
            {query.trim()
              ? `Aucun exercice ne correspond à « ${query.trim()} ».`
              : "Aucun exercice dans cette catégorie pour le moment."}
          </p>
        ) : (
          filtered.map((ex) => (
            <div
              key={ex.id}
              className="rounded-xl border border-line bg-surface p-4 max-sm:grid max-sm:grid-cols-[3.5rem_minmax(0,1fr)_auto] max-sm:items-center max-sm:gap-x-3 max-sm:rounded-2xl max-sm:border-0 max-sm:p-3 max-sm:shadow-soft"
            >
              <div className="flex items-start justify-between gap-2 max-sm:contents">
                <ExerciseIllustration
                  name={ex.name}
                  className="h-24 w-full text-brand max-sm:col-start-1 max-sm:row-start-1 max-sm:h-14 max-sm:w-14 max-sm:rounded-xl max-sm:bg-app-bg max-sm:p-1"
                />
                <span className="max-sm:col-start-3 max-sm:row-start-1 sm:contents">
                  <ExerciseCardMenu
                    hidden={ex.hidden}
                    onHide={() => runAction(hideExercise, ex.id)}
                    onUnhide={() => runAction(unhideExercise, ex.id)}
                  />
                </span>
              </div>
              <div className="max-sm:col-start-2 max-sm:row-start-1 max-sm:min-w-0 sm:contents">
                <p className="mt-2 font-medium text-ink max-sm:mt-0 max-sm:truncate">{ex.name}</p>
                {ex.created_by === currentUserId && (
                  <span className="mt-1 inline-block text-xs text-brand max-sm:mt-0">Votre exercice</span>
                )}
                {ex.instructions && (
                  <p className="mt-1 line-clamp-2 text-sm text-muted max-sm:mt-0.5 max-sm:line-clamp-1 max-sm:text-xs">{ex.instructions}</p>
                )}
              </div>
              {/* (Philippe, 2026-10-07 : l'envoi de vidéo n'apparaît plus que
                  sur les exercices du kiné connecté — les exercices plateforme
                  et ceux des autres kinés sont en lecture seule, CLAUDE.md §3.
                  Exception : l'administrateur gère les vidéos des exercices
                  plateforme, via une Server Action vérifiée côté serveur.) */}
              {(ex.created_by === currentUserId || (isAdmin && ex.created_by === null)) && (
                <div className="max-sm:col-span-3 sm:contents">
                  <ExerciseVideoUpload
                    exerciseId={ex.id}
                    initialUrl={ex.media_url}
                    initialStartSeconds={ex.media_start_seconds}
                    viaAdmin={ex.created_by === null}
                  />
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {hiddenCount > 0 && (
        <div className="mt-6 border-t border-line pt-4">
          <button
            type="button"
            onClick={() => setShowHidden((v) => !v)}
            className="text-sm font-medium text-muted hover:text-ink hover:underline"
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
                    className="flex items-center justify-between gap-2 rounded-lg border border-line bg-app-bg px-3 py-2"
                  >
                    <span className="text-sm text-muted">{ex.name}</span>
                    <button
                      type="button"
                      onClick={() => runAction(unhideExercise, ex.id)}
                      className="shrink-0 text-xs font-medium text-brand hover:underline"
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
    </div>
  );
}
