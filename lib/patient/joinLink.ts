// =============================================================================
// Lien personnel d'un kiné pour que ses patients le rejoignent (QR code ou
// lien à partager — Philippe, 2026-11-04). Le lien porte l'identifiant du
// kiné et une signature : personne ne peut fabriquer le lien d'un autre kiné
// (la clé est un secret serveur que personne ne voit).
//
//   /rejoindre/<identifiant du kiné>.<signature>
//
// Clé (audit du 2026-11-08) : JOIN_LINK_SECRET, un secret dédié. Avant, la
// signature utilisait CLERK_SECRET_KEY ; elle reste ACCEPTÉE en lecture pour
// que les QR codes déjà imprimés marchent toujours, mais les nouveaux liens
// sont signés avec JOIN_LINK_SECRET dès qu'il est réglé sur Scalingo.
//
// SERVEUR UNIQUEMENT.
// =============================================================================
import "server-only";
import { signJoinCode, verifyJoinCode } from "./joinLinkCode";

function signingKey(): string {
  const k = process.env.JOIN_LINK_SECRET || process.env.CLERK_SECRET_KEY;
  if (!k) throw new Error("JOIN_LINK_SECRET (ou CLERK_SECRET_KEY) n'est pas réglé.");
  return k;
}

function verifyingKeys(): string[] {
  return [process.env.JOIN_LINK_SECRET, process.env.CLERK_SECRET_KEY].filter((k): k is string => !!k);
}

/** Code à mettre dans l'adresse /rejoindre/<code>. */
export function joinCodeFor(instructorId: string): string {
  return signJoinCode(signingKey(), instructorId);
}

/** Identifiant du kiné si le code est authentique, sinon null. */
export function instructorIdFromJoinCode(code: string): string | null {
  return verifyJoinCode(verifyingKeys(), code);
}
