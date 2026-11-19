import { splitPostalCity } from "../cabinet/address.ts";

// Texte des alertes Discord (lib/alerts/discord.ts) — logique pure, testée
// dans discordText.test.ts.

/** Texte saisi par le kiné, rendu inoffensif pour Discord (pas de mise en
 *  forme, pas de lien, pas de mention). */
export function plain(text: string, max = 80): string {
  return text
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max)
    .replace(/[\\*_~`|>#[\]()<@:]/g, (c) => "\\" + c);
}

/** « Marie Dupont · 69003 Lyon » (ville tirée de l'adresse du cabinet). */
export function whoLine(name: string | null | undefined, cabinetAddress: string | null | undefined): string {
  const n = plain(name || "") || "Nom non renseigné";
  const { postalCode, city } = splitPostalCity(cabinetAddress || "");
  const place = city ? plain([postalCode, city].filter(Boolean).join(" "), 70) : null;
  return place ? `${n} · ${place}` : n;
}

export function kineSignupText(step: "compte_cree" | "terminee" | "directe", line: string): string {
  return step === "compte_cree"
    ? `🆕 Nouveau compte kiné : **${line}** (cabinet pas encore renseigné)`
    : `✅ Nouveau kiné inscrit : **${line}** — il est dans l'appli`;
}

/** Événements d'argent signalés sur Discord (2026-11-19, Philippe : « je veux
 *  une notif quand il y a un paiement »). Montants seulement : jamais de nom
 *  de patient ni de donnée de santé. */
export type MoneyEvent =
  | "subscription_started"
  | "access_paid"
  | "access_failed"
  | "kine_paid"
  | "kine_failed"
  | "refund"
  | "dispute";

/** « 6,99 € » (euros) ou « 12,00 GBP » (autre monnaie). */
export function formatAmount(cents: number | null | undefined, currency: string | null | undefined): string {
  const value = ((cents ?? 0) / 100).toFixed(2).replace(".", ",");
  const cur = (currency || "eur").toLowerCase();
  return cur === "eur" ? `${value} €` : `${value} ${cur.toUpperCase()}`;
}

export function moneyAlertText(
  event: MoneyEvent,
  amount: { cents?: number | null; currency?: string | null } = {},
  live = true,
): string {
  const a = formatAmount(amount.cents, amount.currency);
  const text: Record<MoneyEvent, string> = {
    subscription_started: "🧾 Nouveau patient abonné : essai gratuit démarré",
    access_paid: `💶 Paiement reçu (accès EasyPhysio) : **${a}**`,
    access_failed: `⚠️ Paiement refusé (accès EasyPhysio) : ${a}`,
    kine_paid: `💶 Honoraires payés à un kiné : **${a}** (sur son compte)`,
    kine_failed: `⚠️ Honoraires refusés pour un kiné : ${a}`,
    refund: `↩️ Remboursement : ${a}`,
    dispute: `🚨 Litige bancaire ouvert : ${a}`,
  };
  return live ? text[event] : `[test] ${text[event]}`;
}
