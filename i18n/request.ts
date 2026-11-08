import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from "./locales";

// Langue de la requête : le cookie NEXT_LOCALE (posé par le sélecteur de
// langue, et resynchronisé depuis app_users.locale à chaque connexion — voir
// app/apres-connexion). Pas de langue dans l'adresse des pages.
//
// Les textes sont rangés par zone (messages/<langue>/<zone>.json). Une clé
// absente en anglais retombe sur le français : une traduction oubliée
// affiche le texte d'origine au lieu de casser la page.

const AREAS = ["common", "home", "auth", "legal", "patient", "dashboard", "billing", "exercise", "admin", "demo"] as const;

type Messages = Record<string, unknown>;

async function load(locale: Locale): Promise<Messages> {
  const parts = await Promise.all(
    AREAS.map(async (area) => [area, (await import(`../messages/${locale}/${area}.json`)).default] as const),
  );
  return Object.fromEntries(parts);
}

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

export default getRequestConfig(async ({ locale: explicit }) => {
  // Langue demandée explicitement (getTranslations({ locale, … })) : sert à
  // écrire un message automatique ou une notification dans la langue du
  // PATIENT, quelle que soit celle de la personne qui déclenche l'envoi.
  // Sinon : le cookie de l'appareil.
  const fromCookie = (await cookies()).get(LOCALE_COOKIE)?.value;
  const locale: Locale = isLocale(explicit) ? explicit : isLocale(fromCookie) ? fromCookie : DEFAULT_LOCALE;
  const fr = await load("fr");
  const messages = locale === "fr" ? fr : deepMerge(fr, await load(locale));
  return {
    locale,
    messages,
    // Toutes les heures de l'app sont celles de Paris (next.config.ts).
    timeZone: "Europe/Paris",
  };
});
