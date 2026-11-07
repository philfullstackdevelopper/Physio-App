import { IN_APP_HOSTS, SITE_URL } from "./config";

/** Adresse à ouvrir dans l'appli pour un lien reçu (lien d'invitation, QR code,
 *  notification, « easyphysio://… »), ou null si ce n'est pas un lien du site. */
export function toSiteUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  try {
    // Chemin seul (« /patient/messages »), venu d'une notification.
    if (raw.startsWith("/")) return `${SITE_URL}${raw}`;
    const url = new URL(raw);
    if (url.protocol === "easyphysio:") {
      // easyphysio://rejoindre/abc → /rejoindre/abc
      const path = `/${url.host}${url.pathname}`.replace(/\/+$/, "") || "/";
      return `${SITE_URL}${path}${url.search}`;
    }
    if ((url.protocol === "https:" || url.protocol === "http:") && IN_APP_HOSTS.includes(url.hostname)) {
      return `${SITE_URL}${url.pathname}${url.search}`;
    }
  } catch {
    return null;
  }
  return null;
}

/** Ce lien doit-il s'ouvrir dans l'appli (sinon : navigateur du téléphone) ? */
export function opensInApp(rawUrl: string): boolean {
  if (rawUrl.startsWith("about:") || rawUrl.startsWith("data:") || rawUrl.startsWith("blob:")) return true;
  try {
    const url = new URL(rawUrl);
    return (url.protocol === "https:" || url.protocol === "http:") && IN_APP_HOSTS.includes(url.hostname);
  } catch {
    return false;
  }
}
