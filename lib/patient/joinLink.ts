// =============================================================================
// Lien personnel d'un kiné pour que ses patients le rejoignent (QR code ou
// lien à partager — Philippe, 2026-11-04). Le lien porte l'identifiant du
// kiné et une signature : personne ne peut fabriquer le lien d'un autre kiné
// (la clé est un secret serveur que personne ne voit).
//
//   /rejoindre/<identifiant du kiné>.<signature>
//
// SERVEUR UNIQUEMENT.
// =============================================================================
import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function key(): string {
  const k = process.env.CLERK_SECRET_KEY;
  if (!k) throw new Error("CLERK_SECRET_KEY is not set.");
  return k;
}

function signature(instructorId: string): string {
  return createHmac("sha256", key()).update(`join-link:${instructorId.toLowerCase()}`).digest("base64url").slice(0, 16);
}

/** Code à mettre dans l'adresse /rejoindre/<code>. */
export function joinCodeFor(instructorId: string): string {
  return `${instructorId.toLowerCase()}.${signature(instructorId)}`;
}

/** Identifiant du kiné si le code est authentique, sinon null. */
export function instructorIdFromJoinCode(code: string): string | null {
  const [id, sig] = decodeURIComponent(code).split(".");
  if (!id || !sig || !UUID.test(id)) return null;
  const expected = Buffer.from(signature(id));
  const given = Buffer.from(sig);
  return given.length === expected.length && timingSafeEqual(given, expected) ? id.toLowerCase() : null;
}
