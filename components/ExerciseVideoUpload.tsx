"use client";

// =============================================================================
// ExerciseVideoUpload — instructor films/exports a demo video and attaches it
// to one of their own exercises. Uploads straight to the public "exercise-media"
// Storage bucket (storage RLS checks the exercise is owned by this instructor),
// then writes the public URL onto exercises.media_url.
// =============================================================================

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const BUCKET = "exercise-media";
const MAX_MB = 100;

export default function ExerciseVideoUpload({
  exerciseId,
  initialUrl,
}: {
  exerciseId: string;
  initialUrl: string | null;
}) {
  const supabase = createClient();
  const [url, setUrl] = useState(initialUrl);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = async (file: File) => {
    setError(null);
    if (file.size > MAX_MB * 1024 * 1024) {
      setError(`Vidéo trop volumineuse (max ${MAX_MB} Mo). Compressez-la ou raccourcissez-la.`);
      return;
    }
    setBusy(true);
    try {
      const safe = file.name.replace(/[^\w.\-]+/g, "_");
      const path = `${exerciseId}/${crypto.randomUUID()}_${safe}`;

      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file);
      if (upErr) throw upErr;

      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      const publicUrl = data.publicUrl;

      const { error: dbErr } = await supabase
        .from("exercises")
        .update({ media_url: publicUrl })
        .eq("id", exerciseId);
      if (dbErr) throw dbErr;

      setUrl(publicUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Échec de l'envoi de la vidéo.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      {url && (
        <video controls preload="metadata" src={url} className="mt-2 w-full max-w-xs rounded-lg" />
      )}

      <label className="mt-2 inline-block cursor-pointer rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
        {busy ? "Envoi…" : url ? "Remplacer la vidéo" : "Ajouter une vidéo"}
        <input
          type="file"
          accept="video/*"
          capture="environment"
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
    </div>
  );
}
