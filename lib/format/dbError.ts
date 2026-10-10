// Message d'erreur base de données lisible par un kiné ou un patient (audit du
// 2026-10-08) : les messages bruts de Postgres/PostgREST, en anglais
// (« duplicate key value violates unique constraint… »), s'affichaient tels
// quels à l'écran. Le détail technique reste dans les journaux du serveur.

type DbErrorLike = { message?: string | null; code?: string | null } | null | undefined;

const BY_CODE: Record<string, string> = {
  "23505": "Cet élément existe déjà.",
  "23503": "Cet élément est lié à d'autres données ou n'existe plus.",
  "23502": "Une information obligatoire manque.",
  "23514": "Une des valeurs saisies n'est pas acceptée.",
  "22P02": "Une des valeurs saisies n'est pas au bon format.",
  "42501": "Vous n'avez pas le droit de faire cette action.",
};

export function friendlyDbError(error: DbErrorLike, fallback = "Une erreur est survenue. Réessayez dans un instant."): string {
  if (!error) return fallback;
  console.error("[base de données]", error.code ?? "", error.message ?? error);
  // Nos propres règles (déclencheurs des migrations, `raise exception`)
  // écrivent déjà un message en français pour l'utilisateur.
  if (error.code === "P0001" && error.message) return error.message;
  if (error.code && BY_CODE[error.code]) return BY_CODE[error.code];
  if (error.message && /row-level security/i.test(error.message)) return BY_CODE["42501"];
  return fallback;
}
