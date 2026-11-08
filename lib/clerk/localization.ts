// Textes français des écrans Clerk (connexion, inscription), Philippe
// 2026-11-04 : l'inscription affichait « pour continuer vers My
// Application » (nom d'application jamais renseigné dans le Clerk de
// production) et un « Create a password » en anglais.
// On part de la traduction officielle frFR, on y remplace partout le nom
// d'application par « EasyPhysio », et on complète ce qui manque.
import { enGB, frFR } from "@clerk/localizations";

type Loc = typeof frFR;

function withAppName<T>(value: T): T {
  if (typeof value === "string") return value.replaceAll("{{applicationName}}", "EasyPhysio") as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, withAppName(v)])) as T;
  }
  return value;
}

export const easyPhysioFR: Loc = {
  ...withAppName(frFR),
  formFieldInputPlaceholder__signUpPassword: "Créez un mot de passe",
};

// Même chose en anglais (interface en anglais, 2026-11-06) : pack officiel
// enGB, nom d'application remplacé par « EasyPhysio », et le même complément.
export const easyPhysioEN: typeof enGB = {
  ...withAppName(enGB),
  formFieldInputPlaceholder__signUpPassword: "Create a password",
};
