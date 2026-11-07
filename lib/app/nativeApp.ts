// Appli mobile iPhone / Android (Philippe, 2026-11-07) : l'appli (dossier
// mobile/, Expo) affiche le site dans une vue web et ajoute à son
// « user-agent » la marque « EasyPhysioApp/<version> (ios|android) ». Le site
// la reconnaît ainsi pour :
//   - ne jamais afficher de prix ni de bouton de paiement aux patients dans
//     l'appli (règles d'Apple : le paiement se fait sur le site) ;
//   - ouvrir directement l'espace de la personne au lieu des pages vitrine.
// Ce fichier ne lit rien côté serveur : utilisable partout.

export type NativePlatform = "ios" | "android";

export const APP_USER_AGENT_MARK = "EasyPhysioApp";

export function nativePlatformFromUserAgent(ua: string | null | undefined): NativePlatform | null {
  const m = /EasyPhysioApp\/[\w.-]+ \((ios|android)\)/.exec(ua ?? "");
  return m ? (m[1] as NativePlatform) : null;
}

/** Pages du site qui gardent tout leur sens dans l'appli ; les autres (accueil,
 *  vitrine, démo) renvoient vers l'espace de la personne. */
const APP_PATH_PREFIXES = [
  "/login",
  "/signup",
  "/forgot-password",
  "/invitation",
  "/rejoindre",
  "/apres-connexion",
  "/connection-error",
  "/dashboard",
  "/patient",
  "/documents",
  "/admin",
  "/cgu",
  "/confidentialite",
  "/mentions-legales",
  "/api",
  "/.well-known",
];

export function isAppPath(pathname: string): boolean {
  return APP_PATH_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
