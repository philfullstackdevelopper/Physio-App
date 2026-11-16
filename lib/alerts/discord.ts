import "server-only";

// Alerte instantanée pour Philippe sur Discord (2026-11-16 : « une alerte
// tout de suite quand un kiné s'inscrit, pas par e-mail »). Le serveur poste
// un message dans un salon Discord via son « webhook » (adresse secrète,
// créée par Philippe dans Discord et rangée dans la variable Scalingo
// DISCORD_ALERTS_WEBHOOK_URL). Sans cette variable : rien n'est envoyé.
//
// Aucun nom, e-mail ni cabinet dans le message (Discord est un service
// américain) : seulement ce qui s'est passé et le lien vers /admin, où
// Philippe voit qui. Ne lève jamais d'erreur, n'attend pas plus de 3 s.

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

/** Les deux moments d'une inscription kiné. */
export function alertKineSignup(step: "compte_cree" | "terminee" | "directe"): Promise<boolean> {
  const text =
    step === "compte_cree"
      ? "🆕 Un kiné vient de créer son compte (cabinet pas encore renseigné)."
      : step === "directe"
        ? "✅ Un kiné vient de s'inscrire — il est dans l'appli."
        : "✅ Un kiné vient de terminer son inscription — il est dans l'appli.";
  return alertDiscord(text);
}
