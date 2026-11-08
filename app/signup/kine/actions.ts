"use server";

import { lookupRpps, type RppsMatch } from "@/lib/instructor/rppsLookup";
import { searchCabinets, type CabinetSearchResult } from "@/lib/db/cabinets";

// Bouton « Retrouver mon cabinet » du formulaire d'inscription kiné : appelé
// avant la création du compte, il ne lit que l'Annuaire Santé (public) et ne
// renvoie que ce qui sert à pré-remplir le formulaire. Rien n'est enregistré.
export async function findCabinetByRpps(rppsNumber: string): Promise<RppsMatch | null> {
  const rpps = String(rppsNumber ?? "").replace(/\s+/g, "");
  if (!/^\d{9,11}$/.test(rpps)) return null;
  return lookupRpps(rpps);
}

// Recherche « Votre cabinet est-il déjà sur EasyPhysio ? » (Philippe,
// 2026-11-08) : appelée avant la création du compte. Ne renvoie que nom,
// ville et nombre de kinés — jamais qui ils sont (migration 0085).
export async function searchCabinetsForSignup(query: string): Promise<CabinetSearchResult[]> {
  const q = String(query ?? "").trim();
  if (q.length < 2 || q.length > 80) return [];
  try {
    return await searchCabinets(q);
  } catch (e) {
    console.error("searchCabinetsForSignup", e);
    return [];
  }
}
