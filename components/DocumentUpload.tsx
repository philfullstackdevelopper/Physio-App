"use client";

// =============================================================================
// DocumentUpload — patient uploads medical documents (scans, MRI, reports).
// -----------------------------------------------------------------------------
// Files go DIRECTLY to a private Supabase Storage bucket (not through the Next
// server), scoped to the patient's own folder by RLS. A metadata row is written
// to `patient_documents` so we can list/display original file names.
// =============================================================================

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const BUCKET = "patient-documents";
const MAX_MB = 20;

export interface DocMeta {
  id: string;
  file_name: string;
  storage_path: string;
  uploaded_at: string;
}

export default function DocumentUpload({
  patientId,
  initialDocs,
}: {
  patientId: string;
  initialDocs: DocMeta[];
}) {
  const supabase = createClient();
  const [docs, setDocs] = useState<DocMeta[]>(initialDocs);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = async (file: File) => {
    setError(null);
    if (file.size > MAX_MB * 1024 * 1024) {
      setError(`Fichier trop volumineux (max ${MAX_MB} Mo).`);
      return;
    }
    setBusy(true);
    try {
      // Unique path under the patient's own folder (satisfies storage RLS).
      const safe = file.name.replace(/[^\w.\-]+/g, "_");
      const path = `${patientId}/${Date.now()}_${safe}`;

      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file);
      if (upErr) throw upErr;

      const { data, error: metaErr } = await supabase
        .from("patient_documents")
        .insert({ patient_id: patientId, storage_path: path, file_name: file.name })
        .select("id, file_name, storage_path, uploaded_at")
        .single();
      if (metaErr) throw metaErr;

      setDocs((d) => [data as DocMeta, ...d]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Échec de l'envoi du fichier.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (doc: DocMeta) => {
    setError(null);
    setBusy(true);
    try {
      await supabase.storage.from(BUCKET).remove([doc.storage_path]);
      await supabase.from("patient_documents").delete().eq("id", doc.id);
      setDocs((d) => d.filter((x) => x.id !== doc.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Échec de la suppression.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <p className="text-sm font-medium text-slate-700">Documents médicaux (optionnel)</p>
      <p className="mt-0.5 text-xs text-slate-500">
        Radios, IRM, comptes-rendus. Stockés de façon privée, visibles par vous et
        votre kinésithérapeute uniquement.
      </p>

      <label className="mt-2 inline-block cursor-pointer rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
        {busy ? "Envoi…" : "Ajouter un document"}
        <input
          type="file"
          accept="image/*,application/pdf"
          className="hidden"
          disabled={busy}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) upload(f);
            e.target.value = "";
          }}
        />
      </label>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      {docs.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {docs.map((doc) => (
            <li key={doc.id} className="flex items-center justify-between rounded-md bg-white px-3 py-1.5 text-sm">
              <span className="truncate text-slate-700">📄 {doc.file_name}</span>
              <button
                type="button"
                onClick={() => remove(doc)}
                disabled={busy}
                className="ml-3 shrink-0 text-xs font-medium text-red-600 hover:underline disabled:opacity-50"
              >
                Supprimer
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
