"use client";

// =============================================================================
// ExerciseVideoUpload — attach a demo video to an exercise (the instructor's
// own, or a shared platform one). Uploads to the public "exercise-media"
// Storage bucket, then writes the public URL + start point through
// set_exercise_media() — a narrow RPC (see migration 0022) so this works on
// platform exercises too, without opening up their name/instructions.
//
// (Philippe, 2026-10-07 : la RPC n'accepte plus que les exercices du kiné
// connecté. Pour les exercices PLATEFORME, seul l'administrateur voit ce
// composant, avec viaAdmin : l'URL et le point de départ passent alors par la
// Server Action adminSetExerciseMedia, qui revérifie le statut admin côté
// serveur. L'envoi du fichier vers le stockage, lui, ne change pas.)
//
// (Philippe, 2026-11-01 : plus d'aperçu vidéo ni de « définir l'instant
// actuel comme départ » ici — jugé encombrant. Ce composant n'est plus qu'un
// bouton « Ajouter / Remplacer la vidéo » ; la vidéo se regarde dans la
// fenêtre qui s'ouvre au clic sur la carte (ExerciseLibraryGrid). Un nouvel
// envoi repart du début de la vidéo, départ = 0 s.)
// =============================================================================

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { uploadFile } from "@/lib/storage/client";
import { adminSetExerciseMedia } from "@/app/dashboard/exercises/actions";

const BUCKET = "exercise-media";
const MAX_MB = 100;

export default function ExerciseVideoUpload({
  exerciseId,
  initialUrl,
  viaAdmin = false,
  onUploaded,
}: {
  exerciseId: string;
  initialUrl: string | null;
  viaAdmin?: boolean;
  /** Prévient la fenêtre de l'exercice qu'une nouvelle vidéo est en ligne. */
  onUploaded?: (url: string) => void;
}) {
  const supabase = createClient();

  // Écrit l'URL + le point de départ, par la RPC (exercice du kiné) ou par la
  // Server Action admin (exercice plateforme). Lève une vraie Error avec le
  // message lisible : les erreurs Supabase sont de simples objets, pas des
  // instances d'Error — l'ancien `e instanceof Error` perdait leur message
  // (Philippe, 2026-10-07).
  const saveMedia = async (mediaUrl: string, seconds: number) => {
    if (viaAdmin) {
      const res = await adminSetExerciseMedia(exerciseId, mediaUrl, seconds);
      if ("error" in res) throw new Error(res.error);
      return;
    }
    const { error: rpcErr } = await supabase.rpc("set_exercise_media", {
      p_exercise_id: exerciseId,
      p_media_url: mediaUrl,
      p_start_seconds: seconds,
    });
    if (rpcErr) throw new Error(rpcErr.message || "Échec de l'enregistrement.");
  };

  const errorMessage = (e: unknown, fallback: string) => {
    const msg = (e as { message?: unknown } | null)?.message;
    return typeof msg === "string" && msg ? msg : fallback;
  };
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

      const { error: upErr, publicUrl } = await uploadFile(BUCKET, path, file);
      if (upErr || !publicUrl) throw new Error(upErr ?? "Échec de l'envoi.");

      await saveMedia(publicUrl, 0);

      setUrl(publicUrl);
      onUploaded?.(publicUrl);
    } catch (e) {
      setError(errorMessage(e, "Échec de l'envoi de la vidéo."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <label className="inline-block cursor-pointer rounded-md border border-line bg-surface px-3 py-1.5 text-sm font-medium text-ink hover:bg-app-bg">
        {busy ? "Envoi…" : url ? "Remplacer la vidéo" : "Ajouter une vidéo"}
        <input
          type="file"
          accept="video/*"
          className="hidden"
          disabled={busy}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) upload(f);
            e.target.value = "";
          }}
        />
      </label>

      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  );
}
