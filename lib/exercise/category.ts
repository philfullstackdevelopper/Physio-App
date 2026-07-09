// =============================================================================
// Exercise categories — group the library by body area for the séance editor.
// Category is derived from the exercise name (no DB column needed).
// =============================================================================

export const CATEGORY_ORDER = [
  "Cheville & pied",
  "Genou & jambe",
  "Hanche & fessiers",
  "Dos & lombaires",
  "Cervicales & cou",
  "Épaule",
  "Poignet, main & coude",
  "Tronc, gainage & abdominaux",
  "Équilibre & général",
] as const;

export type Category = (typeof CATEGORY_ORDER)[number];

/** Assign an exercise to a body-area category (first matching rule wins). */
export function categoryFor(name: string): Category {
  const n = name.toLowerCase();

  if (n.includes("sur place")) return "Équilibre & général";

  if (
    n.includes("cervical") || n.includes("menton") || n.includes("nuque") ||
    n.includes("trapèze") || n.includes("angulaire") || n.includes("inclinaison") ||
    /\bcou\b/.test(n) // whole word "cou" — avoids matching "coude"
  )
    return "Cervicales & cou";

  if (
    n.includes("épaule") || n.includes("scapulaire") || n.includes("pendulaire") ||
    n.includes("rétropulsion") || n.includes("doigts au mur") || n.includes("bras") ||
    n.includes("élévation") || n.includes("rotation externe") || n.includes("rotation interne")
  )
    return "Épaule";

  if (
    n.includes("poignet") || n.includes("serrage") || n.includes("doigts") ||
    n.includes("coude") || n.includes("épicondyl") || n.includes("bouteille")
  )
    return "Poignet, main & coude";

  if (
    n.includes("cheville") || n.includes("mollet") || n.includes("pointe") ||
    n.includes("éversion") || n.includes("eversion") || n.includes("inversion") ||
    n.includes("orteils") || n.includes("talons") || n.includes("alphabet") ||
    n.includes("dorsale")
  )
    return "Cheville & pied";

  if (
    n.includes("hanche") || n.includes("coquille") || n.includes("clam") ||
    n.includes("marche latérale") || n.includes("fessier") || n.includes("piriforme") ||
    n.includes("psoas")
  )
    return "Hanche & fessiers";

  if (
    n.includes("gainage") || n.includes("planche") || n.includes("crunch") ||
    n.includes("abdominal") || n.includes("respiration") || n.includes("tronc") ||
    n.includes("postural")
  )
    return "Tronc, gainage & abdominaux";

  if (
    n.includes("genou") || n.includes("quadriceps") || n.includes("assis-debout") ||
    n.includes("mini-squat") || n.includes("montée de marche") || n.includes("squat") ||
    n.includes("fente") || n.includes("ischio")
  )
    return "Genou & jambe";

  if (
    n.includes("lombaire") || n.includes("bascule du bassin") || n.includes("chat-vache") ||
    n.includes("quadrupède") || n.includes("cobra") || n.includes("boule") || n.includes("dos")
  )
    return "Dos & lombaires";

  return "Équilibre & général";
}
