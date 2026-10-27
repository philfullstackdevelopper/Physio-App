"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { Plus, X } from "lucide-react";
import { isPhoneFormat } from "@/lib/phoneFormat";
import { type BodyPart } from "@/lib/exercise/category";
import { type InjuryStage } from "@/lib/exercise/prescription";
import SubmitButton from "@/components/SubmitButton";
import ExerciseIllustration from "@/components/ExerciseIllustration";
import ExerciseLibraryPicker, { type PickerExercise } from "@/components/ExerciseLibraryPicker";

// « Nouvelle séance » en fenêtre (Philippe, 2026-10-02) : même disposition que
// « Ajuster la séance » d'un patient (AdjustWorkoutModal) — à gauche les
// exercices ajoutés à la séance, à droite la bibliothèque où les choisir
// (ExerciseLibraryPicker, partagé). Nom, condition et phase en une ligne en
// haut. Remplace l'ancien petit formulaire « Créer et composer », qui créait
// une séance vide puis renvoyait vers l'éditeur pour y ajouter les exercices.
export default function NewSeanceModal({
  onClose,
  conditions,
  stages,
  exercises,
  bodyParts,
  createSeance,
  returnTo,
  edit,
}: {
  onClose: () => void;
  conditions: { id: string; name: string }[];
  stages: [InjuryStage, string][];
  exercises: PickerExercise[];
  bodyParts: BodyPart[];
  createSeance: (formData: FormData) => void;
  /** Fiche patient d'où vient le kiné (bouton « Créer une séance ») : il y
   *  retourne après la création pour attribuer la nouvelle séance. */
  returnTo?: string;
  /** Mode « Modifier la séance » (Philippe, 2026-10-12 : même fenêtre que
   *  « Nouvelle séance » / « Ajuster ») : champs et exercices pré-remplis,
   *  `createSeance` reçoit alors l'action d'enregistrement, et la fenêtre
   *  propose aussi la suppression. */
  edit?: {
    workoutId: string;
    name: string;
    conditionId: string | null;
    stage: string | null;
    durationMinutes: number | null;
    timesPerWeek: number | null;
    exerciseIds: string[];
    deleteAction: (formData: FormData) => void;
    saved?: boolean;
    error?: string | null;
  };
}) {
  const title = edit ? "Modifier la séance" : "Nouvelle séance";
  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  // Ordre de clic conservé : c'est l'ordre des exercices dans la séance.
  const [selected, setSelected] = useState<string[]>(edit?.exerciseIds ?? []);
  // Téléphone (Philippe, 2026-10-12 : même optimisation que « Ajuster la
  // séance », plus d'espace perdu en haut) : la fenêtre prend tout l'écran et
  // se déroule en deux temps — d'abord le nom, la condition, la phase et les
  // exercices choisis (blocs 2 par rangée) ; « Ajouter un exercice » ouvre la
  // bibliothèque sur sa propre page ("add"), champs masqués pour lui laisser
  // toute la hauteur.
  const [phoneTab, setPhoneTab] = useState<"current" | "add">("current");
  const hideOnAdd = phoneTab === "add" ? "max-sm:hidden" : "";
  const panelRef = useRef<HTMLDivElement>(null);
  const byId = new Map(exercises.map((e) => [e.id, e]));
  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  useEffect(() => {
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  const fieldClass =
    "rounded-lg border border-line bg-surface px-3 py-1.5 text-sm text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-soft";

  // Rendu dans document.body (portail) : la page « Mes séances » garde un
  // `transform` sur un ancêtre (animation d'entrée fadeInUp, fill-mode both),
  // ce qui limitait le fond assombri `fixed inset-0` à cet ancêtre au lieu de
  // tout l'écran (Philippe, 2026-10-02). Même cause et même remède que
  // components/PatientActionsMenu.tsx.
  // Arrivée via ?nouvelle=1 : la fenêtre est ouverte dès le rendu serveur,
  // où document n'existe pas — on attend d'être dans le navigateur.
  if (!isClient) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 p-4 max-sm:p-0" onClick={onClose}>
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="flex h-[90vh] w-full max-w-6xl flex-col rounded-2xl bg-surface shadow-sm outline-none max-sm:h-dvh max-sm:max-w-none max-sm:rounded-none"
      >
        <form action={createSeance} className="flex min-h-0 flex-1 flex-col">
          {selected.map((id) => (
            <input key={id} type="hidden" name="exercise_ids" value={id} />
          ))}
          {returnTo && <input type="hidden" name="return_to" value={returnTo} />}
          {edit && <input type="hidden" name="workout_id" value={edit.workoutId} />}

          {/* Titre + nom, condition, phase sur UNE barre (Philippe, 2026-10-02 :
              le haut prenait près de la moitié de la fenêtre, alors que le
              plus important est la composition en dessous). */}
          <div className="flex flex-wrap items-center gap-2 border-b border-line px-6 py-3 max-sm:grid max-sm:grid-cols-2 max-sm:px-4 max-sm:py-2.5 md:flex-nowrap">
            <h2 className="mr-2 shrink-0 text-lg font-semibold text-ink max-sm:col-start-1 max-sm:row-start-1 max-sm:mr-0 max-sm:text-base">
              <span className={hideOnAdd}>{title}</span>
              {phoneTab === "add" && <span className="sm:hidden">Ajouter un exercice</span>}
            </h2>
            <input name="name" required defaultValue={edit?.name} placeholder="Nom de la séance" aria-label="Nom de la séance" className={`min-w-0 flex-[2] max-sm:col-span-2 max-sm:h-10 max-sm:text-base ${hideOnAdd} ${fieldClass}`} />
            <select name="condition_id" required defaultValue={edit?.conditionId ?? ""} aria-label="Condition" className={`min-w-0 flex-1 max-sm:h-10 ${hideOnAdd} ${fieldClass}`}>
              <option value="" disabled>
                Condition…
              </option>
              {conditions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <select name="stage" defaultValue={edit?.stage ?? ""} aria-label="Phase" className={`min-w-0 flex-1 max-sm:h-10 ${hideOnAdd} ${fieldClass}`}>
              <option value="">Phase (toutes)</option>
              {stages.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            {edit && (
              <>
                <label className={`flex shrink-0 items-center gap-1.5 text-xs text-muted ${hideOnAdd}`}>
                  Durée
                  <input type="number" name="duration_minutes" min={1} max={90} defaultValue={edit.durationMinutes ?? 10} aria-label="Durée en minutes" className={`w-16 max-sm:h-10 max-sm:flex-1 ${fieldClass}`} />
                  min
                </label>
                <label className={`flex shrink-0 items-center gap-1.5 text-xs text-muted ${hideOnAdd}`}>
                  <input type="number" name="times_per_week" min={1} max={14} defaultValue={edit.timesPerWeek ?? 3} aria-label="Fois par semaine" className={`w-14 max-sm:h-10 max-sm:flex-1 ${fieldClass}`} />
                  fois / sem.
                </label>
              </>
            )}
            <button
              type="button"
              onClick={() => {
                // Téléphone, page « Ajouter un exercice » : retour à la séance
                // en cours de composition, pas fermeture de tout.
                if (phoneTab === "add" && isPhoneFormat()) setPhoneTab("current");
                else onClose();
              }}
              aria-label="Fermer"
              className="ml-1 shrink-0 rounded-lg p-1.5 text-muted hover:bg-app-bg hover:text-ink max-sm:col-start-2 max-sm:row-start-1 max-sm:ml-0 max-sm:flex max-sm:h-9 max-sm:w-9 max-sm:items-center max-sm:justify-center max-sm:justify-self-end max-sm:rounded-full max-sm:bg-app-bg max-sm:text-ink"
            >
              <X className="h-5 w-5" strokeWidth={1.75} />
            </button>
          </div>

          {edit?.error && <p className={`mx-6 mt-3 rounded-xl bg-danger-soft px-4 py-2 text-sm text-danger max-sm:mx-4 ${hideOnAdd}`}>{edit.error}</p>}
          {edit?.saved && !edit.error && (
            <p className={`mx-6 mt-3 rounded-xl bg-ok-soft px-4 py-2 text-sm font-medium text-ok max-sm:mx-4 ${hideOnAdd}`}>Séance enregistrée</p>
          )}
          <div className="grid min-h-0 flex-1 gap-5 overflow-y-auto px-6 py-4 max-sm:block max-sm:overflow-hidden max-sm:px-4 max-sm:py-3 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] md:overflow-hidden">
            <section className={`flex min-h-0 flex-col rounded-xl border border-line bg-app-bg p-4 max-sm:h-full max-sm:border-0 max-sm:bg-transparent max-sm:p-0 ${hideOnAdd}`}>
              {/* Titre « Exercices de la séance » retiré (Philippe, 2026-10-12) :
                  il prenait de la place sans rien apprendre. */}
              <p className="text-xs text-muted">
                <span className="max-sm:hidden">
                  {selected.length ? "Cliquez sur un exercice pour le retirer." : "Choisissez des exercices dans la bibliothèque, à droite."}
                </span>
                <span className="sm:hidden">
                  {selected.length ? "Touchez un exercice pour le retirer." : "Touchez « Ajouter un exercice » pour composer la séance."}
                </span>
              </p>
              <ul className="mt-3 grid grid-cols-2 content-start gap-2 max-sm:mt-2 max-sm:min-h-0 max-sm:flex-1 max-sm:overflow-y-auto md:min-h-0 md:flex-1 md:overflow-y-auto md:pr-1">
                {selected.map((id, i) => {
                  const ex = byId.get(id);
                  if (!ex) return null;
                  return (
                    <li key={id}>
                      <button
                        type="button"
                        onClick={() => toggle(id)}
                        className="group relative flex h-full w-full flex-col items-center gap-1.5 rounded-xl border border-line bg-surface p-2.5 text-center text-sm text-ink transition-colors hover:border-danger/30"
                      >
                        <span className="absolute left-2 top-2 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-app-bg text-xs font-semibold text-muted">{i + 1}</span>
                        <ExerciseIllustration name={ex.name} className="h-16 w-full shrink-0 text-brand md:h-20" />
                        <span className="line-clamp-2 min-h-[2.5em] text-[13px] leading-tight">{ex.name}</span>
                        <X className="absolute right-2 top-2 h-4 w-4 shrink-0 text-muted group-hover:text-danger" strokeWidth={2} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>

            <div className={`sm:contents ${phoneTab === "add" ? "max-sm:grid max-sm:h-full max-sm:grid-cols-[minmax(0,1fr)] max-sm:grid-rows-[minmax(0,1fr)]" : "max-sm:hidden"}`}>
              <ExerciseLibraryPicker exercises={exercises} bodyParts={bodyParts} selectedIds={new Set(selected)} onToggle={toggle} />
            </div>
          </div>

          {/* Téléphone, page « Ajouter un exercice » : un seul bouton. */}
          {phoneTab === "add" && (
            <div className="hidden border-t border-line px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-2.5 max-sm:block">
              <button type="button" onClick={() => setPhoneTab("current")} className="w-full rounded-full bg-brand py-2.5 text-sm font-semibold text-white">
                {selected.length > 0 ? `Terminé · ${selected.length} exercice${selected.length > 1 ? "s" : ""}` : "Retour à la séance"}
              </button>
            </div>
          )}

          <div className={`flex items-center justify-end gap-2 border-t border-line px-6 py-3 max-sm:px-4 max-sm:pb-[calc(0.75rem+env(safe-area-inset-bottom))] max-sm:pt-2.5 ${hideOnAdd}`}>
            <button
              type="button"
              onClick={() => setPhoneTab("add")}
              className="hidden flex-1 items-center justify-center gap-1 rounded-full border border-brand/40 bg-brand-soft px-2 py-2.5 text-[13px] font-semibold text-brand max-sm:inline-flex"
            >
              <Plus className="h-4 w-4 shrink-0" strokeWidth={2} />
              Ajouter un exercice
            </button>
            {edit && (
              // formAction : ce bouton envoie le même formulaire à l'action de
              // suppression (un formulaire ne peut pas en contenir un autre).
              <button
                type="submit"
                formAction={edit.deleteAction}
                formNoValidate
                onClick={(e) => {
                  if (!window.confirm("Supprimer définitivement cette séance ?")) e.preventDefault();
                }}
                className="mr-auto rounded-full px-3 py-2 text-sm font-medium text-danger hover:bg-danger-soft max-sm:hidden"
              >
                Supprimer cette séance
              </button>
            )}
            <button type="button" onClick={onClose} className="rounded-full border border-line px-4 py-2 text-sm font-medium text-ink hover:bg-app-bg max-sm:hidden">
              {edit ? "Fermer" : "Annuler"}
            </button>
            <SubmitButton
              pendingText={edit ? "Enregistrement…" : "Création…"}
              disabled={selected.length === 0}
              className="rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50 max-sm:flex-1 max-sm:px-2 max-sm:py-2.5 max-sm:text-[13px]"
            >
              {edit ? "Enregistrer" : "Créer la séance"}
            </SubmitButton>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
