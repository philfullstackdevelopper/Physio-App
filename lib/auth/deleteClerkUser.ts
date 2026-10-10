import { clerkClient } from "@clerk/nextjs/server";

/**
 * Supprime un identifiant de connexion Clerk, avec plusieurs tentatives.
 *
 * (Philippe, 2026-10-10 : après une suppression de compte, la personne doit
 * pouvoir se réinscrire chez un autre kiné avec le même e-mail.) Avant, un
 * seul essai : un raté passager de l'API Clerk laissait l'identifiant en
 * place, l'e-mail restait pris (« Un compte existe déjà avec cette adresse »)
 * et personne n'était prévenu. Renvoie `true` si l'identifiant n'existe plus.
 *
 * Server-only. Ne décide PAS si la suppression est légitime : l'appelant doit
 * avoir vérifié que cet identifiant est bien celui de la personne concernée
 * (jamais sur la seule foi d'un e-mail — audit du 2026-10-08).
 */
export async function deleteClerkUserWithRetry(clerkId: string, attempts = 3): Promise<boolean> {
  const client = await clerkClient();
  for (let i = 0; i < attempts; i++) {
    try {
      await client.users.deleteUser(clerkId);
      return true;
    } catch (err) {
      // Déjà supprimé : c'est le résultat voulu.
      if ((err as { status?: number })?.status === 404) return true;
      console.error(`deleteClerkUserWithRetry: tentative ${i + 1}/${attempts} échouée (clerkId ${clerkId})`, err);
      if (i < attempts - 1) await new Promise((r) => setTimeout(r, 400 * (i + 1)));
    }
  }
  return false;
}
