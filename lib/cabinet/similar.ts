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

const STOP = new Set([
  "cabinet", "cabinets", "centre", "center", "maison", "pole", "espace", "institut", "clinique", "groupe", "sante",
  "kine", "kines", "kinesitherapie", "kinesitherapeute", "kinesitherapeutes", "kinesie", "masseur", "masseurs",
  "physio", "physiotherapie", "physiotherapeute", "reeducation", "readaptation", "osteo", "osteopathie", "sport", "sports",
  "medical", "paramedical", "pluridisciplinaire", "des", "les", "la", "le", "de", "du", "d", "l", "et", "a", "au", "aux",
  "en", "sur", "sous", "rue", "avenue", "av", "bd", "boulevard", "place", "chemin", "route", "allee", "impasse", "quai",
  "scm", "selarl", "sarl", "sas", "sel", "sci",
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

/** Vrai si les deux cabinets (déjà dans le même code postal) se ressemblent. */
export function looksLikeSameCabinet(
  a: { name: string; address?: string | null },
  b: { name: string; address?: string | null },
): boolean {
  const addrA = normalizeAddress(a.address);
  const addrB = normalizeAddress(b.address);
  if (addrA && addrA === addrB) return true;
  const wordsA = new Set(normalizeWords(a.name).filter((w) => !/^\d+$/.test(w)));
  if (wordsA.size === 0) return false;
  return normalizeWords(b.name).some((w) => wordsA.has(w));
}
