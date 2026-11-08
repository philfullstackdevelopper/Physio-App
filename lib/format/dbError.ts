// Message d'erreur base de données lisible par un kiné ou un patient (audit du
// 2026-10-08) : les messages bruts de Postgres/PostgREST, en anglais
// (« duplicate key value violates unique constraint… »), s'affichaient tels
// quels à l'écran. Le détail technique reste dans les journaux du serveur.
//
// Langue : `t` = traducteur de « dashboard.lib » (getTranslations), facultatif ;
// sans lui, le français ci-dessous.

import type { Tr } from "./relativeDay.ts";
import type { Locale } from "../../i18n/locales.ts";

type DbErrorLike = { message?: string | null; code?: string | null } | null | undefined;

// Code Postgres -> [clé dans dashboard.lib.dbError, texte français].
const BY_CODE: Record<string, [string, string]> = {
  "23505": ["exists", "Cet élément existe déjà."],
  "23503": ["linked", "Cet élément est lié à d'autres données ou n'existe plus."],
  "23502": ["missing", "Une information obligatoire manque."],
  "23514": ["rejected", "Une des valeurs saisies n'est pas acceptée."],
  "22P02": ["format", "Une des valeurs saisies n'est pas au bon format."],
  "42501": ["forbidden", "Vous n'avez pas le droit de faire cette action."],
};

// `tr` accepte aussi une locale (ancienne signature, encore utilisée par
// quelques appelants) : dans ce cas, texte français — passer plutôt
// `await getTranslations("dashboard.lib")` pour la langue de l'utilisateur.
export function friendlyDbError(error: DbErrorLike, fallback?: string, tr?: Tr | Locale): string {
  const t = typeof tr === "function" ? tr : undefined;
  const say = ([key, fr]: [string, string]) => (t ? t(`dbError.${key}`) : fr);
  const fb = fallback ?? say(["fallback", "Une erreur est survenue. Réessayez dans un instant."]);
  if (!error) return fb;
  console.error("[base de données]", error.code ?? "", error.message ?? error);
  // Nos propres règles (déclencheurs des migrations, `raise exception`)
  // écrivent déjà un message en français pour l'utilisateur.
  if (error.code === "P0001" && error.message) return error.message;
  if (error.code && BY_CODE[error.code]) return say(BY_CODE[error.code]);
  if (error.message && /row-level security/i.test(error.message)) return say(BY_CODE["42501"]);
  return fb;
}
