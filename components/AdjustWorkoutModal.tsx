"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { CalendarRange, Check, ChevronLeft, Dumbbell, Plus, Repeat, Search, Trash2, X } from "lucide-react";
import { type BodyPart } from "@/lib/exercise/category";
import SubmitButton from "@/components/SubmitButton";
import ExerciseIllustration from "@/components/ExerciseIllustration";
import BodyPartIllustration from "@/components/BodyPartIllustration";
import ExerciseLibraryPicker from "@/components/ExerciseLibraryPicker";
import { addWeeksToKey } from "@/lib/exercise/activeRecommendation";
import { thisWeekStartDateKey } from "@/lib/patient/weeks";

/** Choix « jusqu'à quand ? » de l'étape 2 (null = jusqu'à la prochaine séance). */
const DURATION_CHOICES: (number | null)[] = [null, 1, 2, 3, 4, 6, 8, 12];

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
  const [qTemplate, setQTemplate] = useState("");
  // Pendant combien de semaines la séance choisie s'applique ("" = jusqu'à
  // la prochaine séance attribuée) — migration 0059, Philippe 2026-10-01.
  const [weekCount, setWeekCount] = useState("");
  // Séance cliquée à l'étape 1 → étape 2 (« appliquer — jusqu'à quand ? »).
  const [pickedId, setPickedId] = useState<string | null>(null);
  // « Retirer cette séance » demande une confirmation (action destructive).
  const [confirmRemove, setConfirmRemove] = useState(false);
  const firstBodyPartId = bodyParts[0]?.id ?? null;
  // Which body-part tile is selected in each picker — "Ajouter un exercice"
  // (exercises view) and "Choisir/Changer de séance" (template view) filter
  // independently, same click-a-category-first pattern as the exercise
  // library (components/ExerciseLibraryGrid.tsx): a category is pre-selected
  // on open, and typing in that picker's search box overrides it.
  const [templateBodyPartId, setTemplateBodyPartId] = useState<string | null>(firstBodyPartId);
  const removeFormId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const openModal = () => {
    setView(workout ? "exercises" : "template");
    setTemplateBodyPartId(firstBodyPartId);
    setOpen(true);
  };

  const close = () => {
    setOpen(false);
    setRemoveIds(new Set());
    setAddIds(new Set());
    setQTemplate("");
    setConfirmRemove(false);
    setPickedId(null);
    setWeekCount("");
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
  const picked = pickedId ? (addableWorkouts.find((w) => w.id === pickedId) ?? null) : null;
  // Période de l'étape 2 : à partir de la semaine choisie dans la frise.
  const fromKey = weekStartDate ?? thisWeekStartDateKey();
  const shortDate = (d: Date) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: "UTC" });
  const startLabel = shortDate(new Date(`${fromKey}T12:00:00Z`));
  // Dernier jour (dimanche) d'une période de n semaines.
  const endLabel = (n: number) => {
    const d = new Date(`${addWeeksToKey(fromKey, n)}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() - 1);
    return shortDate(d);
  };

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
        {/* « Ajuster / changer » : le même bouton ouvre les deux (modifier les
            exercices, ou « Changer de séance ») — Philippe, 2026-10-02. */}
        {workout ? "Ajuster / changer la séance" : "Choisir une séance"}
      </button>

      {/* Portail vers document.body, comme NewSeanceModal : un ancêtre avec
          un `transform` (animation d'entrée) limiterait sinon le fond
          assombri à une partie de l'écran. Ouvert seulement au clic, donc
          toujours côté navigateur. */}
      {open &&
        typeof document !== "undefined" &&
        createPortal(
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
            {/* Titre + précision sur UNE ligne (Philippe, 2026-10-02 : même
                rigueur que « Nouvelle séance » — le haut ne doit pas manger la
                place de la composition). */}
            <div className="flex items-center justify-between gap-3 border-b border-line px-6 py-3">
              <div className="flex min-w-0 items-baseline gap-3">
                <h2 className="shrink-0 text-lg font-semibold text-ink">
                  {view === "exercises" && workout ? "Ajuster la séance" : workout ? "Changer de séance" : "Choisir une séance"}
                </h2>
                <p className="truncate text-sm text-muted">
                  {view === "exercises" && workout
                    ? `${workout.name} · pour ${patientFirstName} uniquement`
                    : `${weekLabel ?? "Cette semaine"}${workout ? ` · remplace ${workout.name}` : ""}`}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {/* « Créer une séance » (Philippe, 2026-10-02) : mène au
                    formulaire « Nouvelle séance » de Mes séances, déjà ouvert. */}
                {view === "template" && !picked && (
                  <Link
                    href={`/dashboard/seances?nouvelle=1&retour=/dashboard/patients/${patientId}`}
                    className="mr-1 inline-flex items-center gap-1.5 rounded-full bg-brand-dark px-4 py-1.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand"
                  >
                    <Plus className="h-4 w-4" strokeWidth={2} />
                    Créer une séance
                  </Link>
                )}
                {/* Recherche de séance dans l'en-tête (étape 1) : la ligne du
                    dessous reste entière pour les catégories. */}
                {view === "template" && !picked && addableWorkouts.length > 3 && (
  <label className="relative hidden w-56 md:block">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" strokeWidth={1.75} />
                    <input
                      type="search"
                      value={qTemplate}
                      onChange={(e) => setQTemplate(e.target.value)}
                      placeholder="Rechercher une séance…"
                      className="w-full rounded-lg border border-line bg-surface py-1.5 pl-9 pr-3 text-sm text-ink placeholder:text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-soft"
                    />
                  </label>
                )}
                {view === "exercises" && workout && addableWorkouts.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setPickedId(null);
                      setView("template");
                    }}
                    // Bleu plein foncé (Philippe, 2026-10-01 : « encore plus
                    // visible, dans un bleu plus foncé »).
                    className="inline-flex items-center gap-1.5 rounded-full bg-brand-dark px-4 py-1.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand"
                  >
                    <Repeat className="h-4 w-4" strokeWidth={2} />
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
                <div className="grid min-h-0 flex-1 gap-5 overflow-y-auto px-6 py-4 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] md:overflow-hidden">
                  {/* Séance actuelle : un panneau à part, sur fond gris, pour
                      bien la distinguer de la bibliothèque à droite. */}
                  <section className="flex min-h-0 flex-col rounded-xl border border-line bg-app-bg p-4">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted">Séance actuelle</p>
                      <span className="text-xs text-muted">
                        {workout.exercises.length} exercice{workout.exercises.length > 1 ? "s" : ""}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted">Cliquez sur un exercice pour le retirer.</p>
                    <ul className="mt-3 space-y-1.5 md:min-h-0 md:flex-1 md:overflow-y-auto md:pr-1">
                      {workout.exercises.map((ex) => {
                        const marked = removeIds.has(ex.id);
                        return (
                          <li key={ex.id}>
                            <button
                              type="button"
                              onClick={() => setRemoveIds((s) => toggle(s, ex.id))}
                              className={`flex w-full items-center gap-2.5 rounded-lg border px-2.5 py-1.5 text-left text-sm transition-colors ${
                                marked ? "border-danger/30 bg-danger-soft text-danger line-through" : "border-line bg-surface text-ink hover:border-danger/30"
                              }`}
                            >
                              <ExerciseIllustration name={ex.name} animate={false} className={`h-8 w-8 shrink-0 ${marked ? "text-danger" : "text-brand"}`} />
                              <span className="flex-1 truncate">{ex.name}</span>
                              {marked ? (
                                <span className="flex items-center gap-1 text-xs font-medium no-underline">À retirer <X className="h-3.5 w-3.5" strokeWidth={2} /></span>
                              ) : (
                                <Check className="h-4 w-4 text-brand" strokeWidth={2} />
                              )}
                            </button>
                          </li>
                        );
                      })}
                      {[...addIds].map((id) => {
                        const ex = addableExercises.find((e) => e.id === id);
                        if (!ex) return null;
                        return (
                          <li key={`new-${id}`}>
                            <button
                              type="button"
                              onClick={() => setAddIds((s) => toggle(s, id))}
                              className="flex w-full items-center gap-2.5 rounded-lg border border-ok/30 bg-ok-soft px-2.5 py-1.5 text-left text-sm text-ok transition-colors"
                            >
                              <ExerciseIllustration name={ex.name} animate={false} className="h-8 w-8 shrink-0 text-ok" />
                              <span className="flex-1 truncate">{ex.name}</span>
                              <span className="text-xs font-medium">Ajouté</span>
                            </button>
                          </li>
                        );
                      })}
                      {workout.exercises.length === 0 && addIds.size === 0 && <li className="text-sm text-muted">Cette séance est vide.</li>}
                    </ul>
                  </section>

                  <ExerciseLibraryPicker
                    exercises={addableExercises}
                    bodyParts={bodyParts}
                    selectedIds={addIds}
                    onToggle={(id) => setAddIds((set) => toggle(set, id))}
                  />
                </div>

                <div className="border-t border-line px-6 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    {recId ? (
                      confirmRemove ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm text-ink">Retirer la séance de {patientFirstName} ?</span>
                          {/* Lié par l'attribut `form` au formulaire de retrait
                              rendu à côté : un <form> ne peut pas être imbriqué
                              dans un autre <form>, sinon erreur d'hydratation. */}
                          <button
                            type="submit"
                            form={removeFormId}
                            className="rounded-full bg-danger px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
                          >
                            Oui, retirer
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmRemove(false)}
                            className="rounded-full border border-line px-3 py-1.5 text-xs font-medium text-ink hover:bg-app-bg"
                          >
                            Non
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmRemove(true)}
                          className="inline-flex items-center gap-1.5 rounded-full border border-danger/30 px-4 py-1.5 text-sm font-medium text-danger transition-colors hover:bg-danger-soft"
                        >
                          <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                          Retirer cette séance
                        </button>
                      )
                    ) : <span />}
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Compteurs et avertissement à côté des boutons plutôt
                          qu'au-dessus : une ligne de moins. */}
                      {wouldBeEmpty ? (
                        <span className="text-xs text-danger">Une séance doit garder au moins un exercice.</span>
                      ) : (
                        <>
                          {removed > 0 && <span className="rounded-full bg-danger-soft px-3 py-1 text-xs font-medium text-danger">{removed} retiré{removed > 1 ? "s" : ""}</span>}
                          {added > 0 && <span className="rounded-full bg-ok-soft px-3 py-1 text-xs font-medium text-ok">{added} ajouté{added > 1 ? "s" : ""}</span>}
                        </>
                      )}
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
            ) : null}
            {view === "exercises" && workout && recId && (
              <form id={removeFormId} action={removeAction} onSubmit={close} className="hidden">
                <input type="hidden" name="patient_id" value={patientId} />
                <input type="hidden" name="rec_id" value={recId} />
              </form>
            )}
            {view === "exercises" && workout ? null : picked ? (
              // Étape 2 : « Voulez-vous lui appliquer cette séance — jusqu'à
              // quand ? » (Philippe, 2026-10-01 : choisir la séance d'abord,
              // la période ensuite).
              <form action={assignAction} onSubmit={close} className="flex min-h-0 flex-1 flex-col">
                <input type="hidden" name="patient_id" value={patientId} />
                <input type="hidden" name="workout_id" value={picked.id} />
                {weekStartDate && <input type="hidden" name="week_start_date" value={weekStartDate} />}
                {weekCount && <input type="hidden" name="week_count" value={weekCount} />}
                <div className="min-h-0 flex-1 overflow-y-auto px-6 py-3">
                  <button
                    type="button"
                    onClick={() => setPickedId(null)}
                    className="inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-ink"
                  >
                    <ChevronLeft className="h-4 w-4" strokeWidth={2} />
                    Retour à la liste des séances
                  </button>

                  <div className="mx-auto mt-3 grid max-w-5xl gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                    <section className="rounded-xl border border-line bg-app-bg p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted">Séance choisie</p>
                      <p className="mt-1 text-base font-semibold text-ink">{picked.name}</p>
                      <p className="mt-0.5 text-xs text-muted">
                        {[
                          picked.conditionName,
                          picked.stageLabel,
                          picked.durationMinutes != null ? `${picked.durationMinutes} min` : null,
                          picked.timesPerWeek ? `${picked.timesPerWeek}×/semaine` : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                      {picked.description && <p className="mt-1 text-xs text-muted">{picked.description}</p>}
                      <ul className="mt-3 grid grid-cols-2 gap-2">
                        {picked.exerciseNames.map((n, i) => (
                          <li key={`${n}-${i}`} className="flex items-center gap-2 rounded-lg bg-surface p-1.5">
                            <ExerciseIllustration name={n} animate={false} className="h-9 w-9 shrink-0 text-brand" />
                            <span className="line-clamp-2 text-xs text-ink">{n}</span>
                          </li>
                        ))}
                      </ul>
                    </section>

                    <section>
                      <h3 className="text-base font-semibold text-ink">Appliquer cette séance à {patientFirstName} ?</h3>
                      {workout && <p className="mt-0.5 truncate text-xs text-muted">Remplace {workout.name}</p>}

                      {/* Une rangée de pastilles courtes + UNE ligne de résumé
                          qui suit le choix (Philippe, 2026-10-01 : « trop de
                          texte, plus esthétique »). */}
                      <p className="mt-4 text-sm font-medium text-ink">Jusqu&apos;à quand ?</p>
                      <div role="radiogroup" aria-label="Jusqu'à quand" className="mt-2 flex flex-wrap items-center gap-1.5">
                        {DURATION_CHOICES.map((n) => {
                          const value = n === null ? "" : String(n);
                          const selected = weekCount === value;
                          const tone = selected ? "border-brand bg-brand text-white" : "border-line bg-surface text-ink hover:border-brand/50";
                          return (
                            <button
                              key={value || "open"}
                              type="button"
                              role="radio"
                              aria-checked={selected}
                              aria-label={n === null ? "Sans limite" : `${n} semaine${n > 1 ? "s" : ""}`}
                              onClick={() => setWeekCount(value)}
                              className={`rounded-full border text-sm font-medium transition-colors ${
                                n === null ? "mr-1.5 px-3.5 py-1.5" : "h-9 w-9"
                              } ${tone}`}
                            >
                              {n === null ? "Sans limite" : n}
                            </button>
                          );
                        })}
                        <span className="ml-0.5 text-sm text-muted">semaines</span>
                      </div>
                      <p className="mt-3 flex items-center gap-2 rounded-xl bg-app-bg px-3 py-2 text-sm text-ink">
                        <CalendarRange className="h-4 w-4 shrink-0 text-brand" strokeWidth={1.75} />
                        {weekCount ? (
                          <span>
                            Du <span className="font-semibold">{startLabel}</span> au{" "}
                            <span className="font-semibold">{endLabel(Number(weekCount))}</span>
                          </span>
                        ) : (
                          <span>
                            Dès le <span className="font-semibold">{startLabel}</span>, jusqu&apos;à la prochaine séance
                          </span>
                        )}
                      </p>
                    </section>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-line px-6 py-3">
                  <button
                    type="button"
                    onClick={() => setPickedId(null)}
                    className="rounded-full border border-line px-4 py-2 text-sm font-medium text-ink hover:bg-app-bg"
                  >
                    Retour
                  </button>
                  <button type="submit" className="rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
                    Appliquer la séance
                  </button>
                </div>
              </form>
            ) : (
              // Étape 1 : choisir la séance. Recherche + catégories sur UNE
              // ligne (pastilles qui défilent si elles débordent), liste en
              // cartes compactes jusqu'à 3 colonnes (Philippe, 2026-10-01 :
              // « pas assez de place »).
              <div className="flex min-h-0 flex-1 flex-col">
                {addableWorkouts.length > 3 && (
                  <div className="flex items-center border-b border-line px-6 py-2">
                    {/* Une case par catégorie, toutes de même largeur sur une seule ligne
                        (le libellé passe sur 2 lignes si besoin) ; sur
                        téléphone, la ligne défile. */}
                    <div
                      style={{ gridTemplateColumns: `repeat(${bodyParts.length}, minmax(0, 1fr))` }}
                      className={`flex min-w-0 flex-1 gap-1.5 overflow-x-auto md:grid md:overflow-visible ${templateQuery ? "opacity-40" : ""}`}
                    >
                      {bodyParts.map((bp) => {
                        const active = !templateQuery && bp.id === templateBodyPartId;
                        const count = workoutCountByBodyPart.get(bp.id) ?? 0;
                        return (
                          <button
                            key={bp.id}
                            type="button"
                            title={`${count} séance${count > 1 ? "s" : ""}`}
                            onClick={() => {
                              setQTemplate("");
                              setTemplateBodyPartId(bp.id);
                            }}
                            className={`flex shrink-0 items-center gap-1.5 rounded-xl border px-1.5 py-1 text-left text-[11px] font-medium leading-tight transition-colors md:min-w-0 ${
                              active ? "border-brand bg-brand-soft text-brand" : "border-line bg-surface text-ink hover:bg-app-bg"
                            }`}
                          >
                            <BodyPartIllustration slug={bp.slug} className="h-7 w-7 shrink-0" active={active} />
                            <span className="line-clamp-2 whitespace-nowrap md:whitespace-normal">{bp.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
                  {addableWorkouts.length === 0 ? (
                    <p className="text-sm text-muted">Aucune séance disponible — créez-en une dans Mes séances.</p>
                  ) : filteredWorkouts.length === 0 ? (
                    <p className="text-sm text-muted">
                      {templateQuery ? `Aucune séance ne correspond à « ${qTemplate} ».` : "Aucune séance dans cette catégorie."}
                    </p>
                  ) : (
                    <ul className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                      {filteredWorkouts.map((w, i) => {
                        const newGroup = i === 0 || filteredWorkouts[i - 1].conditionName !== w.conditionName;
                        const pick = () => {
                          setWeekCount("");
                          setPickedId(w.id);
                        };
                        return (
                          <li key={w.id} className="contents">
                            {newGroup && (
                              <p className={`text-xs font-semibold uppercase tracking-wide text-muted md:col-span-2 xl:col-span-3 ${i === 0 ? "" : "mt-2"}`}>
                                {w.conditionName ?? "Sans condition"}
                              </p>
                            )}
                            <div className="flex items-center gap-2.5 rounded-xl border border-line bg-surface px-2.5 py-2 transition-colors hover:border-brand/40">
                              <button type="button" onClick={pick} className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-app-bg">
                                  {w.exerciseNames[0] ? (
                                    <ExerciseIllustration name={w.exerciseNames[0]} animate={false} className="h-7 w-7 text-brand" />
                                  ) : (
                                    <Dumbbell className="h-5 w-5 text-muted" strokeWidth={1.75} />
                                  )}
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate text-sm font-semibold text-ink">{w.name}</span>
                                  <span className="block truncate text-xs text-muted">
                                    {[
                                      w.stageLabel,
                                      w.durationMinutes != null ? `${w.durationMinutes} min` : null,
                                      w.timesPerWeek ? `${w.timesPerWeek}×/sem.` : null,
                                      w.exerciseNames.length > 0 ? `${w.exerciseNames.length} exo${w.exerciseNames.length > 1 ? "s" : ""}` : null,
                                    ]
                                      .filter(Boolean)
                                      .join(" · ")}
                                  </span>
                                </span>
                              </button>
                              {w.editHref && (
                                <Link href={w.editHref} className="shrink-0 text-xs font-medium text-muted underline underline-offset-2 hover:text-brand">
                                  Modifier
                                </Link>
                              )}
                              <button
                                type="button"
                                onClick={pick}
                                className="shrink-0 rounded-full border border-brand/30 px-3 py-1 text-xs font-medium text-brand hover:bg-brand-soft"
                              >
                                Choisir
                              </button>
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
      , document.body)}
    </>
  );
}
