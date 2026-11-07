// Adresses de l'appli dans l'App Store et Google Play (Philippe, 2026-11-07).
// Le patient s'inscrit et paie sur le site ; à la fin de son inscription,
// /patient/appli lui propose de télécharger l'appli. Tant que ces adresses
// ne sont pas renseignées sur Scalingo, rien ne s'affiche :
//   - APP_STORE_URL : ex. https://apps.apple.com/fr/app/easyphysio/id1234567890
//   - PLAY_STORE_URL : ex. https://play.google.com/store/apps/details?id=fr.easyphysio.app
// (Redéployer après les avoir renseignées : la bannière iPhone est fixée à la
// construction du site.)

export type StoreLinks = { ios: string | null; android: string | null };

function clean(v: string | undefined): string | null {
  const s = v?.trim();
  return s && /^https:\/\//.test(s) ? s : null;
}

export function storeLinks(): StoreLinks {
  return { ios: clean(process.env.APP_STORE_URL), android: clean(process.env.PLAY_STORE_URL) };
}

/** Identifiant numérique de l'appli chez Apple (bannière « Ouvrir dans l'App Store » de Safari). */
export function appStoreId(url: string | null = storeLinks().ios): string | null {
  return /\/id(\d+)/.exec(url ?? "")?.[1] ?? null;
}

/** Téléphone du visiteur, d'après son navigateur : pour ne montrer que le bon magasin. */
export function phoneFromUserAgent(ua: string | null | undefined): "ios" | "android" | null {
  if (/iPhone|iPad|iPod/i.test(ua ?? "")) return "ios";
  if (/Android/i.test(ua ?? "")) return "android";
  return null;
}
