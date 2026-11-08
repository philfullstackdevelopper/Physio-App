// Langues de l'interface (Philippe, 2026-11-06). Pour en ajouter une plus
// tard : l'ajouter ici, créer messages/<code>/ (copie de messages/en/ à
// traduire), élargir la contrainte app_users_locale_check (nouvelle
// migration) et le pack Clerk dans app/layout.tsx.

export const LOCALES = ["fr", "en"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "fr";

// Copie rapide du choix, lue à chaque page sans interroger la base.
export const LOCALE_COOKIE = "NEXT_LOCALE";

// Nom de chaque langue écrit dans cette langue (pour le sélecteur).
export const LOCALE_LABELS: Record<Locale, string> = {
  fr: "Français",
  en: "English",
};

// Étiquette complète pour Intl (dates, montants). Anglais britannique :
// jour/mois/année et euros, comme le public visé (Belgique, Luxembourg,
// Suisse…).
export const INTL_TAGS: Record<Locale, string> = {
  fr: "fr-FR",
  en: "en-GB",
};

// Première visite, aucun choix encore fait (Philippe, 2026-11-06 : adapter
// la langue au visiteur) : on suit la langue du NAVIGATEUR (en-tête
// Accept-Language), plus fiable que le pays — Belgique et Suisse ont
// plusieurs langues. Français dans le navigateur → français ; une autre
// langue (anglais, néerlandais, allemand…) → anglais, la langue étrangère la
// plus partagée tant qu'on n'en propose pas d'autre ; rien d'indiqué (robots
// de Google…) → français. Les langues sont lues dans l'ordre de préférence
// du navigateur ; une langue proposée par l'app l'emporte dès qu'elle
// apparaît.
export function localeFromAcceptLanguage(header: string | null | undefined): Locale {
  if (!header) return DEFAULT_LOCALE;
  const prefs = header
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.find((p) => p.trim().startsWith("q="));
      return { lang: tag.trim().toLowerCase().split("-")[0], q: q ? Number(q.split("=")[1]) || 0 : 1 };
    })
    .filter((p) => p.lang && p.lang !== "*" && p.q > 0)
    .sort((a, b) => b.q - a.q);
  if (prefs.length === 0) return DEFAULT_LOCALE;
  const supported = prefs.find((p) => isLocale(p.lang));
  if (supported) return supported.lang as Locale;
  return "en";
}

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}
