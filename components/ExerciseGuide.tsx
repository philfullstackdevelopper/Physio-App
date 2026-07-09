"use client";

// =============================================================================
// ExerciseGuide — the "am I doing this right?" card, kept on screen DURING the
// exercise.
//
// Until now the instructions were shown on the intro and demo screens, then
// vanished the moment the camera started — exactly when the patient is actually
// performing the movement and most needs them. This card stays put.
//
// It also states plainly what the camera is and is not checking for this
// exercise. A patient who believes the app is watching his back alignment, when
// it is only counting repetitions, is worse off than one who was never told.
// =============================================================================

import { parseSteps } from "@/lib/exercise/steps";
import { suitabilityFor, type CameraSuitability } from "@/lib/exercise/cameraSuitability";

/** What the camera honestly does for this exercise, in the patient's words. */
const CAMERA_NOTE: Record<CameraSuitability, string> = {
  form: "La caméra suit votre position et vérifie l'amplitude de votre mouvement.",
  count:
    "La caméra compte vos répétitions. Elle ne juge pas votre posture — suivez les consignes ci-dessus.",
  none: "La caméra sert uniquement de miroir : aucune analyse automatique sur cet exercice.",
};

export default function ExerciseGuide({
  name,
  instructions,
  goalText,
  defaultOpen = false,
}: {
  name: string;
  instructions: string | null;
  /** e.g. "3 séries × 10 répétitions" or "3 × 30 s de maintien". */
  goalText?: string;
  /** Open on first render — used the first time the patient meets an exercise. */
  defaultOpen?: boolean;
}) {
  const steps = parseSteps(instructions);
  const suitability = suitabilityFor(name);

  return (
    <details
      open={defaultOpen}
      className="mt-3 rounded-xl border border-slate-200 bg-white [&_summary::-webkit-details-marker]:hidden"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3">
        <span className="text-sm font-medium text-slate-800">Comment faire cet exercice ?</span>
        <span className="text-xs text-slate-400">Afficher / masquer</span>
      </summary>

      <div className="border-t border-slate-100 px-4 py-3">
        {goalText && (
          <p className="text-sm text-slate-700">
            Objectif : <span className="font-semibold">{goalText}</span>
          </p>
        )}

        {steps.length > 0 ? (
          <ol className={`space-y-2 ${goalText ? "mt-3" : ""}`}>
            {steps.map((s, i) => (
              <li key={i} className="flex gap-2 text-sm text-slate-700">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-600 text-xs font-semibold text-white">
                  {i + 1}
                </span>
                <span>{s}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className={`text-sm text-slate-500 ${goalText ? "mt-2" : ""}`}>
            Aucune consigne détaillée pour cet exercice. Allez-y doucement, sans forcer.
          </p>
        )}

        <p className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-500">
          🎥 {CAMERA_NOTE[suitability]}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Une douleur vive ? Arrêtez-vous et parlez-en à votre praticien.
        </p>
      </div>
    </details>
  );
}
