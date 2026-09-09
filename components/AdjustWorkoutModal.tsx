"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Check, ChevronLeft, Dumbbell, Plus, Search, X } from "lucide-react";
import { type BodyPart } from "@/lib/exercise/category";
import SubmitButton from "@/components/SubmitButton";
import ExerciseIllustration from "@/components/ExerciseIllustration";
import BodyPartIllustration from "@/components/BodyPartIllustration";

export type ModalExercise = { id: string; name: string };
export type AddableExercise = ModalExercise & { bodyPartIds: string[] };

export type AddableWorkout = {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number | null;
  timesPerWeek: number | null;
  stageLabel: string | null;
  /** Séances span every condition now, not just the patient's assigned one —
   *  shown as a group header so a long list stays scannable. */
  conditionName: string | null;
  /** Link to the séance editor — only set for séances this instructor owns
   *  (platform séances stay read-only, same rule as everywhere else). */
  editHref: string | null;
  exerciseNames: string[];
  /** Every body part any of this séance's exercises is tagged with (union,
   *  not deduped to one) — lets the picker filter by area without forcing a
   *  multi-area séance into a single category. */
  bodyPartIds: string[];
};

// The single place a kiné manages a patient's séance: assign one if none is
// set yet, adjust its exercises, or replace it with a different one — all
// from the same button, instead of a separate "Ajuster" button up top and a
// separate queue/reorder list further down the page (a patient has at most
// one recommended séance at a time now, see actions.ts).
export default function AdjustWorkoutModal({
  patientId,
  patientFirstName,
  workout,
  recId,
  addableExercises,
  bodyParts,
  addableWorkouts,
  adjustAction,
  assignAction,
  removeAction,
  weekStartDate,
  weekLabel,
}: {
  patientId: string;
  patientFirstName: string;
  workout: { id: string; name: string; exercises: ModalExercise[] } | null;
  /** `patient_recommended_workouts.id` for the current workout, if any — needed
   *  to unassign it and (adjust) to repoint exactly that row at the copy. */
  recId: string | null;
  /** Monday ("YYYY-MM-DD") of the week the kiné is assigning FROM — the
   *  selected week in the frise (KineWeekProgramme). Omitted = this week. */
  weekStartDate?: string;
  /** Human label of that week ("Semaine 4 · 21 sept. – 27 sept."), shown in
   *  the header so the kiné knows which period they're changing. */
  weekLabel?: string;
  addableExercises: AddableExercise[];
  bodyParts: BodyPart[];
  addableWorkouts: AddableWorkout[];
  adjustAction: (formData: FormData) => Promise<void>;
  assignAction: (formData: FormData) => void;
  removeAction: (formData: FormData) => void;
}) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"exercises" | "template">(workout ? "exercises" : "template");
  const [removeIds, setRemoveIds] = useState<Set<string>>(new Set());
  const [addIds, setAddIds] = useState<Set<string>>(new Set());
  const [q, setQ] = useState("");
  const [qTemplate, setQTemplate] = useState("");
  const firstBodyPartId = bodyParts[0]?.id ?? null;
  // Which body-part tile is selected in each picker — "Ajouter un exercice"
  // (exercises view) and "Choisir/Changer de séance" (template view) filter
  // independently, same click-a-category-first pattern as the exercise
  // library (components/ExerciseLibraryGrid.tsx): a category is pre-selected
  // on open, and typing in that picker's search box overrides it.
  const [exerciseBodyPartId, setExerciseBodyPartId] = useState<string | null>(firstBodyPartId);
  const [templateBodyPartId, setTemplateBodyPartId] = useState<string | null>(firstBodyPartId);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const openModal = () => {
    setView(workout ? "exercises" : "template");
    setExerciseBodyPartId(firstBodyPartId);
    setTemplateBodyPartId(firstBodyPartId);
    setOpen(true);
  };

  const close = () => {
    setOpen(false);
    setRemoveIds(new Set());
    setAddIds(new Set());
    setQ("");
    setQTemplate("");
    triggerRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        close();
        return;
      }
      if (e.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const focusable = Array.from(
        panel.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'),
      ).filter((el) => !el.hasAttribute("disabled"));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const activeEl = document.activeElement;
      if (e.shiftKey) {
        if (activeEl === first || !panel.contains(activeEl)) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (activeEl === last || !panel.contains(activeEl)) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Verrouille le scroll de la page derrière la modale (Philippe, 2026-09-09 :
  // « empêcher de scroller derrière »). On restaure la valeur précédente à la
  // fermeture plutôt que de la vider, au cas où une autre couche l'aurait
  // déjà posée.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  const query = q.trim().toLowerCase();

  // A non-empty search looks across every addable exercise regardless of the
  // selected tile — narrowing to one category first would defeat the point
  // of a search box. Clearing it falls back to the tile filter. Same rule as
  // ExerciseLibraryGrid's own library search.
  const filteredExercises = useMemo(() => {
    if (query) return addableExercises.filter((ex) => ex.name.toLowerCase().includes(query));
    return exerciseBodyPartId ? addableExercises.filter((ex) => ex.bodyPartIds.includes(exerciseBodyPartId)) : [];
  }, [addableExercises, exerciseBodyPartId, query]);

  const exerciseCountByBodyPart = useMemo(() => {
    const counts = new Map<string, number>();
    for (const ex of addableExercises) for (const bpId of ex.bodyPartIds) counts.set(bpId, (counts.get(bpId) ?? 0) + 1);
    return counts;
  }, [addableExercises]);

  const templateQuery = qTemplate.trim().toLowerCase();
  const filteredWorkouts = useMemo(() => {
    if (templateQuery) {
      return addableWorkouts.filter(
        (w) => w.name.toLowerCase().includes(templateQuery) || w.exerciseNames.some((n) => n.toLowerCase().includes(templateQuery)),
      );
    }
    // The category tiles only render once there's enough séances to be worth
    // filtering (same threshold as the search box above them) — below that,
    // templateBodyPartId is still set to a default but there's no tile UI to
    // change it, so it must not silently hide séances.
    if (addableWorkouts.length <= 3) return addableWorkouts;
    return templateBodyPartId ? addableWorkouts.filter((w) => w.bodyPartIds.includes(templateBodyPartId)) : addableWorkouts;
  }, [addableWorkouts, templateBodyPartId, templateQuery]);

  const workoutCountByBodyPart = useMemo(() => {
    const counts = new Map<string, number>();
    for (const w of addableWorkouts) for (const bpId of w.bodyPartIds) counts.set(bpId, (counts.get(bpId) ?? 0) + 1);
    return counts;
  }, [addableWorkouts]);

  const toggle = (set: Set<string>, id: string) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  };

  const removed = removeIds.size;
  const added = addIds.size;
  const noChanges = removed === 0 && added === 0;
  const wouldBeEmpty = Boolean(
    workout &&
      workout.exercises.length > 0 &&
      workout.exercises.every((e) => removeIds.has(e.id)) &&
      addIds.size === 0,
  );

  const triggerDisabled = !workout && addableWorkouts.length === 0;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={openModal}
        disabled={triggerDisabled}
        title={triggerDisabled ? "Aucune séance disponible — créez-en une dans Mes séances." : undefined}
        className="inline-flex items-center rounded-full bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
      >
        {workout ? "Ajuster la séance" : "Choisir une séance"}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 p-4" onClick={close}>
          <div
            ref={panelRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label={view === "exercises" && workout ? `Ajuster la séance ${workout.name}` : "Choisir une séance"}
            onClick={(e) => e.stopPropagation()}
            // Plein écran (presque) sur desktop : hauteur fixe à 90vh pour que
            // les colonnes se partagent l'espace et scrollent chacune de leur
            // côté, au lieu d'une modale qui grandit puis fait scroller toute
            // la page (Philippe, 2026-09-09).
            className="flex h-[90vh] w-full max-w-6xl flex-col rounded-2xl bg-surface shadow-sm outline-none"
          >
            <div className="flex items-start justify-between gap-3 border-b border-line px-6 py-4">
              <div className="min-w-0">
                {view === "exercises" && workout ? (
                  <>
                    <h2 className="text-lg font-semibold text-ink">Ajuster la séance</h2>
                    <p className="mt-0.5 text-sm text-muted">
                      {workout.name} — les modifications ne concernent que {patientFirstName}.
                    </p>
                  </>
                ) : (
                  <>
                    <h2 className="text-lg font-semibold text-ink">{workout ? "Changer de séance" : "Choisir une séance"}</h2>
                    <p className="mt-0.5 text-sm text-muted">
                      {weekLabel ? `À partir de la ${weekLabel.charAt(0).toLowerCase()}${weekLabel.slice(1)}` : "À partir de cette semaine"}
                      {workout ? ` — remplace la séance actuelle de ${patientFirstName}.` : "."}
                    </p>
                  </>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {view === "exercises" && workout && addableWorkouts.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setView("template")}
                    className="rounded-full border border-line px-3 py-1.5 text-xs font-medium text-ink hover:bg-app-bg"
                  >
                    Changer de séance
                  </button>
                )}
                {view === "template" && workout && (
                  <button
                    type="button"
                    onClick={() => setView("exercises")}
                    className="inline-flex items-center gap-1 rounded-full border border-line px-3 py-1.5 text-xs font-medium text-ink hover:bg-app-bg"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2} />
                    Retour
                  </button>
                )}
                <button type="button" onClick={close} aria-label="Fermer" className="rounded-lg p-1.5 text-muted hover:bg-app-bg hover:text-ink">
                  <X className="h-5 w-5" strokeWidth={1.75} />
                </button>
              </div>
            </div>

            {view === "exercises" && workout ? (
              <form action={adjustAction} className="flex min-h-0 flex-1 flex-col">
                <input type="hidden" name="patient_id" value={patientId} />
                <input type="hidden" name="workout_id" value={workout.id} />
                {recId && <input type="hidden" name="rec_id" value={recId} />}
                {[...removeIds].map((id) => <input key={`r-${id}`} type="hidden" name="remove_ids" value={id} />)}
                {[...addIds].map((id) => <input key={`a-${id}`} type="hidden" name="add_ids" value={id} />)}

                {/* Sur desktop chaque colonne scrolle indépendamment (min-h-0 +
                    overflow-y-auto) ; sur mobile la grille entière scrolle. */}
                <div className="grid min-h-0 flex-1 gap-6 overflow-y-auto p-6 md:grid-cols-[2fr_3fr] md:overflow-hidden">
                  <section className="flex min-h-0 flex-col">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">Exercices actuels</p>
                    <ul className="mt-2 space-y-1.5 md:min-h-0 md:flex-1 md:overflow-y-auto md:pr-1">
                      {workout.exercises.map((ex) => {
                        const marked = removeIds.has(ex.id);
                        return (
                          <li key={ex.id}>
                            <button
                              type="button"
                              onClick={() => setRemoveIds((s) => toggle(s, ex.id))}
                              className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                                marked ? "border-danger-soft bg-danger-soft text-danger" : "border-line bg-surface text-ink hover:bg-app-bg"
                              }`}
                            >
                              <ExerciseIllustration name={ex.name} animate={false} className={`h-9 w-9 shrink-0 ${marked ? "text-danger" : "text-brand"}`} />
                              <span className="flex-1 truncate">{ex.name}</span>
                              {marked ? (
                                <span className="flex items-center gap-1 text-xs font-medium">À retirer <X className="h-3.5 w-3.5" strokeWidth={2} /></span>
                              ) : (
                                <Check className="h-4 w-4 text-brand" strokeWidth={2} />
                              )}
                            </button>
                          </li>
                        );
                      })}
                      {workout.exercises.length === 0 && <li className="text-sm text-muted">Cette séance est vide.</li>}
                    </ul>
                  </section>

                  <section className="flex min-h-0 flex-col">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">Ajouter un exercice</p>
                    <label className="relative mt-2">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" strokeWidth={1.75} />
                      <input
                        type="search"
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="Rechercher un exercice…"
                        className="w-full rounded-lg border border-line bg-surface py-2 pl-9 pr-3 text-sm text-ink placeholder:text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-soft"
                      />
                    </label>
                    {!query && (
                      // Tuiles larges (jusqu'à 6 colonnes) : la rangée reste
                      // basse, donc la liste d'exercices en dessous garde de
                      // la hauteur et n'a pas à scroller sauf nécessité.
                      <div className="mt-2 grid grid-cols-3 gap-1.5 sm:grid-cols-4 lg:grid-cols-6">
                        {bodyParts.map((bp) => {
                          const active = bp.id === exerciseBodyPartId;
                          return (
                            <button
                              key={bp.id}
                              type="button"
                              onClick={() => setExerciseBodyPartId(bp.id)}
                              className={`flex flex-col items-center gap-1 rounded-lg border p-2 text-center transition-colors ${
                                active ? "border-brand bg-brand-soft" : "border-line bg-surface hover:bg-app-bg"
                              }`}
                            >
                              <BodyPartIllustration slug={bp.slug} className="h-5 w-5" active={active} />
                              <span className="text-[11px] font-medium leading-tight text-ink">{bp.label}</span>
                              <span className="text-[10px] text-muted">{exerciseCountByBodyPart.get(bp.id) ?? 0}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                    <div className="mt-2 max-h-72 space-y-1 overflow-y-auto pr-1 md:min-h-0 md:max-h-none md:flex-1">
                      {filteredExercises.length === 0 && (
                        <p className="text-sm text-muted">
                          {query ? `Aucun exercice ne correspond à « ${q.trim()} ».` : "Aucun exercice dans cette catégorie."}
                        </p>
                      )}
                      {filteredExercises.map((ex) => {
                        const marked = addIds.has(ex.id);
                        return (
                          <button
                            key={ex.id}
                            type="button"
                            onClick={() => setAddIds((s) => toggle(s, ex.id))}
                            className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                              marked ? "border-ok-soft bg-ok-soft text-ok" : "border-line bg-surface text-ink hover:bg-app-bg"
                            }`}
                          >
                            <ExerciseIllustration name={ex.name} animate={false} className={`h-9 w-9 shrink-0 ${marked ? "text-ok" : "text-brand"}`} />
                            <span className="flex-1 truncate">{ex.name}</span>
                            {marked ? <span className="text-xs font-medium">À ajouter</span> : <Plus className="h-4 w-4 text-brand" strokeWidth={2} />}
                          </button>
                        );
                      })}
                    </div>
                  </section>
                </div>

                <div className="border-t border-line px-6 py-4">
                  {(removed > 0 || added > 0) && (
                    <div className="mb-3 flex flex-wrap gap-2">
                      {removed > 0 && <span className="rounded-full bg-danger-soft px-3 py-1 text-xs font-medium text-danger">{removed} exercice{removed > 1 ? "s" : ""} retiré{removed > 1 ? "s" : ""}</span>}
                      {added > 0 && <span className="rounded-full bg-ok-soft px-3 py-1 text-xs font-medium text-ok">{added} exercice{added > 1 ? "s" : ""} ajouté{added > 1 ? "s" : ""}</span>}
                    </div>
                  )}
                  {wouldBeEmpty && (
                    <p className="mb-3 text-xs text-danger">Une séance doit garder au moins un exercice.</p>
                  )}
                  <div className="flex items-center justify-between gap-2">
                    {recId ? (
                      <form action={removeAction} onSubmit={close}>
                        <input type="hidden" name="patient_id" value={patientId} />
                        <input type="hidden" name="rec_id" value={recId} />
                        <button type="submit" className="text-xs font-medium text-danger hover:underline">Retirer cette séance</button>
                      </form>
                    ) : <span />}
                    <div className="flex gap-2">
                      <button type="button" onClick={close} className="rounded-full border border-line px-4 py-2 text-sm font-medium text-ink hover:bg-app-bg">Annuler</button>
                      <SubmitButton
                        pendingText="Enregistrement…"
                        disabled={noChanges || wouldBeEmpty}
                        className="rounded-full bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-50"
                      >
                        Enregistrer les modifications
                      </SubmitButton>
                    </div>
                  </div>
                </div>
              </form>
            ) : (
              <div className="flex min-h-0 flex-1 flex-col">
                {addableWorkouts.length > 3 && (
                  <div className="border-b border-line px-6 py-3">
                    <label className="relative block">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" strokeWidth={1.75} />
                      <input
                        type="search"
                        value={qTemplate}
                        onChange={(e) => setQTemplate(e.target.value)}
                        placeholder="Rechercher une séance…"
                        className="w-full rounded-lg border border-line bg-surface py-2 pl-9 pr-3 text-sm text-ink placeholder:text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-soft"
                      />
                    </label>
                    {!templateQuery && (
                      <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
                        {bodyParts.map((bp) => {
                          const active = bp.id === templateBodyPartId;
                          return (
                            <button
                              key={bp.id}
                              type="button"
                              onClick={() => setTemplateBodyPartId(bp.id)}
                              className={`flex flex-col items-center gap-1 rounded-lg border p-2 text-center transition-colors ${
                                active ? "border-brand bg-brand-soft" : "border-line bg-surface hover:bg-app-bg"
                              }`}
                            >
                              <BodyPartIllustration slug={bp.slug} className="h-6 w-6" active={active} />
                              <span className="text-[11px] font-medium leading-tight text-ink">{bp.label}</span>
                              <span className="text-[10px] text-muted">{workoutCountByBodyPart.get(bp.id) ?? 0} séance{(workoutCountByBodyPart.get(bp.id) ?? 0) > 1 ? "s" : ""}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
                <div className="min-h-0 flex-1 overflow-y-auto p-6">
                  {addableWorkouts.length === 0 ? (
                    <p className="text-sm text-muted">Aucune séance disponible — créez-en une dans Mes séances.</p>
                  ) : filteredWorkouts.length === 0 ? (
                    <p className="text-sm text-muted">
                      {templateQuery ? `Aucune séance ne correspond à « ${qTemplate} ».` : "Aucune séance dans cette catégorie."}
                    </p>
                  ) : (
                    // Cartes compactes en 2 colonnes sur desktop : deux fois
                    // plus de séances visibles sans scroller.
                    <ul className="grid gap-2 lg:grid-cols-2">
                      {filteredWorkouts.map((w, i) => {
                        const newGroup = i === 0 || filteredWorkouts[i - 1].conditionName !== w.conditionName;
                        return (
                          <li key={w.id} className="contents">
                            {newGroup && (
                              <p className={`text-xs font-semibold uppercase tracking-wide text-muted lg:col-span-2 ${i === 0 ? "" : "mt-3"}`}>
                                {w.conditionName ?? "Sans condition"}
                              </p>
                            )}
                            <div className="flex items-center gap-3 rounded-xl border border-line bg-surface px-3 py-2.5 transition-colors hover:border-brand/40">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-app-bg">
                                {w.exerciseNames[0] ? (
                                  <ExerciseIllustration name={w.exerciseNames[0]} animate={false} className="h-7 w-7 text-brand" />
                                ) : (
                                  <Dumbbell className="h-5 w-5 text-muted" strokeWidth={1.75} />
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="truncate text-sm font-semibold text-ink">{w.name}</p>
                                  {w.editHref && (
                                    <Link href={w.editHref} className="shrink-0 text-xs font-medium text-brand underline underline-offset-2 hover:no-underline">
                                      Modifier
                                    </Link>
                                  )}
                                </div>
                                <p className="mt-0.5 truncate text-xs text-muted">
                                  {w.stageLabel && `${w.stageLabel} · `}
                                  {w.durationMinutes} min
                                  {w.timesPerWeek ? ` · ${w.timesPerWeek}×/semaine` : ""}
                                  {w.exerciseNames.length > 0 ? ` · ${w.exerciseNames.length} exercice${w.exerciseNames.length > 1 ? "s" : ""}` : ""}
                                </p>
                                {w.description && <p className="mt-0.5 line-clamp-1 text-xs text-muted">{w.description}</p>}
                              </div>
                              <form action={assignAction} onSubmit={close} className="shrink-0">
                                <input type="hidden" name="patient_id" value={patientId} />
                                <input type="hidden" name="workout_id" value={w.id} />
                                {weekStartDate && <input type="hidden" name="week_start_date" value={weekStartDate} />}
                                <button type="submit" className="rounded-full border border-brand/30 px-3 py-1 text-xs font-medium text-brand hover:bg-brand-soft">
                                  Choisir
                                </button>
                              </form>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
