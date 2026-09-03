"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Plus, Search, X } from "lucide-react";
import { CATEGORY_ORDER, categoryFor, type Category } from "@/lib/exercise/category";
import SubmitButton from "@/components/SubmitButton";

export type ModalExercise = { id: string; name: string };

export default function AdjustWorkoutModal({
  patientId,
  patientFirstName,
  workout,
  addable,
  action,
}: {
  patientId: string;
  patientFirstName: string;
  workout: { id: string; name: string; exercises: ModalExercise[] } | null;
  addable: ModalExercise[];
  action: (formData: FormData) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [removeIds, setRemoveIds] = useState<Set<string>>(new Set());
  const [addIds, setAddIds] = useState<Set<string>>(new Set());
  const [q, setQ] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const close = () => {
    setOpen(false);
    setRemoveIds(new Set());
    setAddIds(new Set());
    setQ("");
  };

  const groups = useMemo(() => {
    const m = new Map<Category, ModalExercise[]>();
    for (const ex of addable) (m.get(categoryFor(ex.name)) ?? m.set(categoryFor(ex.name), []).get(categoryFor(ex.name))!).push(ex);
    return m;
  }, [addable]);
  const query = q.trim().toLowerCase();

  const toggle = (set: Set<string>, id: string) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  };

  const removed = removeIds.size;
  const added = addIds.size;
  const noChanges = removed === 0 && added === 0;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={!workout}
        title={workout ? undefined : "Ajoutez d'abord une séance recommandée"}
        className="inline-flex items-center rounded-full bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
      >
        Ajuster la séance
      </button>

      {open && workout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 p-4" onClick={close}>
          <div
            ref={panelRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label={`Ajuster la séance ${workout.name}`}
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-2xl bg-surface shadow-sm outline-none"
          >
            <div className="flex items-start justify-between border-b border-line px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-ink">Ajuster la séance</h2>
                <p className="mt-0.5 text-sm text-muted">{workout.name} — les modifications ne concernent que {patientFirstName}.</p>
              </div>
              <button type="button" onClick={close} aria-label="Fermer" className="rounded-lg p-1.5 text-muted hover:bg-app-bg hover:text-ink">
                <X className="h-5 w-5" strokeWidth={1.75} />
              </button>
            </div>

            <form action={action} className="flex min-h-0 flex-1 flex-col">
              <input type="hidden" name="patient_id" value={patientId} />
              <input type="hidden" name="workout_id" value={workout.id} />
              {[...removeIds].map((id) => <input key={`r-${id}`} type="hidden" name="remove_ids" value={id} />)}
              {[...addIds].map((id) => <input key={`a-${id}`} type="hidden" name="add_ids" value={id} />)}

              <div className="grid min-h-0 flex-1 gap-6 overflow-y-auto p-6 md:grid-cols-2">
                <section>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">Exercices actuels</p>
                  <ul className="mt-2 space-y-1.5">
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
                  <div className="mt-2 max-h-72 space-y-3 overflow-y-auto pr-1 md:max-h-none md:flex-1">
                    {CATEGORY_ORDER.map((cat) => {
                      const list = (groups.get(cat) ?? []).filter((ex) => !query || ex.name.toLowerCase().includes(query));
                      if (list.length === 0) return null;
                      return (
                        <div key={cat}>
                          <p className="sticky top-0 bg-surface py-1 text-[11px] font-semibold uppercase tracking-wide text-muted">{cat}</p>
                          <ul className="space-y-1">
                            {list.map((ex) => {
                              const marked = addIds.has(ex.id);
                              return (
                                <li key={ex.id}>
                                  <button
                                    type="button"
                                    onClick={() => setAddIds((s) => toggle(s, ex.id))}
                                    className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                                      marked ? "border-ok-soft bg-ok-soft text-ok" : "border-line bg-surface text-ink hover:bg-app-bg"
                                    }`}
                                  >
                                    <span className="flex-1 truncate">{ex.name}</span>
                                    {marked ? <span className="text-xs font-medium">À ajouter</span> : <Plus className="h-4 w-4 text-brand" strokeWidth={2} />}
                                  </button>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
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
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={close} className="rounded-full border border-line px-4 py-2 text-sm font-medium text-ink hover:bg-app-bg">Annuler</button>
                  <SubmitButton
                    pendingText="Enregistrement…"
                    disabled={noChanges || undefined}
                    className="rounded-full bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-50"
                  >
                    Enregistrer les modifications
                  </SubmitButton>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
