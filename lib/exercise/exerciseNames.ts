// Noms FRANÇAIS des exercices de la plateforme (Philippe, 2026-11-08 :
// « Noms des exercices en français : Oui »).
//
// En base, les exercices de la plateforme ont un nom anglais (« Glute Bridge »,
// migration 0042) : c'est la clé qui relie un exercice à son dessin
// (illustrationMap.ts), à sa vidéo (filmedVideos.ts) et à la liste des
// exercices filmés (filmedExercises.ts). Un patient français âgé ne comprend
// pas « Quad Set » : pour les utilisateurs en français, le nom affiché vient du
// dictionnaire i18n/content/fr-exercise-names.json (nom anglais exact → nom
// français), appliqué à la lecture par lib/i18n/dbContent.ts.
//
// Les recherches par nom (dessin, vidéo, exercices filmés) doivent donc
// accepter les deux : `platformExerciseName` ramène un nom français connu à
// son nom anglais en base, et laisse tout autre nom tel quel.
//
// Brouillon à faire relire par le kiné partenaire (clé "_review" du JSON).
import raw from "../../i18n/content/fr-exercise-names.json" with { type: "json" };

const EN_TO_FR: ReadonlyMap<string, string> = new Map(
  Object.entries(raw as Record<string, string>).filter(([k]) => !k.startsWith("_")),
);
const FR_TO_EN: ReadonlyMap<string, string> = new Map([...EN_TO_FR].map(([en, fr]) => [fr, en] as [string, string]));

/** Nom français d'un exercice de la plateforme (nom anglais exact en base), sinon undefined. */
export function frenchExerciseName(dbName: string): string | undefined {
  return EN_TO_FR.get(dbName);
}

/** Nom à afficher dans `locale` pour un nom en base (données de démo écrites
 *  en dur, qui ne passent pas par la base) : français si connu, sinon tel quel. */
export function exerciseNameFor(dbName: string, locale: string | undefined): string {
  return (locale ?? "fr") === "fr" ? (EN_TO_FR.get(dbName) ?? dbName) : dbName;
}

/** Nom en base (anglais) d'un nom d'exercice, qu'il soit affiché en français ou non. */
export function platformExerciseName(name: string): string {
  return FR_TO_EN.get(name) ?? name;
}

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Recherche : le nom affiché OU son nom anglais d'origine contient `query`
 *  (sans tenir compte des majuscules ni des accents : « elevation » trouve
 *  « Élévation de la jambe tendue », « leg raise » aussi). */
export function exerciseNameMatches(name: string, query: string): boolean {
  const q = fold(query);
  if (fold(name).includes(q)) return true;
  const en = FR_TO_EN.get(name);
  return en !== undefined && fold(en).includes(q);
}
