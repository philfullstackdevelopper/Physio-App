"use server";

// Lien signé vers une vidéo d'exercice (Cloudflare R2), demandé par la fenêtre
// « démo d'un exercice » (components/ExerciseInfoModal.tsx), qui lit la fiche
// depuis le navigateur. Réservé aux utilisateurs connectés.
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import { resolveMediaUrl } from "./r2-videos";

export async function signExerciseVideo(mediaUrl: string | null): Promise<string | null> {
  const supabase = await createClient();
  await requireUser(supabase);
  return resolveMediaUrl(mediaUrl);
}
