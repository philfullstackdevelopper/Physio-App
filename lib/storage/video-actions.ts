"use server";

// Lien signé vers une vidéo d'exercice (Cloudflare R2), demandé par la fenêtre
// « démo d'un exercice » (components/ExerciseInfoModal.tsx), qui lit la fiche
// depuis le navigateur. Réservé aux utilisateurs connectés.
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import { resolveMediaUrl } from "./r2-videos";
import { FILMED_VIDEO_FILES } from "@/lib/exercise/filmedVideos";
import { platformExerciseName } from "@/lib/exercise/exerciseNames";

export async function signExerciseVideo(mediaUrl: string | null): Promise<string | null> {
  const supabase = await createClient();
  await requireUser(supabase);
  return resolveMediaUrl(mediaUrl);
}

/** Vidéo de Jules d'un exercice filmé, par son nom, SANS connexion : pour la
 *  fenêtre (i) de la démo publique, qui ne peut pas lire la fiche de
 *  l'exercice (Philippe, 2026-11-02). Limité aux vidéos de la plateforme déjà
 *  montrées sur l'accueil (lib/exercise/filmedVideos.ts) : aucun autre fichier
 *  ne peut être demandé par ce chemin. */
export async function signFilmedVideoByName(name: string): Promise<string | null> {
  // Nom affiché en français ou nom anglais en base : les deux sont reconnus.
  const file = FILMED_VIDEO_FILES[name] ?? FILMED_VIDEO_FILES[platformExerciseName(name)];
  if (!file) return null;
  return resolveMediaUrl(`r2:${file}`);
}
