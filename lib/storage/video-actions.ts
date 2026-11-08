"use server";

// Lien signé vers une vidéo d'exercice (Cloudflare R2), demandé par la fenêtre
// « démo d'un exercice » (components/ExerciseInfoModal.tsx). Réservé aux
// utilisateurs connectés.
//
// Sécurité (audit du 2026-11-08) : avant, le navigateur envoyait le chemin
// « r2:… » et le serveur signait N'IMPORTE QUEL fichier du bucket — y compris
// la vidéo non publiée d'un autre kiné. Désormais on reçoit l'id de
// l'exercice, et on ne signe que SA vidéo, relue avec la session de la
// personne connectée : les règles d'accès (RLS) de la table exercises
// décident, exactement comme pour l'affichage de la fiche.
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import { resolveMediaUrl } from "./r2-videos";
import { FILMED_VIDEO_FILES } from "@/lib/exercise/filmedVideos";
import { platformExerciseName } from "@/lib/exercise/exerciseNames";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function signExerciseVideo(exerciseId: string): Promise<string | null> {
  if (typeof exerciseId !== "string" || !UUID.test(exerciseId)) return null;
  const supabase = await createClient();
  await requireUser(supabase);
  const { data } = await supabase.from("exercises").select("media_url").eq("id", exerciseId).maybeSingle();
  return resolveMediaUrl((data?.media_url as string | null | undefined) ?? null);
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
