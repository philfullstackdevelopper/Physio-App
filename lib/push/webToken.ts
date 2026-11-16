// Abonnement web d'un téléphone (site ajouté à l'écran d'accueil), rangé tel
// quel dans push_tokens.token (migration 0092), plateforme « web ».
// Fichier sans dépendance serveur : utilisable partout.

export type WebPushSubscription = { endpoint: string; keys: { p256dh: string; auth: string } };

const KEY = /^[A-Za-z0-9_-]{8,200}={0,2}$/;

/** Texte rangé en base : toujours le même ordre de champs, pour qu'un même
 *  abonnement donne toujours le même jeton. */
export function webPushToken(sub: WebPushSubscription): string {
  return JSON.stringify({ endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } });
}

/** Abonnement valide (adresse https, clés au bon format), sinon null. */
export function parseWebPushToken(raw: unknown): WebPushSubscription | null {
  let v: unknown = raw;
  if (typeof raw === "string") {
    if (!raw.startsWith("{")) return null;
    try {
      v = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  const s = v as Partial<WebPushSubscription> | null;
  if (!s || typeof s.endpoint !== "string" || !/^https:\/\/[^\s]{10,600}$/.test(s.endpoint)) return null;
  if (!s.keys || typeof s.keys.p256dh !== "string" || typeof s.keys.auth !== "string") return null;
  if (!KEY.test(s.keys.p256dh) || !KEY.test(s.keys.auth)) return null;
  return { endpoint: s.endpoint, keys: { p256dh: s.keys.p256dh, auth: s.keys.auth } };
}
