import { DEFAULT_LOCALE, type Locale } from "../../i18n/locales.ts";
import { frenchExerciseName, platformExerciseName } from "../exercise/exerciseNames.ts";

// Contenu de la PLATEFORME stocké en base (consignes des exercices, noms et
// descriptions des pathologies et des séances, zones du corps) dans la langue
// de l'interface (Philippe, 2026-11-07).
//
// Principe : un dictionnaire « texte français exact → traduction » dans
// i18n/content/<langue>.json.
// - LECTURE (GET) par une personne qui n'est pas en français : les champs
//   name / description / instructions / label dont la valeur figure dans le
//   dictionnaire sont remplacés par la traduction.
// - ÉCRITURE (POST / PATCH…) par une personne qui n'est pas en français : le
//   sens inverse s'applique au contenu envoyé, pour que la base ne contienne
//   QUE le texte français de la plateforme (ex. copie « Ajuster la séance »
//   faite par un kiné anglophone : enregistrée en français, donc lue en
//   français par un patient francophone).
// - En français, rien n'est touché, ni en lecture ni en écriture : un kiné
//   qui appelle sa propre séance « Shoulder » la garde telle quelle.
// - Texte écrit par un kiné : absent du dictionnaire → tel quel.
// - Consigne française modifiée plus tard : plus de correspondance exacte →
//   le français s'affiche (jamais une traduction périmée d'un texte clinique).
// Traductions anglaises : brouillons à faire relire par le kiné partenaire.
//
// Les noms d'exercices sont déjà en anglais en base : pas dans le dictionnaire.
// En FRANÇAIS, ils sont remplacés par leur nom français (2026-11-08) : voir
// frenchExerciseNamesJson plus bas et lib/exercise/exerciseNames.ts.

const FIELDS = new Set(["name", "description", "instructions", "label"]);

type Dict = Map<string, string>;
const forwardCache = new Map<Locale, Promise<Dict>>();
const reverseCache = new Map<Locale, Promise<Dict>>();

async function loadForward(locale: Locale): Promise<Record<string, string>> {
  if (locale === DEFAULT_LOCALE) return {};
  const { CONTENT } = await import("../../i18n/content/load.ts");
  const raw = CONTENT[locale] ?? {};
  return Object.fromEntries(Object.entries(raw).filter(([k]) => !k.startsWith("_")));
}

/** Français → `locale` (vide pour le français). */
export function dictionaryFor(locale: Locale): Promise<Dict> {
  let p = forwardCache.get(locale);
  if (!p) {
    p = loadForward(locale)
      .then((d) => new Map(Object.entries(d)))
      .catch(() => new Map());
    forwardCache.set(locale, p);
  }
  return p;
}

/** `locale` → français (vide pour le français). */
function reverseDictionaryFor(locale: Locale): Promise<Dict> {
  let p = reverseCache.get(locale);
  if (!p) {
    p = loadForward(locale)
      .then((d) => new Map(Object.entries(d).map(([fr, other]) => [other, fr] as [string, string])))
      .catch(() => new Map());
    reverseCache.set(locale, p);
  }
  return p;
}

function walk(value: unknown, dict: Dict): unknown {
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) value[i] = walk(value[i], dict);
    return value;
  }
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    for (const [k, v] of Object.entries(obj)) {
      if (typeof v === "string") {
        if (FIELDS.has(k)) {
          const t = dict.get(v);
          if (t !== undefined) obj[k] = t;
        }
      } else if (v && typeof v === "object") {
        obj[k] = walk(v, dict);
      }
    }
  }
  return value;
}

/** Affichage : remplace, dans une réponse JSON de la base, les textes de la plateforme. */
export async function localizeDbJson<T>(data: T, locale: Locale): Promise<T> {
  const dict = await dictionaryFor(locale);
  if (dict.size === 0) return data;
  return walk(data, dict) as T;
}

/** Enregistrement : remet en français les textes de la plateforme lus dans `fromLocale`. */
export async function canonicalizeDbJson<T>(data: T, fromLocale: Locale): Promise<T> {
  const dict = await reverseDictionaryFor(fromLocale);
  if (dict.size === 0) return data;
  return walk(data, dict) as T;
}

/**
 * Un seul texte de la plateforme, vers `locale`. Accepte le texte français
 * comme sa version anglaise (un nom lu par un kiné anglophone) : renvoie
 * toujours la version demandée, ou le texte tel quel s'il est inconnu.
 */
export async function localizeDbText(text: string, locale: Locale): Promise<string> {
  // D'abord retrouver le français (si `text` est une traduction connue)…
  let fr = text;
  for (const l of ["en"] as const) {
    const back = (await reverseDictionaryFor(l)).get(text);
    if (back !== undefined) {
      fr = back;
      break;
    }
  }
  // …puis le traduire vers la langue demandée.
  return locale === DEFAULT_LOCALE ? fr : ((await dictionaryFor(locale)).get(fr) ?? fr);
}

// ── Noms d'exercices en français ────────────────────────────────────────────
//
// Seuls les objets qui SONT des exercices sont touchés : les lignes d'une
// requête sur la table `exercises`, ou une ressource imbriquée sous la clé
// `exercises` / `exercise` (ex. `workout_exercises(exercise:exercises(name))`).
// Une séance ou une pathologie qui porterait le même nom n'est donc jamais
// renommée. Un exercice dont `created_by` est renseigné (créé par un kiné)
// garde son nom. `exercise_name` (table exercise_results : nom copié à la fin
// d'une séance) est aussi traduit à la lecture, et remis en anglais à
// l'écriture, pour que la base garde un seul nom par exercice.

/** Table visée par une requête PostgREST (`/rest/v1/<table>?…`), ou null. */
export function restTable(url: string): string | null {
  let path = url;
  try {
    path = new URL(url, "http://x").pathname;
  } catch {
    // URL invalide : on garde la chaîne.
  }
  const m = path.match(/\/rest\/v1\/([^/?#]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

const EXERCISE_EMBED_KEYS = new Set(["exercises", "exercise"]);

function renameExercises(value: unknown, isExercise: boolean): void {
  if (Array.isArray(value)) {
    for (const v of value) renameExercises(v, isExercise);
    return;
  }
  if (!value || typeof value !== "object") return;
  const obj = value as Record<string, unknown>;
  if (isExercise && typeof obj.name === "string" && (obj.created_by === undefined || obj.created_by === null)) {
    const fr = frenchExerciseName(obj.name);
    if (fr !== undefined) obj.name = fr;
  }
  if (typeof obj.exercise_name === "string") {
    const fr = frenchExerciseName(obj.exercise_name);
    if (fr !== undefined) obj.exercise_name = fr;
  }
  for (const [k, v] of Object.entries(obj)) {
    if (v && typeof v === "object") renameExercises(v, EXERCISE_EMBED_KEYS.has(k));
  }
}

/**
 * Lecture en français : noms des exercices de la plateforme en français.
 * `url` = l'URL de la requête PostgREST (pour savoir si les lignes du premier
 * niveau sont des exercices). Modifie `data` sur place et le renvoie.
 * Une liste d'exercices demandée triée par nom (`order=name`) est re-triée
 * selon le nom français, pour que l'ordre alphabétique reste juste.
 */
export function frenchExerciseNamesJson<T>(data: T, url: string): T {
  const table = restTable(url);
  renameExercises(data, table === "exercises");
  if (table === "exercises" && Array.isArray(data) && /[?&]order=name(\.asc)?(&|$)/.test(url)) {
    (data as { name?: unknown }[]).sort((a, b) => String(a.name ?? "").localeCompare(String(b.name ?? ""), "fr"));
  }
  return data;
}

/** Écriture en français : `exercise_name` d'une ligne exercise_results remis en anglais. */
export function canonicalExerciseNamesJson<T>(data: T, url: string): T {
  if (restTable(url) !== "exercise_results") return data;
  for (const r of Array.isArray(data) ? data : [data]) {
    if (r && typeof r === "object" && typeof (r as Record<string, unknown>).exercise_name === "string") {
      const row = r as Record<string, unknown>;
      row.exercise_name = platformExerciseName(row.exercise_name as string);
    }
  }
  return data;
}

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

/**
 * fetch pour le client supabase-js. Lecture (GET) : textes de la plateforme
 * traduits vers la langue de l'interface. Écriture : textes de la plateforme
 * remis en français avant envoi. En français : aucune transformation.
 * `getLocale` est appelé à chaque requête.
 */
export function localizingFetch(
  getLocale: () => Promise<Locale> | Locale,
  { base = fetch }: { base?: typeof fetch } = {},
): typeof fetch {
  return async (input, init) => {
    const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
    let locale: Locale = DEFAULT_LOCALE;
    try {
      locale = await getLocale();
    } catch {
      // Langue inconnue : aucune transformation.
    }

    const url = requestUrl(input);

    // Écriture : corps JSON (chaîne, comme l'envoie supabase-js) remis en français.
    if (method !== "GET" && method !== "HEAD" && locale !== DEFAULT_LOCALE && typeof init?.body === "string") {
      try {
        const sent = JSON.stringify(await canonicalizeDbJson(JSON.parse(init.body), locale));
        init = { ...init, body: sent };
      } catch {
        // Corps non JSON : envoyé tel quel.
      }
    }
    // Écriture en français : nom d'exercice d'un résultat de séance remis en anglais.
    if (
      method !== "GET" &&
      method !== "HEAD" &&
      locale === DEFAULT_LOCALE &&
      typeof init?.body === "string" &&
      restTable(url) === "exercise_results"
    ) {
      try {
        init = { ...init, body: JSON.stringify(canonicalExerciseNamesJson(JSON.parse(init.body), url)) };
      } catch {
        // Corps non JSON : envoyé tel quel.
      }
    }

    const res = await base(input, init);
    if (method !== "GET" || !res.ok) return res;
    // Français : seules les requêtes qui touchent des exercices (table, ressource
    // imbriquée ou exercise_results) sont relues ; les autres passent intactes.
    if (locale === DEFAULT_LOCALE && !url.includes("exercise")) return res;
    if (!(res.headers.get("content-type") ?? "").includes("json")) return res;
    const text = await res.text();
    let body = text;
    try {
      body =
        locale === DEFAULT_LOCALE
          ? JSON.stringify(frenchExerciseNamesJson(JSON.parse(text), url))
          : JSON.stringify(await localizeDbJson(JSON.parse(text), locale));
    } catch {
      // Réponse non JSON malgré l'en-tête : renvoyée telle quelle.
    }
    const headers = new Headers(res.headers);
    headers.delete("content-length");
    headers.delete("content-encoding");
    return new Response(body, { status: res.status, statusText: res.statusText, headers });
  };
}
