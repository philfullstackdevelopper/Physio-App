"use server";

import { lookupRpps, type RppsMatch } from "@/lib/instructor/rppsLookup";
import { searchCabinets, type CabinetSearchResult } from "@/lib/db/cabinets";
import { headers } from "next/headers";
import { clientIp, createRateLimiter } from "@/lib/rateLimit";

// Ces deux actions sont appelables sans compte (audit du 2026-11-10) : un
// frein par adresse IP (mémoire du serveur, lib/rateLimit.ts) empêche un robot
// d'aspirer la liste des cabinets ou d'user notre quota de l'Annuaire Santé.
// Au-delà, la réponse est la même que « rien trouvé ».
//  - annuaire : 10 recherches par 10 minutes (une suffit pour s'inscrire) ;
//  - cabinets : 60 par 5 minutes (la recherche part à chaque frappe).
const rppsLimiter = createRateLimiter({ limit: 10, windowMs: 10 * 60 * 1000 });
const cabinetSearchLimiter = createRateLimiter({ limit: 60, windowMs: 5 * 60 * 1000 });

// Bouton « Retrouver mon cabinet » du formulaire d'inscription kiné : appelé
// avant la création du compte, il ne lit que l'Annuaire Santé (public) et ne
// renvoie que ce qui sert à pré-remplir le formulaire. Rien n'est enregistré.
export async function findCabinetByRpps(rppsNumber: string): Promise<RppsMatch | null> {
  const rpps = String(rppsNumber ?? "").replace(/\s+/g, "");
  if (!/^\d{9,11}$/.test(rpps)) return null;
  if (!rppsLimiter.allow(clientIp(await headers()))) return null;
  return lookupRpps(rpps);
}

// Recherche « Votre cabinet est-il déjà sur EasyPhysio ? » (Philippe,
// 2026-11-08) : appelée avant la création du compte. Ne renvoie que nom,
// ville et nombre de kinés — jamais qui ils sont (migration 0085).
export async function searchCabinetsForSignup(query: string): Promise<CabinetSearchResult[]> {
  const q = String(query ?? "").trim();
  if (q.length < 2 || q.length > 80) return [];
  if (!cabinetSearchLimiter.allow(clientIp(await headers()))) return [];
  try {
    return await searchCabinets(q);
  } catch (e) {
    console.error("searchCabinetsForSignup", e);
    return [];
  }
}
