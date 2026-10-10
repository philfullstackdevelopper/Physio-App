"use client";

import { useState } from "react";

// Saves on change instead of a separate « Changer » button. A first condition
// is saved straight away; replacing an existing one asks for an inline
// confirmation first (same two-step idiom as SeancesTabs' DeleteSeanceButton),
// because assignCondition clears the patient's recommended séances.
// Must be rendered inside the assignCondition <form>.
export default function ConditionSelect({
  currentConditionId,
  conditions,
}: {
  currentConditionId: string | null;
  conditions: { id: string; name: string }[];
}) {
  const [value, setValue] = useState(currentConditionId ?? "");
  const confirming = currentConditionId !== null && value !== currentConditionId;

  return (
    <>
      <select
        name="condition_id"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          if (!currentConditionId) e.target.form?.requestSubmit();
        }}
        // w-full + min-w-0 : sans ça le <select> prend la largeur de son option la
        // plus longue et déborde de la bulle « Condition à renseigner ».
        className="w-full min-w-0 rounded-lg border border-line bg-surface px-2 py-1.5 text-sm text-ink"
      >
        <option value="" disabled={!currentConditionId}>Choisir une condition…</option>
        {conditions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      {confirming && (
        <span className="flex items-center gap-1">
          <span className="text-xs text-muted">Les séances recommandées seront retirées.</span>
          <button type="submit" className="rounded-md bg-danger px-2 py-1 text-xs font-medium text-white transition hover:opacity-90">
            Confirmer
          </button>
          <button
            type="button"
            onClick={() => setValue(currentConditionId)}
            className="rounded-md px-2 py-1 text-xs font-medium text-muted transition hover:text-ink"
          >
            Annuler
          </button>
        </span>
      )}
    </>
  );
}
