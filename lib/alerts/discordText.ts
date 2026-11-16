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
