"use client";

// Séries × répétitions (ou maintien en secondes) d'un exercice d'une séance,
// réglables par le kiné (Philippe, 2026-11-02, inspiré des « programmes
// modèles » de Fullphysio). Vide = la règle habituelle (3 × 8-12), affichée
// en grisé. Champs nommés dose_sets_<id>, dose_reps_<id>, dose_hold_<id>
// (lib/exercise/doseForm.ts) ; `form` les rattache au bon formulaire même
// rendus hors de lui.

import { useTranslations } from "next-intl";
import type { ExerciseDose } from "@/lib/exercise/prescription";

export default function DoseInputs({
  exerciseId,
  exerciseName,
  dose,
  form,
  onEdit,
}: {
  exerciseId: string;
  exerciseName: string;
  dose?: ExerciseDose | null;
  form?: string;
  /** Prévient la fenêtre qu'une dose a changé (active « Enregistrer »). */
  onEdit?: () => void;
}) {
  const t = useTranslations("exercise.dose");
  const field =
    "w-full min-w-0 rounded-md border border-line bg-surface px-1 py-0.5 text-center text-xs tabular-nums text-ink placeholder:text-muted/70 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-soft";
  // Un clic dans les champs ne doit pas déclencher le bouton de la carte (retirer l'exercice).
  const stop = (e: React.SyntheticEvent) => e.stopPropagation();
  return (
    <div className="mt-1 grid grid-cols-[1fr_auto_1fr_1fr] items-center gap-1 text-[11px] text-muted" onClick={stop} onKeyDown={stop} onInput={() => onEdit?.()}>
      <input
        form={form}
        type="number"
        inputMode="numeric"
        name={`dose_sets_${exerciseId}`}
        min={1}
        max={10}
        defaultValue={dose?.sets ?? ""}
        placeholder="3"
        aria-label={t("setsAria", { name: exerciseName })}
        title={t("setsTitle")}
        className={field}
      />
      <span aria-hidden>×</span>
      <input
        form={form}
        type="number"
        inputMode="numeric"
        name={`dose_reps_${exerciseId}`}
        min={1}
        max={100}
        defaultValue={dose?.reps ?? ""}
        placeholder="8-12"
        aria-label={t("repsAria", { name: exerciseName })}
        title={t("repsTitle")}
        className={field}
      />
      <input
        form={form}
        type="number"
        inputMode="numeric"
        name={`dose_hold_${exerciseId}`}
        min={1}
        max={600}
        defaultValue={dose?.holdSeconds ?? ""}
        placeholder={t("holdPlaceholder")}
        aria-label={t("holdAria", { name: exerciseName })}
        title={t("holdTitle")}
        className={field}
      />
    </div>
  );
}
