import { DEFAULT_LOCALE, type Locale } from "../../i18n/locales.ts";

// Contenu de la PLATEFORME stocké en base (consignes des exercices, noms et
// descriptions des pathologies et des séances, zones du corps) dans la langue
// de l'interface (Philippe, 2026-11-07).
//
// Principe : un dictionnaire « texte français exact → traduction » dans
// i18n/content/<langue>.json. Chaque réponse de lecture (GET) de la base passe
// par localizeDbJson(), qui remplace la valeur des champs name / description /
// instructions / label quand elle figure dans le dictionnaire.
// - Texte écrit par un kiné : absent du dictionnaire → affiché tel quel.
// - Consigne française modifiée plus tard : plus de correspondance exacte →
//   le français s'affiche (jamais une traduction périmée d'un texte clinique).
// - En français, le sens inverse s'applique : un texte de la plateforme
//   enregistré en anglais (copie « Ajuster la séance » faite par un kiné
//   anglophone) redevient français à l'affichage.
// Traductions anglaises : brouillons à faire relire par le kiné partenaire.
//
// Les noms d'exercices sont déjà en anglais en base : pas dans le dictionnaire.

const FIELDS = new Set(["name", "description", "instructions", "label"]);

type Dict = Map<string, string>;
const cache = new Map<Locale, Promise<Dict>>();

async function loadForward(locale: Exclude<Locale, "fr">): Promise<Record<string, string>> {
  const { CONTENT } = await import("../../i18n/content/load.ts");
  const raw = CONTENT[locale] ?? {};
  return Object.fromEntries(Object.entries(raw).filter(([k]) => !k.startsWith("_")));
}

/** Dictionnaire à appliquer pour afficher en `locale`. */
export function dictionaryFor(locale: Locale): Promise<Dict> {
  let p = cache.get(locale);
  if (!p) {
    p =
      locale === DEFAULT_LOCALE
        ? // Français : toutes les traductions connues, à l'envers (→ français).
          Promise.all(
            (["en"] as const).map((l) => loadForward(l).catch(() => ({}) as Record<string, string>)),
          ).then((all) => new Map(all.flatMap((d) => Object.entries(d).map(([fr, other]) => [other, fr] as [string, string]))))
        : loadForward(locale as Exclude<Locale, "fr">)
            .then((d) => new Map(Object.entries(d)))
            .catch(() => new Map());
    cache.set(locale, p);
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

/** Remplace, dans une réponse JSON de la base, les textes de la plateforme. */
export async function localizeDbJson<T>(data: T, locale: Locale): Promise<T> {
  const dict = await dictionaryFor(locale);
  if (dict.size === 0) return data;
  return walk(data, dict) as T;
}

/** Un seul texte (pour les rares endroits qui ne passent pas par la base). */
export async function localizeDbText(text: string, locale: Locale): Promise<string> {
  return (await dictionaryFor(locale)).get(text) ?? text;
}

/**
 * fetch pour le client supabase-js : traduit les réponses de LECTURE (GET)
 * de PostgREST. Les écritures (POST/PATCH/DELETE, RPC) passent sans
 * changement. `getLocale` est appelé à chaque requête.
 */
export function localizingFetch(
  getLocale: () => Promise<Locale> | Locale,
  {
    // Côté navigateur on ne charge rien pour les francophones (le sens inverse
    // ne sert qu'aux copies de séance, lues côté serveur).
    reverseInFrench = true,
    base = fetch,
  }: { reverseInFrench?: boolean; base?: typeof fetch } = {},
): typeof fetch {
  return async (input, init) => {
    const res = await base(input, init);
    const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
    if (method !== "GET" || !res.ok) return res;
    if (!(res.headers.get("content-type") ?? "").includes("json")) return res;
    let locale: Locale;
    try {
      locale = await getLocale();
    } catch {
      return res;
    }
    if (locale === DEFAULT_LOCALE && !reverseInFrench) return res;
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
