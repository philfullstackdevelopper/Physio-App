"use server";

import { lookupRpps, type RppsMatch } from "@/lib/instructor/rppsLookup";

// Bouton « Retrouver mon cabinet » du formulaire d'inscription kiné : appelé
// avant la création du compte, il ne lit que l'Annuaire Santé (public) et ne
// renvoie que ce qui sert à pré-remplir le formulaire. Rien n'est enregistré.
export async function findCabinetByRpps(rppsNumber: string): Promise<RppsMatch | null> {
  const rpps = String(rppsNumber ?? "").replace(/\s+/g, "");
  if (!/^\d{9,11}$/.test(rpps)) return null;
  return lookupRpps(rpps);
}
