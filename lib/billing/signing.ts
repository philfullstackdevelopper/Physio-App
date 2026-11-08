// Signatures HMAC des metadata posées par EasyPhysio chez Stripe (comptes
// Connect des kinés, abonnements, paiements des honoraires, cartes).
//
// Les comptes Stripe des kinés sont « Standard » : un kiné pourrait écrire à
// la main des metadata de son choix. Seul ce qu'EasyPhysio a signé avec une
// clé que le kiné ne connaît pas est cru par le serveur.
//
// Clé (audit Stripe du 2026-11-08) : STRIPE_SIGNING_SECRET, une clé dédiée.
// Tant qu'elle n'est pas posée, on signe avec STRIPE_SECRET_KEY comme avant.
// La vérification accepte les deux clés : les signatures déjà posées chez
// Stripe avec STRIPE_SECRET_KEY restent valables après l'ajout de la clé
// dédiée. Une fois la clé dédiée posée, changer la clé Stripe ne casse plus
// les nouvelles signatures.
import { createHmac, timingSafeEqual } from "node:crypto";

function keys(): string[] {
  const list = [process.env.STRIPE_SIGNING_SECRET, process.env.STRIPE_SECRET_KEY].filter((k): k is string => !!k);
  if (list.length === 0) throw new Error("STRIPE_SIGNING_SECRET / STRIPE_SECRET_KEY is not set.");
  return list;
}

function hmacWith(key: string, payload: string): string {
  return createHmac("sha256", key).update(payload).digest("hex");
}

/** Signature à poser chez Stripe (clé dédiée si présente, sinon la clé Stripe). */
export function sign(payload: string): string {
  return hmacWith(keys()[0], payload);
}

function sameHex(given: string, expected: string): boolean {
  const a = Buffer.from(given, "hex");
  const b = Buffer.from(expected, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Vrai si `given` est une signature valide de `payload` avec l'une des clés connues. */
export function verify(payload: string, given: string | null | undefined): boolean {
  if (!given || !/^[0-9a-f]+$/i.test(given)) return false;
  return keys().some((k) => sameHex(given, hmacWith(k, payload)));
}
