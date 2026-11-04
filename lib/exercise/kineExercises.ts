// Exercices créés par les kinés (Philippe, 2026-11-04, idée de Jonathan
// Feltus) : pour un patient, pour la banque du kiné, ou proposés à tous après
// vérification par EasyPhysio dans /admin. Règles d'accès : migration
// supabase/migrations/0081_kine_exercises.sql.

export type PublicationStatus = "private" | "pending" | "published" | "changes_requested" | "declined";

/** Récompense : au 5e exercice publié, EasyPhysio ne prend rien sur les
 *  paiements des patients du kiné pendant 3 mois, à partir de la date de
 *  publication du 5e (Philippe, 2026-11-04 ; durée de 3 mois proposée, à
 *  confirmer). Enregistrée dans instructor_fee_waivers. */
export const KINE_EXERCISE_REWARD = { threshold: 5, months: 3 } as const;

/** Vidéo filmée au téléphone : formats lus par les navigateurs, taille max. */
export const KINE_VIDEO_MAX_MB = 80;
export const KINE_VIDEO_TYPES: Record<string, string> = {
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
};

/** Clé d'une vidéo de kiné dans le stockage R2, relative au dossier des
 *  vidéos d'exercices : kines/<id de l'exercice>/<horodatage>.<ext>. */
export const KINE_VIDEO_KEY = /^kines\/([0-9a-f-]{36})\/\d{10,16}\.(mp4|mov|webm)$/i;

export const STATUS_PILL: Record<PublicationStatus, { label: string; tone: string }> = {
  private: { label: "Ma banque", tone: "bg-brand-soft text-brand" },
  pending: { label: "En vérification", tone: "bg-warn-soft text-warn" },
  published: { label: "Public · validé", tone: "bg-ok-soft text-ok" },
  changes_requested: { label: "À corriger", tone: "bg-danger-soft text-danger" },
  declined: { label: "Gardé privé", tone: "bg-app-bg text-muted" },
};

/** Un exercice que le kiné peut (encore) proposer à tous. */
export function canRequestPublication(ex: { publication_status: PublicationStatus; patient_id: string | null }): boolean {
  return ex.patient_id === null && ["private", "changes_requested", "declined"].includes(ex.publication_status);
}

/** Un exercice réservé à un patient ne se propose que pour lui ; patientId
 *  null = une séance de la bibliothèque, partagée entre patients. */
export function fitsPatient(ex: { patient_id?: unknown }, patientId: string | null): boolean {
  return !ex.patient_id || (patientId !== null && ex.patient_id === patientId);
}

/** Les étapes du formulaire, en une consigne lisible par la séance guidée
 *  (lib/exercise/steps.ts découpe à chaque « . »). */
export function stepsToInstructions(steps: string[]): string | null {
  const clean = steps
    .map((s) => s.trim().replace(/\s+/g, " ").replace(/[.\s]+$/, ""))
    .filter(Boolean);
  return clean.length ? clean.map((s) => `${s}.`).join(" ") : null;
}

/** Recherche de doublons avant de créer : mots du nom en commun. */
export function similarExercises<T extends { name: string; search_keywords?: string[] | null }>(
  name: string,
  pool: T[],
  limit = 3,
): T[] {
  const words = normalizeWords(name).filter((w) => w.length >= 4);
  if (words.length === 0) return [];
  return pool
    .map((ex) => {
      const hay = normalizeWords([ex.name, ...(ex.search_keywords ?? [])].join(" "));
      const score = words.filter((w) => hay.some((h) => h.startsWith(w) || w.startsWith(h))).length;
      return { ex, score };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((r) => r.ex);
}

function normalizeWords(s: string): string[] {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 3);
}
