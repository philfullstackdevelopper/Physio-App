import "server-only";
import { kineSignupText, whoLine } from "./discordText";

// Alerte instantanée pour Philippe sur Discord (2026-11-16 : « une alerte
// tout de suite quand un kiné s'inscrit, pas par e-mail »). Le serveur poste
// un message dans un salon Discord via son « webhook » (adresse secrète,
// créée par Philippe dans Discord et rangée dans la variable Scalingo
// DISCORD_ALERTS_WEBHOOK_URL). Sans cette variable : rien n'est envoyé.
//
// Contenu : nom du kiné et ville du cabinet (Philippe, 2026-11-16) — des
// données professionnelles, jamais de donnée de patient ni de santé. Pas
// d'e-mail, de téléphone, de RPPS ni d'adresse complète : le détail est dans
// /admin. Ne lève jamais d'erreur, n'attend pas plus de 3 s.

const ADMIN_URL = `${process.env.NEXT_PUBLIC_SITE_URL || "https://easyphysio.fr"}/admin#activite`;

export async function alertDiscord(text: string): Promise<boolean> {
  const url = process.env.DISCORD_ALERTS_WEBHOOK_URL;
  if (!url || !/^https:\/\/(discord|discordapp)\.com\/api\/webhooks\//.test(url)) return false;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        username: "EasyPhysio",
        content: `${text}\n${ADMIN_URL}`,
        allowed_mentions: { parse: [] },
      }),
      signal: AbortSignal.timeout(3000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Les deux moments d'une inscription kiné (texte : discordText.ts). */
export function alertKineSignup(
  step: "compte_cree" | "terminee" | "directe",
  who: { name?: string | null; cabinetAddress?: string | null } = {},
): Promise<boolean> {
  return alertDiscord(kineSignupText(step, whoLine(who.name, who.cabinetAddress)));
}
