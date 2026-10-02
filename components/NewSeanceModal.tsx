"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
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
}) {
  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  // Ordre de clic conservé : c'est l'ordre des exercices dans la séance.
  const [selected, setSelected] = useState<string[]>([]);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 p-4" onClick={onClose}>
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Nouvelle séance"
        onClick={(e) => e.stopPropagation()}
        className="flex h-[90vh] w-full max-w-6xl flex-col rounded-2xl bg-surface shadow-sm outline-none"
      >
        <form action={createSeance} className="flex min-h-0 flex-1 flex-col">
          {selected.map((id) => (
            <input key={id} type="hidden" name="exercise_ids" value={id} />
          ))}
          {returnTo && <input type="hidden" name="return_to" value={returnTo} />}

          {/* Titre + nom, condition, phase sur UNE barre (Philippe, 2026-10-02 :
              le haut prenait près de la moitié de la fenêtre, alors que le
              plus important est la composition en dessous). */}
          <div className="flex flex-wrap items-center gap-2 border-b border-line px-6 py-3 md:flex-nowrap">
            <h2 className="mr-2 shrink-0 text-lg font-semibold text-ink">Nouvelle séance</h2>
            <input name="name" required placeholder="Nom de la séance" aria-label="Nom de la séance" className={`min-w-0 flex-[2] ${fieldClass}`} />
            <select name="condition_id" required defaultValue="" aria-label="Condition" className={`min-w-0 flex-1 ${fieldClass}`}>
              <option value="" disabled>
                Condition…
              </option>
              {conditions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <select name="stage" defaultValue="" aria-label="Phase" className={`min-w-0 flex-1 ${fieldClass}`}>
              <option value="">Phase (toutes)</option>
              {stages.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <button type="button" onClick={onClose} aria-label="Fermer" className="ml-1 shrink-0 rounded-lg p-1.5 text-muted hover:bg-app-bg hover:text-ink">
              <X className="h-5 w-5" strokeWidth={1.75} />
            </button>
          </div>

          <div className="grid min-h-0 flex-1 gap-5 overflow-y-auto px-6 py-4 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] md:overflow-hidden">
            <section className="flex min-h-0 flex-col rounded-xl border border-line bg-app-bg p-4">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">Exercices de la séance</p>
                <span className="text-xs text-muted">
                  {selected.length} exercice{selected.length > 1 ? "s" : ""}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted">
                {selected.length ? "Cliquez sur un exercice pour le retirer." : "Choisissez des exercices dans la bibliothèque, à droite."}
              </p>
              <ul className="mt-3 space-y-1.5 md:min-h-0 md:flex-1 md:overflow-y-auto md:pr-1">
                {selected.map((id, i) => {
                  const ex = byId.get(id);
                  if (!ex) return null;
                  return (
                    <li key={id}>
                      <button
                        type="button"
                        onClick={() => toggle(id)}
                        className="group flex w-full items-center gap-2.5 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-left text-sm text-ink transition-colors hover:border-danger/30"
                      >
                        <span className="w-4 shrink-0 text-xs text-muted">{i + 1}</span>
                        <ExerciseIllustration name={ex.name} animate={false} className="h-8 w-8 shrink-0 text-brand" />
                        <span className="flex-1 truncate">{ex.name}</span>
                        <X className="h-4 w-4 shrink-0 text-muted group-hover:text-danger" strokeWidth={2} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>

            <ExerciseLibraryPicker exercises={exercises} bodyParts={bodyParts} selectedIds={new Set(selected)} onToggle={toggle} />
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-line px-6 py-3">
            <button type="button" onClick={onClose} className="rounded-full border border-line px-4 py-2 text-sm font-medium text-ink hover:bg-app-bg">
              Annuler
            </button>
            <SubmitButton
              pendingText="Création…"
              disabled={selected.length === 0}
              className="rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
            >
              Créer la séance
            </SubmitButton>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
