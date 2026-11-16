// Deux fiches de cabinet désignent-elles probablement le même cabinet ?
// (Philippe, 2026-11-16 : deux collègues qui s'inscrivent en même temps ne
// doivent pas créer deux cabinets sans le savoir.) Logique pure, testée par
// similar.test.ts. Utilisée à l'inscription (alerte « ce cabinet existe
// peut-être déjà ») et dans /admin (repérer les doublons à fusionner).
//
// Règle : même code postal (filtré avant, en base) ET
//   - même adresse une fois normalisée, OU
//   - au moins un mot significatif du nom en commun (« Kiné du Parc » et
//     « Cabinet de kinésithérapie du Parc » partagent « parc »).
// Les mots génériques (cabinet, kiné, centre, de, du…) ne comptent pas.

import { splitPostalCity } from "./address.ts";

const STOP = new Set([
  "cabinet", "cabinets", "centre", "center", "maison", "pole", "espace", "institut", "clinique", "groupe", "sante",
  "kine", "kines", "kinesitherapie", "kinesitherapeute", "kinesitherapeutes", "kinesie", "masseur", "masseurs",
  "physio", "physiotherapie", "physiotherapeute", "reeducation", "readaptation", "osteo", "osteopathie", "sport", "sports",
  "medical", "paramedical", "pluridisciplinaire", "des", "les", "la", "le", "de", "du", "d", "l", "et", "a", "au", "aux",
  "en", "sur", "sous", "rue", "avenue", "av", "bd", "boulevard", "place", "chemin", "route", "allee", "impasse", "quai",
  "scm", "selarl", "sarl", "sas", "sel", "sci",
  // Audit du 2026-11-16 (C2) : trop courants dans les noms pour signaler un doublon.
  "saint", "sainte", "st", "ste", "grand", "petit", "nord", "sud", "est", "ouest", "centre-ville", "ville",
]);

export function normalizeWords(text: string | null | undefined): string[] {
  return (text ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((w) => w.length >= 2 && !STOP.has(w));
}

function normalizeAddress(address: string | null | undefined): string {
  return (address ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Mots de la ville d'un cabinet (champ ville, sinon tirée de l'adresse). */
function cityWords(c: { address?: string | null; city?: string | null }): string[] {
  return normalizeWords(c.city ?? splitPostalCity(c.address ?? "").city ?? "");
}

/** Vrai si les deux cabinets (déjà dans le même code postal) se ressemblent. */
export function looksLikeSameCabinet(
  a: { name: string; address?: string | null; city?: string | null },
  b: { name: string; address?: string | null; city?: string | null },
): boolean {
  const addrA = normalizeAddress(a.address);
  const addrB = normalizeAddress(b.address);
  if (addrA && addrA === addrB) return true;
  // Le nom de la ville ne compte pas : « Kiné Paris Bastille » et « Cabinet
  // Paris Voltaire » ne sont pas le même cabinet (audit du 2026-11-16, C2).
  const ignore = new Set([...cityWords(a), ...cityWords(b)]);
  const significant = (name: string) => normalizeWords(name).filter((w) => !/^\d+$/.test(w) && !ignore.has(w));
  const wordsA = new Set(significant(a.name));
  if (wordsA.size === 0) return false;
  return significant(b.name).some((w) => wordsA.has(w));
}
