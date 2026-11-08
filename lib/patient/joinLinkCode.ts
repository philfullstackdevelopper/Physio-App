// =============================================================================
// Signature du lien « Rejoindre mon kiné » — logique pure, sans variable
// d'environnement (testée par joinLinkCode.test.ts). Le serveur l'utilise via
// lib/patient/joinLink.ts, qui fournit les clés.
//
// Rotation de clé (audit du 2026-11-08) : on signe avec UNE clé (la nouvelle,
// JOIN_LINK_SECRET), mais on accepte TOUTES les clés connues (dont l'ancienne,
// CLERK_SECRET_KEY) : les QR codes déjà imprimés continuent de marcher.
// =============================================================================
import { createHmac, timingSafeEqual } from "node:crypto";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function signature(key: string, instructorId: string): string {
  return createHmac("sha256", key).update(`join-link:${instructorId.toLowerCase()}`).digest("base64url").slice(0, 16);
}

/** Code à mettre dans l'adresse /rejoindre/<code>, signé avec `key`. */
export function signJoinCode(key: string, instructorId: string): string {
  return `${instructorId.toLowerCase()}.${signature(key, instructorId)}`;
}

/** Identifiant du kiné si le code est signé par l'une des clés, sinon null. */
export function verifyJoinCode(keys: readonly string[], code: string): string | null {
  let decoded: string;
  try {
    decoded = decodeURIComponent(code);
  } catch {
    return null;
  }
  const [id, sig, extra] = decoded.split(".");
  if (!id || !sig || extra !== undefined || !UUID.test(id)) return null;
  const given = Buffer.from(sig);
  for (const key of keys) {
    if (!key) continue;
    const expected = Buffer.from(signature(key, id));
    if (given.length === expected.length && timingSafeEqual(given, expected)) return id.toLowerCase();
  }
  return null;
}
