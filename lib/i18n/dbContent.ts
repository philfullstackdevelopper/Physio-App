import { DEFAULT_LOCALE, type Locale } from "../../i18n/locales.ts";

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

    // Écriture : corps JSON (chaîne, comme l'envoie supabase-js) remis en français.
    if (method !== "GET" && method !== "HEAD" && locale !== DEFAULT_LOCALE && typeof init?.body === "string") {
      try {
        const sent = JSON.stringify(await canonicalizeDbJson(JSON.parse(init.body), locale));
        init = { ...init, body: sent };
      } catch {
        // Corps non JSON : envoyé tel quel.
      }
    }

    const res = await base(input, init);
    if (method !== "GET" || !res.ok || locale === DEFAULT_LOCALE) return res;
    if (!(res.headers.get("content-type") ?? "").includes("json")) return res;
    const text = await res.text();
    let body = text;
    try {
      body = JSON.stringify(await localizeDbJson(JSON.parse(text), locale));
    } catch {
      // Réponse non JSON malgré l'en-tête : renvoyée telle quelle.
    }
    const headers = new Headers(res.headers);
    headers.delete("content-length");
    headers.delete("content-encoding");
    return new Response(body, { status: res.status, statusText: res.statusText, headers });
  };
}
