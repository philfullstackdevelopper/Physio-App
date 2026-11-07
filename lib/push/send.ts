import "server-only";
import { forgetPushTokens } from "./db";

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
  const valid = messages.filter((m) => isExpoPushToken(m.to));
  let sent = 0;
  let failed = 0;
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
