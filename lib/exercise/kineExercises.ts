// Exercices créés par les kinés (Philippe, 2026-11-04, idée de Jonathan
// Feltus) : pour un patient, pour la banque du kiné, ou proposés à tous après
// vérification par EasyPhysio dans /admin. Règles d'accès : migration
// supabase/migrations/0081_kine_exercises.sql.

export type PublicationStatus = "private" | "pending" | "published" | "changes_requested" | "declined";

/** Récompense (Philippe, 2026-11-04) : à 5 exercices publiés, le kiné devient
 *  « Contributeur EasyPhysio », et les principaux contributeurs sont classés
 *  dans « Mes exercices ». (L'ancienne remise sur la part d'EasyPhysio n'a plus
 *  de sens depuis le modèle du 2026-11-04 : EasyPhysio ne prend rien sur les
 *  paiements du kiné. La table instructor_fee_waivers reste, inutilisée.) */
export const CONTRIBUTOR_THRESHOLD = 5;

/** Petit jeu (Philippe, 2026-11-04 : « discret mais visible, une espèce de
 *  petit jeu ») : des paliers selon le nombre d'exercices publiés. Argent =
 *  « Contributeur EasyPhysio ». */
export const CONTRIBUTOR_LEVELS = [
  { min: 1, name: "Bronze", tone: "text-amber-700", bg: "bg-amber-50" },
  { min: CONTRIBUTOR_THRESHOLD, name: "Argent", tone: "text-slate-600", bg: "bg-slate-100" },
  { min: 10, name: "Or", tone: "text-yellow-600", bg: "bg-yellow-50" },
  { min: 20, name: "Platine", tone: "text-sky-700", bg: "bg-sky-50" },
] as const;

export type ContributorLevel = (typeof CONTRIBUTOR_LEVELS)[number];

/** Palier atteint (null avant le 1er exercice publié) et palier suivant. */
export function contributorLevel(count: number): { level: ContributorLevel | null; next: ContributorLevel | null } {
  let level: ContributorLevel | null = null;
  for (const l of CONTRIBUTOR_LEVELS) if (count >= l.min) level = l;
  const next = CONTRIBUTOR_LEVELS.find((l) => count < l.min) ?? null;
  return { level, next };
}

export interface ContributorRank {
  authorId: string;
  label: string;
  count: number;
  contributor: boolean;
}

/** Classement des kinés par exercices publiés (les plus nombreux d'abord). */
export function contributorRanking(
  exercises: { created_by: string | null; publication_status: PublicationStatus; author_label: string | null }[],
  limit = Number.POSITIVE_INFINITY,
): ContributorRank[] {
  const byAuthor = new Map<string, ContributorRank>();
  for (const ex of exercises) {
    if (!ex.created_by || ex.publication_status !== "published") continue;
    const cur = byAuthor.get(ex.created_by) ?? { authorId: ex.created_by, label: ex.author_label || "Un kiné", count: 0, contributor: false };
    cur.count += 1;
    if (ex.author_label) cur.label = ex.author_label;
    byAuthor.set(ex.created_by, cur);
  }
  return [...byAuthor.values()]
    .map((r) => ({ ...r, contributor: r.count >= CONTRIBUTOR_THRESHOLD }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "fr"))
    .slice(0, limit);
}

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
