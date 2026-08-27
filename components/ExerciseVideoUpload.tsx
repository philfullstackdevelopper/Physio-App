"use client";

// =============================================================================
// ExerciseVideoUpload — attach a demo video to an exercise (the instructor's
// own, or a shared platform one). Uploads to the public "exercise-media"
// Storage bucket, then writes the public URL + start point through
// set_exercise_media() — a narrow RPC (see migration 0022) so this works on
// platform exercises too, without opening up their name/instructions.
// =============================================================================

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const BUCKET = "exercise-media";
const MAX_MB = 100;

export default function ExerciseVideoUpload({
  exerciseId,
  initialUrl,
  initialStartSeconds = 0,
}: {
  exerciseId: string;
  initialUrl: string | null;
  initialStartSeconds?: number;
}) {
  const supabase = createClient();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [url, setUrl] = useState(initialUrl);
  const [startSeconds, setStartSeconds] = useState(initialStartSeconds);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedStart, setSavedStart] = useState(false);

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

      const { error: rpcErr } = await supabase.rpc("set_exercise_media", {
        p_exercise_id: exerciseId,
        p_media_url: publicUrl,
        p_start_seconds: 0,
      });
      if (rpcErr) throw rpcErr;

      setUrl(publicUrl);
      setStartSeconds(0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Échec de l'envoi de la vidéo.");
    } finally {
      setBusy(false);
    }
  };

  const useCurrentTimeAsStart = async () => {
    const v = videoRef.current;
    if (!v || !url) return;
    const seconds = Math.floor(v.currentTime);
    setError(null);
    try {
      const { error: rpcErr } = await supabase.rpc("set_exercise_media", {
        p_exercise_id: exerciseId,
        p_media_url: url,
        p_start_seconds: seconds,
      });
      if (rpcErr) throw rpcErr;
      setStartSeconds(seconds);
      setSavedStart(true);
      setTimeout(() => setSavedStart(false), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Échec de l'enregistrement du point de départ.");
    }
  };

  return (
    <div>
      {url && (
        <>
          <video
            ref={videoRef}
            controls
            preload="metadata"
            src={url}
            className="mt-2 w-full max-w-xs rounded-lg"
          />
          <div className="mt-1.5 flex items-center gap-2">
            <button
              type="button"
              onClick={useCurrentTimeAsStart}
              className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Définir l&apos;instant actuel comme départ
            </button>
            <span className="text-xs text-slate-400">
              {savedStart ? "Enregistré ✓" : `Départ actuel : ${startSeconds}s`}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Avancez la vidéo jusqu&apos;au moment où le mouvement commence, puis cliquez ci-dessus —
            la séance patient démarrera et bouclera pile à cet instant.
          </p>
        </>
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
