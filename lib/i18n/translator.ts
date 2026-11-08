import { createTranslator } from "next-intl";
import { DEFAULT_LOCALE, INTL_TAGS, type Locale } from "../../i18n/locales.ts";

// Pour les fonctions de lib/ (pas de hook React, parfois appelées côté client
// comme côté serveur, et testées avec `node --test`) : un traducteur synchrone
// construit à partir des fichiers d'une zone, passés par l'appelant.
//
// Chemins RELATIFS avec extension (node --test ne connaît pas « @/ ») :
//   import fr from "../../messages/fr/exercise.json" with { type: "json" };
//   import en from "../../messages/en/exercise.json" with { type: "json" };
//   const t = libTranslator(locale, { fr, en }, "equipment");
//   t("dumbbells")
//
// Une clé absente en anglais retombe sur le français (comme i18n/request.ts).
// Le paramètre `locale` des fonctions de lib/ vaut "fr" par défaut : les
// appels et les tests existants continuent de renvoyer le français.

type Messages = Record<string, unknown>;

function deepMerge(base: Messages, over: Messages): Messages {
  const out: Messages = { ...base };
  for (const [k, v] of Object.entries(over)) {
    const b = out[k];
    out[k] =
      v && typeof v === "object" && !Array.isArray(v) && b && typeof b === "object" && !Array.isArray(b)
        ? deepMerge(b as Messages, v as Messages)
        : v;
  }
  return out;
}

export function libTranslator(
  locale: Locale | undefined,
  dictionaries: { fr: Messages; en: Messages },
  namespace?: string,
) {
  const l = locale ?? DEFAULT_LOCALE;
  const messages = l === "fr" ? dictionaries.fr : deepMerge(dictionaries.fr, dictionaries[l] ?? {});
  // Le typage fin des clés n'est pas utile ici : on accepte n'importe quelle clé.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createTranslator({ locale: l, messages: messages as any, namespace: namespace as any }) as unknown as (
    key: string,
    values?: Record<string, string | number | Date>,
  ) => string;
}

// Étiquette Intl ("fr-FR", "en-GB") pour toLocaleDateString / Intl.NumberFormat.
export function intlTag(locale: Locale | undefined): string {
  return INTL_TAGS[locale ?? DEFAULT_LOCALE];
}
