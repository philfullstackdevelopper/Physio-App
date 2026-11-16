import "server-only";
import webpush from "web-push";
import { forgetPushTokens } from "./db";
import { parseWebPushToken } from "./webToken";

// Site ajouté à l'écran d'accueil (migration 0092) : son « jeton » est
// l'abonnement web du navigateur (adresse d'envoi + clés), envoyé directement
// au service du navigateur (Apple, Google, Mozilla), signé avec nos clés VAPID
// (NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT). Sans ces
// clés : rien n'est envoyé vers le web, l'appli mobile n'est pas concernée.
async function sendWebPush(messages: PushMessage[]): Promise<{ sent: number; failed: number }> {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (messages.length === 0 || !publicKey || !privateKey) return { sent: 0, failed: messages.length };
  const vapid = { subject: process.env.VAPID_SUBJECT || "mailto:contact@easyphysio.fr", publicKey, privateKey };
  let sent = 0;
  let failed = 0;
  const dead: string[] = [];
  await Promise.all(
    messages.map(async (m) => {
      const sub = parseWebPushToken(m.to)!;
      try {
        await webpush.sendNotification(sub, JSON.stringify({ title: m.title, body: m.body, url: m.url }), {
          vapidDetails: vapid,
          TTL: 60 * 60 * 12,
          timeout: 8000,
        });
        sent++;
      } catch (e) {
        failed++;
        const status = (e as { statusCode?: number }).statusCode;
        // 404 / 410 : abonnement expiré ou site retiré de l'écran d'accueil.
        if (status === 404 || status === 410) dead.push(m.to);
        else console.error("[push] envoi web impossible :", status ?? e);
      }
    }),
  );
  if (dead.length) await forgetPushTokens(dead).catch((e) => console.error("[push] nettoyage impossible :", e));
  return { sent, failed };
}

// Envoi des notifications par le service d'Expo (l'appli mobile est faite avec
// Expo : il relaie vers Apple et Google). EXPO_ACCESS_TOKEN est facultatif
// (envois signés, à activer dans le compte Expo).
//
// Confidentialité (données de santé) : jamais le contenu d'un message ni un
// nom de patient dans la notification — elle s'affiche sur l'écran verrouillé.

export type PushMessage = {
  to: string;
  title: string;
  body: string;
  /** Page de l'appli à ouvrir quand on touche la notification. */
  url: string;
};

const ENDPOINT = "https://exp.host/--/api/v2/push/send";

export function isExpoPushToken(t: unknown): t is string {
  return typeof t === "string" && /^Expo(nent)?PushToken\[[A-Za-z0-9_-]{10,}\]$/.test(t);
}

export async function sendPush(messages: PushMessage[]): Promise<{ sent: number; failed: number }> {
  const web = await sendWebPush(messages.filter((m) => parseWebPushToken(m.to)));
  const valid = messages.filter((m) => isExpoPushToken(m.to));
  let sent = web.sent;
  let failed = web.failed;
  const dead: string[] = [];
  for (let i = 0; i < valid.length; i += 100) {
    const chunk = valid.slice(i, i + 100);
    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "application/json",
          ...(process.env.EXPO_ACCESS_TOKEN ? { authorization: `Bearer ${process.env.EXPO_ACCESS_TOKEN}` } : {}),
        },
        body: JSON.stringify(chunk.map((m) => ({ to: m.to, title: m.title, body: m.body, sound: "default", data: { url: m.url } }))),
        signal: AbortSignal.timeout(8000),
      });
      const json = (await res.json().catch(() => null)) as { data?: { status: string; details?: { error?: string } }[] } | null;
      (json?.data ?? []).forEach((r, j) => {
        if (r.status === "ok") sent++;
        else {
          failed++;
          if (r.details?.error === "DeviceNotRegistered") dead.push(chunk[j].to);
        }
      });
    } catch (e) {
      failed += chunk.length;
      console.error("[push] envoi impossible :", e);
    }
  }
  if (dead.length) await forgetPushTokens(dead).catch((e) => console.error("[push] nettoyage impossible :", e));
  return { sent, failed };
}
