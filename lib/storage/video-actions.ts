"use server";

// Lien signé vers une vidéo d'exercice (Cloudflare R2), demandé par la fenêtre
// « démo d'un exercice » (components/ExerciseInfoModal.tsx).
//
// Sécurité (audit du 2026-11-08) : avant, le navigateur envoyait le chemin
// « r2:… » et le serveur signait N'IMPORTE QUEL fichier du bucket — y compris
// la vidéo non publiée d'un autre kiné. Désormais on reçoit l'id de
// l'exercice, et on ne signe que SA vidéo, relue avec la session de la
// personne connectée : les règles d'accès (RLS) de la table exercises
// décident, exactement comme pour l'affichage de la fiche.
//
// Audit du 2026-11-10 (B4) : « connecté » ne suffit plus — n'importe quel
// compte, même sans fiche, pouvait faire signer les vidéos de la plateforme
// (liens valables 6 heures). Il faut être l'administrateur, un kiné approuvé,
// ou un patient en règle (CGU, accès payé, consentement : même calcul que
// app/patient/layout.tsx, lib/patient/patientGate.ts).
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import { resolveMediaUrl } from "./r2-videos";
import { FILMED_VIDEO_FILES } from "@/lib/exercise/filmedVideos";
import { platformExerciseName } from "@/lib/exercise/exerciseNames";
import { isAdminEmail } from "@/lib/admin";
import { currentPatientAccess } from "@/lib/patient/patientGate";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function signExerciseVideo(exerciseId: string): Promise<string | null> {
  if (typeof exerciseId !== "string" || !UUID.test(exerciseId)) return null;
  const supabase = await createClient();
  const user = await requireUser(supabase);

  let allowed = isAdminEmail(user.email);
  if (!allowed) {
    // Kiné approuvé ? Même règle que requireApprovedInstructor (un statut vide
    // compte comme validé : comptes d'avant la migration 0023), sans redirection.
    // Lecture en échec = refus.
    const { data: kine, error: kineError } = await supabase.from("instructors").select("status").eq("id", user.id).maybeSingle();
    allowed = !kineError && !!kine && ((kine.status as string | null) ?? "approved") === "approved";
  }
  if (!allowed) allowed = (await currentPatientAccess()) === "ok";
  if (!allowed) return null;

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
