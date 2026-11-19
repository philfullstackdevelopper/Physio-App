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

// Écran « code de vérification » : le code tombe souvent dans « Promotions »
// ou les spams (Philippe, 2026-11-19) — on le dit là où on l'attend.
const FR_CODE_HINT = "Entrez le code reçu par e-mail. Pas reçu ? Regardez dans « Promotions » ou les spams.";
const EN_CODE_HINT = "Enter the code we emailed you. Nothing? Check the Promotions tab or spam.";

const fr = withAppName(frFR);
export const easyPhysioFR: Loc = {
  ...fr,
  formFieldInputPlaceholder__signUpPassword: "Créez un mot de passe",
  signUp: { ...fr.signUp, emailCode: { ...fr.signUp?.emailCode, formSubtitle: FR_CODE_HINT } },
  signIn: { ...fr.signIn, emailCode: { ...fr.signIn?.emailCode, subtitle: FR_CODE_HINT } },
};

// Même chose en anglais (interface en anglais, 2026-11-06) : pack officiel
// enGB, nom d'application remplacé par « EasyPhysio », et le même complément.
const en = withAppName(enGB);
export const easyPhysioEN: typeof enGB = {
  ...en,
  formFieldInputPlaceholder__signUpPassword: "Create a password",
  signUp: { ...en.signUp, emailCode: { ...en.signUp?.emailCode, formSubtitle: EN_CODE_HINT } },
  signIn: { ...en.signIn, emailCode: { ...en.signIn?.emailCode, subtitle: EN_CODE_HINT } },
};
