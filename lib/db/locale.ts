import "server-only";
import { getPool } from "./pool";
import { isLocale, type Locale } from "@/i18n/locales";

// Langue enregistrée sur le compte (app_users.locale, migration 0084).
// Passe par les fonctions internal.* : app_users n'est pas modifiable via
// l'API. L'appelant doit fournir l'identifiant Clerk issu de auth() côté
// serveur — jamais une valeur venant du navigateur.

export async function setUserLocale(clerkId: string, locale: Locale): Promise<void> {
  await getPool().query("select internal.set_app_user_locale($1, $2)", [clerkId, locale]);
}

// Langue d'un patient (ou d'un kiné) par son identifiant interne — pour les
// messages automatiques écrits dans la langue du destinataire. Français si
// rien n'est enregistré ou si la base ne répond pas (migration 0084 absente).
export async function getLocaleByAppId(appId: string): Promise<Locale> {
  try {
    const { rows } = await getPool().query<{ locale: string | null }>(
      "select internal.get_app_user_locale_by_app_id($1) as locale",
      [appId],
    );
    const v = rows[0]?.locale;
    return isLocale(v) ? v : "fr";
  } catch (e) {
    console.error("getLocaleByAppId : langue introuvable, français par défaut", e);
    return "fr";
  }
}

export async function getUserLocale(clerkId: string): Promise<Locale | null> {
  const { rows } = await getPool().query<{ locale: string | null }>(
    "select internal.get_app_user_locale($1) as locale",
    [clerkId],
  );
  const v = rows[0]?.locale;
  return isLocale(v) ? v : null;
}
