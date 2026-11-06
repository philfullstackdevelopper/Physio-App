"use client";

import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { isPhoneFormat } from "@/lib/phoneFormat";
import Link from "next/link";
import { track } from "@/lib/analytics/track";
import { CalendarRange, Check, ChevronDown, ChevronLeft, ChevronUp, Dumbbell, Info, Plus, Repeat, Search, Trash2, X } from "lucide-react";
import { levelNeighbours, STAGE_ORDER } from "@/lib/exercise/levelStep";
import { PHASE_NUMBER, phaseDoseFor, type Stage } from "@/lib/exercise/phasePlan";
import type { Recommendation } from "@/lib/exercise/variants";
import { type BodyPart } from "@/lib/exercise/category";
import SubmitButton from "@/components/SubmitButton";
import ExerciseIllustration from "@/components/ExerciseIllustration";
import BodyPartIllustration from "@/components/BodyPartIllustration";
import ExerciseLibraryPicker from "@/components/ExerciseLibraryPicker";
import ExerciseInfoModal from "@/components/ExerciseInfoModal";
import { equipmentListLabel, missingEquipment } from "@/lib/exercise/equipment";
import { addWeeksToKey } from "@/lib/exercise/activeRecommendation";
import { thisWeekStartDateKey } from "@/lib/patient/weeks";
import DoseInputs from "@/components/DoseInputs";
import type { ExerciseDose } from "@/lib/exercise/prescription";

/** Le petit (i) d'une carte d'exercice : ouvre sa vidéo et ses consignes
 *  (Philippe, 2026-11-01). Posé À CÔTÉ du bouton de la carte (un bouton ne
 *  peut pas en contenir un autre), en haut à droite. */
function InfoButton({ name, onOpen }: { name: string; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Voir la démonstration : ${name}`}
      title="Voir la démonstration"
      className="absolute right-1 top-1 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-surface/80 text-muted transition-colors hover:bg-brand-soft hover:text-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"
    >
      <Info className="h-4 w-4" strokeWidth={1.75} />
    </button>
  );
}

/** Choix « jusqu'à quand ? » (null = jusqu'à la prochaine séance). */
const DURATION_CHOICES: (number | null)[] = [null, 1, 2, 3, 4, 6, 8, 12];

/** `equipment` : matériel indispensable à l'exercice (exercises.equipment, migration 0065).
 *  `doseKind` : exercice en répétitions, en maintien ou en durée (lu dans la
 *  consigne) — seuls les exercices en répétitions reçoivent la dose de la phase. */
export type ModalExercise = {
  id: string;
  name: string;
  equipment?: string[] | null;
  dose?: ExerciseDose | null;
  doseKind?: "reps" | "hold" | "duration";
};
export type AddableExercise = ModalExercise & { bodyPartIds: string[]; searchKeywords?: string[] | null };

export type AddableWorkout = {
  id: string;
  name: string;
  /** Pour « plus facile / plus difficile » (lib/exercise/levelStep.ts). */
  conditionId?: string | null;
  stage?: string | null;
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
  /** Les exercices eux-mêmes (avec leur dose) : la séance peut être modifiée
   *  pour ce patient avant d'être appliquée. */
  exercises: ModalExercise[];
  /** Every body part any of this séance's exercises is tagged with (union,
   *  not deduped to one) — lets the picker filter by area without forcing a
   *  multi-area séance into a single category. */
  bodyPartIds: string[];
};

/** « Changements recommandés » (Philippe, 2026-11-02) : en haut de la colonne
 *  de droite, avant la bibliothèque, une variante plus facile / plus difficile
 *  des exercices de la séance (lib/exercise/variants.ts). « Remplacer » coche
 *  l'ancien exercice « à retirer » et ajoute la variante ; un 2e clic annule. */
function RecommendedChanges({
  items,
  removeIds,
  addIds,
  onSwap,
}: {
  items: Recommendation[];
  removeIds: Set<string>;
  addIds: Set<string>;
  onSwap: (r: Recommendation, on: boolean) => void;
}) {
  if (items.length === 0) return null;
  return (
    <section aria-label="Changements recommandés" className="shrink-0 rounded-xl border border-line bg-surface p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">Changements recommandés</p>
      <ul className="mt-2 max-h-44 space-y-1.5 overflow-y-auto pr-1">
        {items.map((r) => {
          const on = removeIds.has(r.forId) && addIds.has(r.alt.id);
          return (
            <li key={`${r.forId}-${r.alt.id}`} className="flex items-center gap-2 rounded-lg bg-app-bg px-2.5 py-1.5 text-sm">
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${r.kind === "easier" ? "bg-ok-soft text-ok" : "bg-brand-soft text-brand-dark"}`}>
                {r.kind === "easier" ? "Plus facile" : "Plus difficile"}
              </span>
              <span className="min-w-0 flex-1 truncate text-ink" title={`${r.forName} → ${r.alt.name}`}>
                <span className="text-muted">{r.forName}</span>
                {r.reason && <span className="text-danger"> ({r.reason})</span>}
                <span className="text-muted"> → </span>
                <span className="font-medium">{r.alt.name}</span>
              </span>
              <button
                type="button"
                aria-pressed={on}
                onClick={() => onSwap(r, !on)}
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${on ? "bg-ok text-white" : "border border-line bg-surface text-ink hover:bg-app-bg"}`}
              >
                {on ? "Remplacé" : "Remplacer"}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Pastilles « Jusqu'à quand ? » : « Sans limite » par défaut, puis 1 à 12
 *  semaines (Philippe, 2026-11-05, proposition 3 : plus d'écran à part). */
function DurationPills({ value, onChange, summary }: { value: string; onChange: (v: string) => void; summary: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1.5 max-sm:flex-nowrap max-sm:overflow-x-auto max-sm:[scrollbar-width:none]">
      <span className="shrink-0 text-sm font-medium text-ink">Jusqu&apos;à quand ?</span>
      <div role="radiogroup" aria-label="Jusqu'à quand" className="flex shrink-0 items-center gap-1">
        {DURATION_CHOICES.map((n) => {
          const v = n === null ? "" : String(n);
          const selected = value === v;
          return (
            <button
              key={v || "open"}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={n === null ? "Sans limite" : `${n} semaine${n > 1 ? "s" : ""}`}
              onClick={() => onChange(v)}
              className={`shrink-0 rounded-full border text-xs font-medium transition-colors ${n === null ? "mr-1 px-3 py-1.5" : "h-8 w-8"} ${
                selected ? "border-brand bg-brand text-white" : "border-line bg-surface text-ink hover:border-brand/50"
              }`}
            >
              {n === null ? "Sans limite" : n}
            </button>
          );
        })}
        <span className="ml-0.5 text-xs text-muted">sem.</span>
      </div>
      <span className="flex shrink-0 items-center gap-1.5 text-xs text-muted max-sm:hidden">
        <CalendarRange className="h-3.5 w-3.5 shrink-0 text-brand" strokeWidth={1.75} />
        {summary}
      </span>
    </div>
  );
}

/** La composition d'une séance pour CE patient : à gauche ses exercices
 *  (toucher = retirer, dose dessous), à droite la bibliothèque pour en
 *  ajouter. Partagée par « Ajuster la séance » et par la séance choisie avant
 *  de l'appliquer (Philippe, 2026-11-05 : « pouvoir y ajouter / enlever ce qui
 *  les arrange au moment d'assigner une séance »). */
function SeanceComposer({
  title,
  hint,
  exercises,
  stage,
  removeIds,
  setRemoveIds,
  addIds,
  setAddIds,
  addableExercises,
  bodyParts,
  patientEquipment,
  patientFirstName,
  phoneTab,
  onDoseEdit,
  onInfo,
  extra,
  recentIds,
}: {
  title: string;
  hint: string;
  exercises: ModalExercise[];
  stage: string | null | undefined;
  removeIds: Set<string>;
  setRemoveIds: (f: (s: Set<string>) => Set<string>) => void;
  addIds: Set<string>;
  setAddIds: (f: (s: Set<string>) => Set<string>) => void;
  addableExercises: AddableExercise[];
  bodyParts: BodyPart[];
  patientEquipment: string[] | null;
  patientFirstName: string;
  phoneTab: "current" | "add";
  onDoseEdit: () => void;
  onInfo: (ex: { id: string; name: string }) => void;
  extra?: ReactNode;
  recentIds?: string[];
}) {
  const inSeance = useMemo(() => new Set(exercises.map((e) => e.id)), [exercises]);
  const library = useMemo(() => addableExercises.filter((e) => !inSeance.has(e.id)), [addableExercises, inSeance]);
  return (
    // Sur desktop chaque colonne scrolle indépendamment (min-h-0 +
    // overflow-y-auto) ; sur mobile la grille entière scrolle.
    <div className="grid min-h-0 flex-1 gap-5 overflow-y-auto px-6 py-4 sm:max-md:flex sm:max-md:flex-col sm:max-md:*:shrink-0 max-sm:block max-sm:overflow-hidden max-sm:px-4 max-sm:py-3 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] md:overflow-hidden">
      {/* La séance : un panneau à part, sur fond gris, pour bien la
          distinguer de la bibliothèque à droite. */}
      <section className={`flex min-h-0 flex-col sm:max-md:shrink-0 rounded-xl border border-line bg-app-bg p-4 max-sm:h-full max-sm:border-0 max-sm:bg-transparent max-sm:p-0 ${phoneTab === "current" ? "" : "max-sm:hidden"}`}>
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">{title}</p>
          <span className="text-xs text-muted">
            {exercises.length} exercice{exercises.length > 1 ? "s" : ""}
          </span>
        </div>
        <p className="mt-1 text-xs text-muted max-sm:mt-0">
          <span className="max-sm:hidden">{hint}</span>
          <span className="sm:hidden">Touchez un exercice pour le retirer.</span>
        </p>
        <ul className="mt-3 grid grid-cols-2 content-start gap-2 max-sm:mt-2 max-sm:min-h-0 max-sm:flex-1 max-sm:overflow-y-auto md:min-h-0 md:flex-1 md:overflow-y-auto md:pr-1">
          {exercises.map((ex) => {
            const marked = removeIds.has(ex.id);
            return (
              <li key={ex.id} className="relative flex flex-col">
                <InfoButton name={ex.name} onOpen={() => onInfo({ id: ex.id, name: ex.name })} />
                <button
                  type="button"
                  onClick={() => setRemoveIds((s) => toggled(s, ex.id))}
                  className={`flex w-full flex-1 flex-col items-center gap-1.5 rounded-xl border p-2.5 text-center text-sm transition-colors ${
                    marked ? "border-danger/30 bg-danger-soft text-danger line-through" : "border-line bg-surface text-ink hover:border-danger/30"
                  }`}
                >
                  <ExerciseIllustration name={ex.name} className={`h-16 w-full shrink-0 md:h-20 ${marked ? "text-danger" : "text-brand"}`} />
                  <span className="line-clamp-2 min-h-[2.5em] text-[13px] leading-tight">{ex.name}</span>
                  {!marked && <MissingEquipmentPill required={ex.equipment} owned={patientEquipment} firstName={patientFirstName} />}
                  {marked ? (
                    <span className="flex items-center gap-1 text-xs font-medium no-underline">
                      À retirer <X className="h-3.5 w-3.5" strokeWidth={2} />
                    </span>
                  ) : (
                    <Check className="h-4 w-4 text-brand" strokeWidth={2} />
                  )}
                </button>
                {!marked && <DoseInputs exerciseId={ex.id} exerciseName={ex.name} dose={ex.dose} onEdit={onDoseEdit} />}
              </li>
            );
          })}
          {[...addIds].map((id) => {
            const ex = addableExercises.find((e) => e.id === id);
            if (!ex) return null;
            // Dose de la phase pré-remplie (proposition 5) : le kiné ne touche que ce qui diffère.
            const phaseDose = phaseDoseFor(stage, ex.doseKind);
            return (
              <li key={`new-${id}`} className="relative flex flex-col">
                <InfoButton name={ex.name} onOpen={() => onInfo({ id: ex.id, name: ex.name })} />
                <button
                  type="button"
                  onClick={() => setAddIds((s) => toggled(s, id))}
                  className="flex w-full flex-1 flex-col items-center gap-1.5 rounded-xl border border-ok/30 bg-ok-soft p-2.5 text-center text-sm text-ok transition-colors"
                >
                  <ExerciseIllustration name={ex.name} className="h-16 w-full shrink-0 text-ok md:h-20" />
                  <span className="line-clamp-2 min-h-[2.5em] text-[13px] leading-tight">{ex.name}</span>
                  <MissingEquipmentPill required={ex.equipment} owned={patientEquipment} firstName={patientFirstName} />
                  <span className="text-xs font-medium">Ajouté</span>
                </button>
                <DoseInputs exerciseId={ex.id} exerciseName={ex.name} dose={phaseDose} onEdit={onDoseEdit} />
              </li>
            );
          })}
          {exercises.length === 0 && addIds.size === 0 && <li className="col-span-2 text-sm text-muted">Cette séance est vide.</li>}
        </ul>
      </section>

      <div className={`flex min-h-0 min-w-0 flex-col gap-3 sm:max-md:shrink-0 ${phoneTab === "add" ? "max-sm:h-full" : "max-sm:hidden"}`}>
        {extra}
        <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)] grid-rows-[minmax(0,1fr)]">
          <ExerciseLibraryPicker
            exercises={library}
            bodyParts={bodyParts}
            selectedIds={addIds}
            onToggle={(id) => setAddIds((set) => toggled(set, id))}
            patientEquipment={patientEquipment}
            patientFirstName={patientFirstName}
            recentIds={recentIds}
          />
        </div>
      </div>
    </div>
  );
}

function toggled(set: Set<string>, id: string) {
  const next = new Set(set);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

// The single place a kiné manages a patient's séance: assign one if none is
// set yet, adjust its exercises, or replace it with a different one — all
// from the same button, instead of a separate "Ajuster" button up top and a
// separate queue/reorder list further down the page (a patient has at most
// one recommended séance at a time now, see actions.ts).
export default function AdjustWorkoutModal({
  patientId,
  patientFirstName,
  patientEquipment = null,
  patientConditionId = null,
  patientStage = null,
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
  recommendations,
  recentIds,
  saveAsMineAction,
}: {
  /** Variantes plus faciles / plus difficiles, calculées pour la séance de la
   *  semaine en cours (forWorkoutId) ; masquées pour une autre séance. */
  recommendations?: { forWorkoutId: string; items: Recommendation[] } | null;
  patientId: string;
  patientFirstName: string;
  /** Matériel déclaré par le patient à l'onboarding ; null = inconnu (aucun signalement). */
  patientEquipment?: string[] | null;
  /** Pathologie du patient et phase déclarée : présélectionnées dans
   *  « Choisir une séance » (proposition 1). */
  patientConditionId?: string | null;
  patientStage?: string | null;
  /** `isPatientCopy` : séance déjà ajustée pour ce patient — elle peut être
   *  enregistrée dans « Mes séances » pour la réutiliser (proposition 7). */
  workout: { id: string; name: string; exercises: ModalExercise[]; conditionId?: string | null; stage?: string | null; isPatientCopy?: boolean } | null;
  /** Copie une séance dans « Mes séances » (duplicateSeance). */
  saveAsMineAction?: (formData: FormData) => void;
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
  /** Exercices de ses dernières séances (« Récents »). */
  recentIds?: string[];
}) {
  const [open, setOpen] = useState(false);
  // Exercice dont la démonstration est ouverte par le (i).
  const [info, setInfo] = useState<{ id: string; name: string } | null>(null);
  const [view, setView] = useState<"exercises" | "template">(workout ? "exercises" : "template");
  const [removeIds, setRemoveIds] = useState<Set<string>>(new Set());
  const [addIds, setAddIds] = useState<Set<string>>(new Set());
  const [qTemplate, setQTemplate] = useState("");
  // Pendant combien de semaines la séance choisie s'applique ("" = jusqu'à
  // la prochaine séance attribuée) — migration 0059, Philippe 2026-10-01.
  const [weekCount, setWeekCount] = useState("");
  // Séance ouverte pour la voir / la modifier avant de l'appliquer.
  const [pickedId, setPickedId] = useState<string | null>(null);
  // « Retirer cette séance » demande une confirmation (action destructive).
  const [confirmRemove, setConfirmRemove] = useState(false);
  // Téléphone (Philippe, 2026-10-12) : la fenêtre prend tout l'écran et se
  // déroule en deux temps. D'abord la séance seule, en blocs 2 par rangée
  // (toucher un exercice = le retirer), avec « Ajouter un exercice » en bas,
  // qui ouvre la bibliothèque plein écran.
  const [phoneTab, setPhoneTab] = useState<"current" | "add">("current");
  const firstBodyPartId = bodyParts[0]?.id ?? null;
  const [templateBodyPartId, setTemplateBodyPartId] = useState<string | null>(firstBodyPartId);

  // « Par pathologie » (proposition 1) : la pathologie du patient et sa phase
  // sont présélectionnées ; « Par zone » garde les cases par partie du corps.
  const conditionOptions = useMemo(() => {
    const m = new Map<string, string>();
    for (const w of addableWorkouts) if (w.conditionId) m.set(w.conditionId, w.conditionName ?? "Sans pathologie");
    return [...m.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => (a.id === patientConditionId ? -1 : b.id === patientConditionId ? 1 : a.name.localeCompare(b.name, "fr")));
  }, [addableWorkouts, patientConditionId]);
  const initialFilter = () => {
    const hasCondition = !!patientConditionId && addableWorkouts.some((w) => w.conditionId === patientConditionId);
    const stage =
      hasCondition && patientStage && addableWorkouts.some((w) => w.conditionId === patientConditionId && w.stage === patientStage)
        ? (patientStage as Stage)
        : null;
    return { mode: (hasCondition ? "pathology" : "zone") as "pathology" | "zone", conditionId: hasCondition ? patientConditionId : null, stage };
  };
  const [filterMode, setFilterMode] = useState<"pathology" | "zone">(() => initialFilter().mode);
  const [conditionFilter, setConditionFilter] = useState<string | null>(() => initialFilter().conditionId ?? conditionOptions[0]?.id ?? null);
  const [stageFilter, setStageFilter] = useState<Stage | null>(() => initialFilter().stage);

  const removeFormId = useId();
  const saveFormId = useId();
  // Séance un niveau en dessous / au-dessus, même condition (phase voisine).
  const level = workout
    ? levelNeighbours(
        { id: workout.id, conditionId: workout.conditionId ?? null, stage: workout.stage ?? null },
        addableWorkouts.map((w) => ({ id: w.id, conditionId: w.conditionId ?? null, stage: w.stage ?? null })),
      )
    : { easier: null, harder: null };
  const easierWorkout = addableWorkouts.find((w) => w.id === level.easier) ?? null;
  const harderWorkout = addableWorkouts.find((w) => w.id === level.harder) ?? null;
  // Une dose (séries × répétitions) modifiée compte comme un changement.
  const [doseEdited, setDoseEdited] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const resetEdits = () => {
    setRemoveIds(new Set());
    setAddIds(new Set());
    setDoseEdited(false);
    setPhoneTab("current");
  };

  const openModal = () => {
    setView(workout ? "exercises" : "template");
    setTemplateBodyPartId(firstBodyPartId);
    const f = initialFilter();
    setFilterMode(f.mode);
    setConditionFilter(f.conditionId ?? conditionOptions[0]?.id ?? null);
    setStageFilter(f.stage);
    setPhoneTab("current");
    setOpen(true);
  };

  const close = () => {
    setOpen(false);
    resetEdits();
    setQTemplate("");
    setConfirmRemove(false);
    setPickedId(null);
    setWeekCount("");
    triggerRef.current?.focus();
  };

  const pick = (id: string) => {
    resetEdits();
    setPickedId(id);
  };
  const backToList = () => {
    resetEdits();
    setPickedId(null);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const stageRank = (s: string | null | undefined) => {
    const i = STAGE_ORDER.indexOf((s ?? "") as Stage);
    return i < 0 ? 99 : i;
  };
  const templateQuery = qTemplate.trim().toLowerCase();
  const filteredWorkouts = useMemo(() => {
    if (templateQuery) {
      return addableWorkouts.filter(
        (w) => w.name.toLowerCase().includes(templateQuery) || w.exerciseNames.some((n) => n.toLowerCase().includes(templateQuery)),
      );
    }
    // The category tiles only render once there's enough séances to be worth
    // filtering (same threshold as the search box above them) — below that,
    // there's no filter UI, so nothing may be silently hidden.
    if (addableWorkouts.length <= 3) return addableWorkouts;
    if (filterMode === "pathology") {
      return addableWorkouts
        .filter((w) => w.conditionId === conditionFilter && (!stageFilter || w.stage === stageFilter))
        .sort((a, b) => stageRank(a.stage) - stageRank(b.stage) || a.name.localeCompare(b.name, "fr"));
    }
    return templateBodyPartId ? addableWorkouts.filter((w) => w.bodyPartIds.includes(templateBodyPartId)) : addableWorkouts;
  }, [addableWorkouts, templateBodyPartId, templateQuery, filterMode, conditionFilter, stageFilter]);

  const workoutCountByBodyPart = useMemo(() => {
    const counts = new Map<string, number>();
    for (const w of addableWorkouts) for (const bpId of w.bodyPartIds) counts.set(bpId, (counts.get(bpId) ?? 0) + 1);
    return counts;
  }, [addableWorkouts]);
  const stageCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const w of addableWorkouts) if (w.conditionId === conditionFilter && w.stage) counts.set(w.stage, (counts.get(w.stage) ?? 0) + 1);
    return counts;
  }, [addableWorkouts, conditionFilter]);

  const removed = removeIds.size;
  const added = addIds.size;
  const noChanges = removed === 0 && added === 0 && !doseEdited;
  const picked = pickedId ? (addableWorkouts.find((w) => w.id === pickedId) ?? null) : null;
  // La séance en cours de composition : celle de la semaine (« Ajuster ») ou
  // celle qu'on s'apprête à appliquer.
  const composing = view === "exercises" && workout ? workout : picked;
  const wouldBeEmpty = Boolean(
    composing && composing.exercises.length > 0 && composing.exercises.every((e) => removeIds.has(e.id)) && addIds.size === 0,
  );

  const triggerDisabled = !workout && addableWorkouts.length === 0;
  // Période choisie : à partir de la semaine sélectionnée dans la frise.
  const fromKey = weekStartDate ?? thisWeekStartDateKey();
  const shortDate = (d: Date) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: "UTC" });
  const startLabel = shortDate(new Date(`${fromKey}T12:00:00Z`));
  // Dernier jour (dimanche) d'une période de n semaines.
  const endLabel = (n: number) => {
    const d = new Date(`${addWeeksToKey(fromKey, n)}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() - 1);
    return shortDate(d);
  };
  const periodSummary = weekCount ? (
    <span>
      Du <span className="font-semibold text-ink">{startLabel}</span> au <span className="font-semibold text-ink">{endLabel(Number(weekCount))}</span>
    </span>
  ) : (
    <span>
      Dès le <span className="font-semibold text-ink">{startLabel}</span>, jusqu&apos;à la prochaine séance
    </span>
  );
  const changeHiddenInputs = (
    <>
      {[...removeIds].map((id) => (
        <input key={`r-${id}`} type="hidden" name="remove_ids" value={id} />
      ))}
      {[...addIds].map((id) => (
        <input key={`a-${id}`} type="hidden" name="add_ids" value={id} />
      ))}
    </>
  );
  const changeCounters = wouldBeEmpty ? (
    <span className="text-xs text-danger">Une séance doit garder au moins un exercice.</span>
  ) : (
    <>
      {removed > 0 && <span className="rounded-full bg-danger-soft px-3 py-1 text-xs font-medium text-danger">{removed} retiré{removed > 1 ? "s" : ""}</span>}
      {added > 0 && <span className="rounded-full bg-ok-soft px-3 py-1 text-xs font-medium text-ok">{added} ajouté{added > 1 ? "s" : ""}</span>}
    </>
  );
  // Téléphone, page « Ajouter un exercice » : un seul bouton pour revenir.
  const phoneAddFooter =
    phoneTab === "add" ? (
      <div className="hidden border-t border-line px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-2.5 max-sm:block">
        <button type="button" onClick={() => setPhoneTab("current")} className="w-full rounded-full bg-brand py-2.5 text-sm font-semibold text-white">
          {added > 0 ? `Terminé · ${added} ajouté${added > 1 ? "s" : ""}` : "Retour à la séance"}
        </button>
      </div>
    ) : null;
  const phoneAddButton = (
    <button
      type="button"
      onClick={() => setPhoneTab("add")}
      className="hidden flex-1 items-center justify-center gap-1 rounded-full border border-brand/40 bg-brand-soft px-2 py-2.5 text-[13px] font-semibold text-brand max-sm:inline-flex"
    >
      <Plus className="h-4 w-4 shrink-0" strokeWidth={2} />
      Ajouter un exercice
    </button>
  );

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={openModal}
        disabled={triggerDisabled}
        title={triggerDisabled ? "Aucune séance disponible — créez-en une dans Mes séances." : undefined}
        className="inline-flex shrink-0 items-center rounded-full bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
      >
        {/* « Ajuster / changer » : le même bouton ouvre les deux (modifier les
            exercices, ou « Changer de séance ») — Philippe, 2026-10-02. */}
        {workout ? "Ajuster la séance" : "Choisir une séance"}
      </button>

      {/* Portail vers document.body, comme NewSeanceModal : un ancêtre avec
          un `transform` (animation d'entrée) limiterait sinon le fond
          assombri à une partie de l'écran. Ouvert seulement au clic, donc
          toujours côté navigateur. */}
      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 p-4 max-sm:p-0" onClick={close}>
            <div
              ref={panelRef}
              tabIndex={-1}
              role="dialog"
              aria-modal="true"
              aria-label={view === "exercises" && workout ? `Ajuster la séance ${workout.name}` : "Choisir une séance"}
              onClick={(e) => e.stopPropagation()}
              // Plein écran (presque) sur desktop : hauteur fixe à 90vh pour que
              // les colonnes se partagent l'espace et scrollent chacune de leur
              // côté (Philippe, 2026-09-09).
              className="flex h-[90vh] w-full max-w-6xl flex-col rounded-2xl bg-surface shadow-sm outline-none max-sm:h-dvh max-sm:max-w-none max-sm:rounded-none"
            >
              {/* Titre + précision sur UNE ligne (Philippe, 2026-10-02). */}
              <div className="flex items-center justify-between gap-3 border-b border-line px-6 py-3 max-sm:gap-2 max-sm:px-4 max-sm:py-2.5">
                <div className="flex min-w-0 items-baseline gap-3 max-sm:flex-col max-sm:items-stretch max-sm:gap-0">
                  <h2 className="shrink-0 text-lg font-semibold text-ink max-sm:text-base">
                    {composing ? (
                      <>
                        <span className={phoneTab === "add" ? "max-sm:hidden" : ""}>{picked && view === "template" ? "Séance choisie" : "Ajuster la séance"}</span>
                        {phoneTab === "add" && <span className="sm:hidden">Ajouter un exercice</span>}
                      </>
                    ) : workout ? (
                      "Changer de séance"
                    ) : (
                      "Choisir une séance"
                    )}
                  </h2>
                  <p className="truncate text-sm text-muted max-sm:text-xs">
                    {composing
                      ? `${composing.name} · pour ${patientFirstName} uniquement`
                      : `${weekLabel ?? "Cette semaine"}${workout ? ` · remplace ${workout.name}` : ""}`}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {/* « Créer une séance » (Philippe, 2026-10-02) : mène au
                      formulaire « Nouvelle séance » de Mes séances, déjà ouvert. */}
                  {view === "template" && !picked && (
                    <Link
                      href={`/dashboard/seances?nouvelle=1&retour=/dashboard/patients/${patientId}`}
                      aria-label="Créer une séance"
                      className="mr-1 inline-flex items-center gap-1.5 rounded-full bg-brand-dark px-4 py-1.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand max-sm:h-9 max-sm:w-9 max-sm:justify-center max-sm:p-0"
                    >
                      <Plus className="h-4 w-4" strokeWidth={2} />
                      <span className="max-sm:hidden">Créer une séance</span>
                    </Link>
                  )}
                  {/* Recherche de séance dans l'en-tête : la ligne du dessous
                      reste entière pour les filtres. */}
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
                  {/* Un niveau plus facile / plus difficile (Philippe, 2026-11-02) :
                      la séance de la même condition, phase voisine, à partir de
                      cette semaine. Formulaire à part (hors du formulaire
                      « Enregistrer » plus bas). */}
                  {view === "exercises" && workout && (easierWorkout || harderWorkout) && (
                    <form action={assignAction} onSubmit={close} className="flex items-center gap-1 max-sm:hidden">
                      <input type="hidden" name="patient_id" value={patientId} />
                      {weekStartDate && <input type="hidden" name="week_start_date" value={weekStartDate} />}
                      {easierWorkout && (
                        <button
                          type="submit"
                          name="workout_id"
                          value={easierWorkout.id}
                          title={`Plus facile : « ${easierWorkout.name} »${easierWorkout.stageLabel ? ` (${easierWorkout.stageLabel})` : ""}`}
                          className="inline-flex items-center gap-1 rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-ink hover:bg-app-bg"
                        >
                          <ChevronDown className="h-3.5 w-3.5" strokeWidth={2.25} />
                          Plus facile
                        </button>
                      )}
                      {harderWorkout && (
                        <button
                          type="submit"
                          name="workout_id"
                          value={harderWorkout.id}
                          title={`Plus difficile : « ${harderWorkout.name} »${harderWorkout.stageLabel ? ` (${harderWorkout.stageLabel})` : ""}`}
                          className="inline-flex items-center gap-1 rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-ink hover:bg-app-bg"
                        >
                          <ChevronUp className="h-3.5 w-3.5" strokeWidth={2.25} />
                          Plus difficile
                        </button>
                      )}
                    </form>
                  )}
                  {view === "exercises" && workout && addableWorkouts.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        backToList();
                        setView("template");
                      }}
                      // Bleu plein foncé (Philippe, 2026-10-01 : « encore plus
                      // visible, dans un bleu plus foncé »).
                      className="inline-flex items-center gap-1.5 rounded-full bg-brand-dark px-4 py-1.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand max-sm:hidden"
                    >
                      <Repeat className="h-4 w-4" strokeWidth={2} />
                      Changer de séance
                    </button>
                  )}
                  {view === "template" && workout && !picked && (
                    <button
                      type="button"
                      onClick={() => {
                        resetEdits();
                        setView("exercises");
                      }}
                      className="inline-flex items-center gap-1 rounded-full border border-line px-3 py-1.5 text-xs font-medium text-ink hover:bg-app-bg"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2} />
                      Retour
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      // Téléphone, page « Ajouter un exercice » : retour à la
                      // séance (les ajouts sont gardés), pas fermeture de tout.
                      if (composing && phoneTab === "add" && isPhoneFormat()) setPhoneTab("current");
                      else close();
                    }}
                    aria-label="Fermer"
                    className="rounded-lg p-1.5 text-muted hover:bg-app-bg hover:text-ink max-sm:flex max-sm:h-9 max-sm:w-9 max-sm:items-center max-sm:justify-center max-sm:rounded-full max-sm:bg-app-bg max-sm:text-ink"
                  >
                    <X className="h-5 w-5" strokeWidth={1.75} />
                  </button>
                </div>
              </div>

              {view === "exercises" && workout ? (
                <>
                  <form action={adjustAction} onSubmit={() => track("seance_ajustee_patient")} className="flex min-h-0 flex-1 flex-col">
                    <input type="hidden" name="patient_id" value={patientId} />
                    <input type="hidden" name="workout_id" value={workout.id} />
                    {recId && <input type="hidden" name="rec_id" value={recId} />}
                    {changeHiddenInputs}

                    <SeanceComposer
                      title="Séance actuelle"
                      hint="Cliquez sur un exercice pour le retirer ; dessous, séries × répétitions ou maintien (vide = 3 × 8-12)."
                      exercises={workout.exercises}
                      stage={workout.stage}
                      removeIds={removeIds}
                      setRemoveIds={setRemoveIds}
                      addIds={addIds}
                      setAddIds={setAddIds}
                      addableExercises={addableExercises}
                      bodyParts={bodyParts}
                      patientEquipment={patientEquipment}
                      patientFirstName={patientFirstName}
                      phoneTab={phoneTab}
                      onDoseEdit={() => setDoseEdited(true)}
                      onInfo={setInfo}
                      recentIds={recentIds}
                      extra={
                        recommendations && recommendations.forWorkoutId === workout.id ? (
                          <RecommendedChanges
                            items={recommendations.items}
                            removeIds={removeIds}
                            addIds={addIds}
                            onSwap={(r, on) => {
                              setRemoveIds((s) => {
                                const n = new Set(s);
                                if (on) n.add(r.forId);
                                else n.delete(r.forId);
                                return n;
                              });
                              setAddIds((s) => {
                                const n = new Set(s);
                                if (on) n.add(r.alt.id);
                                else n.delete(r.alt.id);
                                return n;
                              });
                            }}
                          />
                        ) : null
                      }
                    />

                    {phoneAddFooter}
                    <div className={`border-t border-line px-6 py-3 max-sm:px-4 max-sm:pb-[calc(0.75rem+env(safe-area-inset-bottom))] max-sm:pt-2.5 ${phoneTab === "add" ? "max-sm:hidden" : ""}`}>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2 max-sm:w-full">
                          {!confirmRemove && phoneAddButton}
                          {/* Téléphone : « Changer de séance » descend ici (l'en-tête
                              ne garde que le titre et la croix). */}
                          {addableWorkouts.length > 0 && !confirmRemove && (
                            <button
                              type="button"
                              onClick={() => {
                                backToList();
                                setView("template");
                              }}
                              className="hidden flex-1 items-center justify-center gap-1 rounded-full bg-brand-dark px-2 py-2.5 text-[13px] font-semibold text-white shadow-sm max-sm:inline-flex"
                            >
                              <Repeat className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                              Changer de séance
                            </button>
                          )}
                          {recId ? (
                            confirmRemove ? (
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-sm text-ink">Retirer la séance de {patientFirstName} ?</span>
                                {/* Lié par l'attribut `form` au formulaire de retrait
                                    rendu à côté : un <form> ne peut pas être imbriqué
                                    dans un autre <form>, sinon erreur d'hydratation. */}
                                <button type="submit" form={removeFormId} className="rounded-full bg-danger px-3 py-1.5 text-xs font-medium text-white hover:opacity-90">
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
                                className="inline-flex items-center gap-1.5 rounded-full border border-danger/30 px-4 py-1.5 text-sm font-medium text-danger transition-colors hover:bg-danger-soft max-sm:hidden"
                              >
                                <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                                Retirer cette séance
                              </button>
                            )
                          ) : (
                            <span />
                          )}
                          {workout.isPatientCopy && saveAsMineAction && noChanges && !confirmRemove && (
                            <button
                              type="submit"
                              form={saveFormId}
                              title="Copie cette séance dans Mes séances pour l'attribuer à d'autres patients"
                              className="text-sm font-medium text-muted underline underline-offset-2 hover:text-brand max-sm:hidden"
                            >
                              Enregistrer dans Mes séances
                            </button>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 max-sm:w-full">
                          {changeCounters}
                          {/* Téléphone : « Retirer la séance » en petit bouton corbeille, à côté d'Enregistrer. */}
                          {recId && !confirmRemove && (
                            <button
                              type="button"
                              onClick={() => setConfirmRemove(true)}
                              aria-label="Retirer cette séance"
                              className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full border border-danger/30 text-danger max-sm:flex"
                            >
                              <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                            </button>
                          )}
                          <button type="button" onClick={close} className="rounded-full border border-line px-4 py-2 text-sm font-medium text-ink hover:bg-app-bg max-sm:hidden">
                            Annuler
                          </button>
                          <SubmitButton
                            pendingText="Enregistrement…"
                            disabled={noChanges || wouldBeEmpty}
                            className="rounded-full bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-50 max-sm:flex-1 max-sm:py-2.5"
                          >
                            <span className="max-sm:hidden">Enregistrer les modifications</span>
                            <span className="sm:hidden">Enregistrer</span>
                          </SubmitButton>
                        </div>
                      </div>
                    </div>
                  </form>
                  {workout.isPatientCopy && saveAsMineAction && (
                    <form id={saveFormId} action={saveAsMineAction} className="hidden">
                      <input type="hidden" name="template_id" value={workout.id} />
                    </form>
                  )}
                  {recId && (
                    <form id={removeFormId} action={removeAction} onSubmit={close} className="hidden">
                      <input type="hidden" name="patient_id" value={patientId} />
                      <input type="hidden" name="rec_id" value={recId} />
                    </form>
                  )}
                </>
              ) : picked ? (
                // Séance ouverte avant de l'appliquer : on peut retirer /
                // ajouter des exercices et régler les doses POUR CE PATIENT,
                // la durée est sur la même ligne que « Appliquer ».
                <form
                  action={assignAction}
                  onSubmit={() => {
                    if (!noChanges) track("seance_ajustee_patient");
                    close();
                  }}
                  className="flex min-h-0 flex-1 flex-col"
                >
                  <input type="hidden" name="patient_id" value={patientId} />
                  <input type="hidden" name="workout_id" value={picked.id} />
                  {weekStartDate && <input type="hidden" name="week_start_date" value={weekStartDate} />}
                  {weekCount && <input type="hidden" name="week_count" value={weekCount} />}
                  {changeHiddenInputs}

                  <SeanceComposer
                    title={[picked.conditionName, picked.stage ? `Phase ${PHASE_NUMBER[picked.stage as Stage] ?? ""}` : null].filter(Boolean).join(" · ") || "Séance choisie"}
                    hint={`Retirez ou ajoutez des exercices avant d'appliquer : les changements ne valent que pour ${patientFirstName}.`}
                    exercises={picked.exercises}
                    stage={picked.stage}
                    removeIds={removeIds}
                    setRemoveIds={setRemoveIds}
                    addIds={addIds}
                    setAddIds={setAddIds}
                    addableExercises={addableExercises}
                    bodyParts={bodyParts}
                    patientEquipment={patientEquipment}
                    patientFirstName={patientFirstName}
                    phoneTab={phoneTab}
                    onDoseEdit={() => setDoseEdited(true)}
                    onInfo={setInfo}
                    recentIds={recentIds}
                  />

                  {phoneAddFooter}
                  <div className={`space-y-2 border-t border-line px-6 py-3 max-sm:px-4 max-sm:pb-[calc(0.75rem+env(safe-area-inset-bottom))] max-sm:pt-2.5 ${phoneTab === "add" ? "max-sm:hidden" : ""}`}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <DurationPills value={weekCount} onChange={setWeekCount} summary={periodSummary} />
                      <div className="flex items-center gap-2 max-sm:w-full">
                        {changeCounters}
                        <button
                          type="button"
                          onClick={backToList}
                          className="rounded-full border border-line px-4 py-2 text-sm font-medium text-ink hover:bg-app-bg max-sm:hidden"
                        >
                          Retour
                        </button>
                        {phoneAddButton}
                        <button
                          type="submit"
                          disabled={wouldBeEmpty}
                          className="rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50 max-sm:flex-1 max-sm:py-2.5"
                        >
                          Appliquer la séance
                        </button>
                      </div>
                    </div>
                  </div>
                </form>
              ) : (
                // Liste des séances. Proposition 1 : par pathologie + phase,
                // présélectionnées pour ce patient ; proposition 3 : la durée
                // en pastilles en bas et « Appliquer » sur chaque carte — plus
                // d'écran intermédiaire. Toucher la carte l'ouvre pour la
                // modifier avant de l'appliquer.
                <form action={assignAction} onSubmit={close} className="flex min-h-0 flex-1 flex-col">
                  <input type="hidden" name="patient_id" value={patientId} />
                  {weekStartDate && <input type="hidden" name="week_start_date" value={weekStartDate} />}
                  {weekCount && <input type="hidden" name="week_count" value={weekCount} />}

                  {/* Téléphone : la recherche (dans l'en-tête sur ordinateur) passe ici. */}
                  {addableWorkouts.length > 3 && (
                    <label className="relative mx-4 mt-3 block shrink-0 md:hidden">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" strokeWidth={1.75} />
                      <input
                        type="search"
                        value={qTemplate}
                        onChange={(e) => setQTemplate(e.target.value)}
                        placeholder="Rechercher une séance…"
                        className="h-10 w-full rounded-xl border border-line bg-surface pl-9 pr-3 text-base text-ink placeholder:text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-soft"
                      />
                    </label>
                  )}
                  {addableWorkouts.length > 3 && (
                    <div className={`flex flex-wrap items-center gap-2 border-b border-line px-6 py-2 max-sm:px-4 ${templateQuery ? "opacity-40" : ""}`}>
                      <div role="tablist" aria-label="Trier les séances" className="flex shrink-0 rounded-full border border-line bg-app-bg p-0.5 text-xs font-semibold">
                        {(
                          [
                            ["pathology", "Par pathologie"],
                            ["zone", "Par zone"],
                          ] as const
                        ).map(([mode, label]) => (
                          <button
                            key={mode}
                            type="button"
                            role="tab"
                            aria-selected={filterMode === mode}
                            onClick={() => {
                              setQTemplate("");
                              setFilterMode(mode);
                            }}
                            className={`rounded-full px-3 py-1 ${filterMode === mode ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"}`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                      {filterMode === "pathology" ? (
                        <>
                          <select
                            aria-label="Pathologie"
                            value={conditionFilter ?? ""}
                            onChange={(e) => {
                              setQTemplate("");
                              setConditionFilter(e.target.value || null);
                              setStageFilter(null);
                            }}
                            className="min-w-0 max-w-xs flex-1 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-sm text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-soft max-sm:max-w-none"
                          >
                            {conditionOptions.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                                {c.id === patientConditionId ? ` (${patientFirstName})` : ""}
                              </option>
                            ))}
                          </select>
                          <div className="flex shrink-0 items-center gap-1 max-sm:w-full max-sm:overflow-x-auto max-sm:[scrollbar-width:none]">
                            <button
                              type="button"
                              aria-pressed={stageFilter === null}
                              onClick={() => setStageFilter(null)}
                              className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium ${stageFilter === null ? "border-brand bg-brand-soft text-brand" : "border-line bg-surface text-ink hover:bg-app-bg"}`}
                            >
                              Toutes
                            </button>
                            {STAGE_ORDER.map((s) => {
                              const count = stageCounts.get(s) ?? 0;
                              const active = stageFilter === s;
                              return (
                                <button
                                  key={s}
                                  type="button"
                                  aria-pressed={active}
                                  disabled={count === 0}
                                  title={`${count} séance${count > 1 ? "s" : ""}${s === patientStage ? ` · phase déclarée par ${patientFirstName}` : ""}`}
                                  onClick={() => setStageFilter(s)}
                                  className={`relative shrink-0 rounded-full border px-3 py-1 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-40 ${
                                    active ? "border-brand bg-brand-soft text-brand" : "border-line bg-surface text-ink hover:bg-app-bg"
                                  }`}
                                >
                                  Phase {PHASE_NUMBER[s]}
                                  {s === patientStage && <span aria-hidden className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-ok" />}
                                </button>
                              );
                            })}
                          </div>
                        </>
                      ) : (
                        // Une case par zone, toutes de même largeur sur une seule
                        // ligne ; sur téléphone, la ligne défile.
                        <div
                          style={{ gridTemplateColumns: `repeat(${bodyParts.length}, minmax(0, 1fr))` }}
                          className="flex min-w-0 flex-1 basis-full gap-1.5 overflow-x-auto max-sm:-mx-4 max-sm:gap-2 max-sm:px-4 max-sm:[scrollbar-width:none] md:grid md:overflow-visible"
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
                                className={`flex shrink-0 items-center gap-1.5 rounded-xl border px-1.5 py-1 text-left text-[11px] font-medium leading-tight transition-colors max-sm:w-[5.5rem] max-sm:flex-col max-sm:gap-1 max-sm:rounded-2xl max-sm:py-2 max-sm:text-center max-sm:text-xs md:min-w-0 ${
                                  active ? "border-brand bg-brand-soft text-brand" : "border-line bg-surface text-ink hover:bg-app-bg"
                                }`}
                              >
                                <BodyPartIllustration slug={bp.slug} className="h-7 w-7 shrink-0 max-sm:h-11 max-sm:w-11" active={active} />
                                <span className="line-clamp-2 whitespace-nowrap max-sm:whitespace-normal md:whitespace-normal">{bp.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                  <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4 max-sm:px-4 max-sm:py-3">
                    {addableWorkouts.length === 0 ? (
                      <p className="text-sm text-muted">Aucune séance disponible — créez-en une dans Mes séances.</p>
                    ) : filteredWorkouts.length === 0 ? (
                      <p className="text-sm text-muted">
                        {templateQuery ? `Aucune séance ne correspond à « ${qTemplate} ».` : "Aucune séance ici pour l'instant."}
                      </p>
                    ) : (
                      // Blocs (dessin au-dessus du nom) — 2 par rangée sur
                      // téléphone, 3 sur ordinateur (Philippe, 2026-10-12).
                      <ul className="grid grid-cols-2 gap-2 md:grid-cols-3 md:gap-3">
                        {filteredWorkouts.map((w, i) => {
                          // En-tête de groupe : la phase en mode pathologie, la pathologie sinon.
                          const groupOf = (x: AddableWorkout) =>
                            filterMode === "pathology" && !templateQuery ? (x.stageLabel ?? "Sans phase") : (x.conditionName ?? "Sans condition");
                          const newGroup = i === 0 || groupOf(filteredWorkouts[i - 1]) !== groupOf(w);
                          return (
                            <li key={w.id} className="contents">
                              {newGroup && (
                                <p className={`col-span-full text-xs font-semibold uppercase tracking-wide text-muted ${i === 0 ? "" : "mt-2"}`}>{groupOf(w)}</p>
                              )}
                              <div className="flex h-full flex-col items-stretch gap-2 rounded-xl border border-line bg-surface p-2.5 transition-colors hover:border-brand/40 md:p-3">
                                <button
                                  type="button"
                                  onClick={() => pick(w.id)}
                                  title="Voir et modifier les exercices avant d'appliquer"
                                  className="flex min-w-0 flex-1 flex-col items-stretch gap-1.5 text-center"
                                >
                                  <span className="flex h-16 w-full shrink-0 items-center justify-center overflow-hidden rounded-lg bg-app-bg md:h-24">
                                    {w.exerciseNames[0] ? (
                                      <ExerciseIllustration name={w.exerciseNames[0]} animate={false} className="h-14 w-full text-brand md:h-20" />
                                    ) : (
                                      <Dumbbell className="h-5 w-5 text-muted" strokeWidth={1.75} />
                                    )}
                                  </span>
                                  <span className="min-w-0 flex-1">
                                    <span className="line-clamp-2 min-h-[2.5em] text-[13px] font-semibold leading-tight text-ink md:text-sm md:leading-tight">{w.name}</span>
                                    <span className="mt-0.5 block truncate text-[11px] text-muted md:text-xs">
                                      {[
                                        w.stage ? `Phase ${PHASE_NUMBER[w.stage as Stage] ?? "?"}` : null,
                                        w.durationMinutes != null ? `${w.durationMinutes} min` : null,
                                        w.exerciseNames.length > 0 ? `${w.exerciseNames.length} exo${w.exerciseNames.length > 1 ? "s" : ""}` : null,
                                      ]
                                        .filter(Boolean)
                                        .join(" · ")}
                                    </span>
                                  </span>
                                </button>
                                <div className="flex shrink-0 items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => pick(w.id)}
                                    className="flex-1 rounded-full border border-line px-2 py-1.5 text-xs font-medium text-ink hover:bg-app-bg"
                                  >
                                    Modifier
                                  </button>
                                  <button
                                    type="submit"
                                    name="workout_id"
                                    value={w.id}
                                    className="flex-1 rounded-full bg-brand px-2 py-1.5 text-xs font-semibold text-white hover:bg-brand-dark"
                                  >
                                    Appliquer
                                  </button>
                                </div>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                  <div className="border-t border-line px-6 py-2.5 max-sm:px-4 max-sm:pb-[calc(0.6rem+env(safe-area-inset-bottom))]">
                    <DurationPills value={weekCount} onChange={setWeekCount} summary={periodSummary} />
                  </div>
                </form>
              )}
            </div>
          </div>,
          document.body,
        )}
      {info && <ExerciseInfoModal exercise={info} onClose={() => setInfo(null)} />}
    </>
  );
}

// Pastille orange « il lui manque : … » — seulement si le patient n'a pas le
// matériel qu'exige l'exercice (Philippe, 2026-10-12). Un signal, pas un blocage.
function MissingEquipmentPill({ required, owned, firstName }: { required?: string[] | null; owned: string[] | null; firstName: string }) {
  const missing = missingEquipment(required, owned);
  if (missing.length === 0) return null;
  const label = equipmentListLabel(missing);
  return (
    <span
      title={`Matériel que ${firstName} n'a pas déclaré : ${label}`}
      className="max-w-full shrink-0 truncate rounded-full bg-warn-soft px-1.5 py-0.5 text-[10px] font-medium text-warn no-underline"
    >
      {label}
    </span>
  );
}
