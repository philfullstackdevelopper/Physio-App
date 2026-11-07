// Réglages de l'appli EasyPhysio (iPhone / Android).
//
// L'appli affiche le site easyphysio.fr (mêmes écrans téléphone que dans le
// navigateur) et y ajoute ce que seul un téléphone sait faire : notifications,
// Face ID / empreinte, écran hors connexion, liens (connexion, espaces) qui ouvrent
// l'appli. Tout changement du site arrive donc dans l'appli sans nouvelle
// publication sur les magasins.

export const SITE_URL = "https://easyphysio.fr";

/** Première page : le site envoie vers l'espace kiné ou patient, ou vers la connexion. */
export const START_URL = `${SITE_URL}/apres-connexion`;

/** Sites ouverts DANS l'appli. Tout le reste (Stripe, Google…) s'ouvre dans le navigateur du téléphone. */
export const IN_APP_HOSTS = ["easyphysio.fr", "www.easyphysio.fr", "clerk.easyphysio.fr", "accounts.easyphysio.fr"];

/** Après combien de temps en arrière-plan l'appli redemande Face ID / l'empreinte. */
export const LOCK_AFTER_MS = 5 * 60 * 1000;

/** Marque ajoutée à l'identité du navigateur : le site reconnaît l'appli (lib/app/nativeApp.ts). */
export const USER_AGENT_MARK = "EasyPhysioApp";
