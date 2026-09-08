import { localDateKey } from "@/lib/patient/weeks";

// Same quote for every patient on a given calendar day (deterministic by
// date, not random per request) — so it reads as "today's quote", not a
// flicker on every page load.
const QUOTES: { text: string; author: string }[] = [
  { text: "Chaque petit pas compte. Vous êtes plus fort·e que vous ne le pensez.", author: "Anonyme" },
  { text: "La régularité bat l'intensité. Une séance à la fois.", author: "Anonyme" },
  { text: "Le corps qui guérit est un corps qui bouge, à son rythme.", author: "Anonyme" },
  { text: "Progresser, ce n'est pas ne jamais reculer, c'est continuer d'avancer.", author: "Anonyme" },
  { text: "Votre seule comparaison, c'est vous-même la semaine dernière.", author: "Anonyme" },
  { text: "La patience est aussi un exercice de rééducation.", author: "Anonyme" },
  { text: "Un jour difficile ne défait pas des semaines de progrès.", author: "Anonyme" },
  { text: "Se soigner, c'est aussi apprendre à s'écouter.", author: "Anonyme" },
  { text: "Chaque séance rapproche un peu plus du mouvement retrouvé.", author: "Anonyme" },
  { text: "La motivation vous met en route, l'habitude vous y maintient.", author: "Anonyme" },
  { text: "Aujourd'hui compte autant que demain.", author: "Anonyme" },
  { text: "Le repos fait partie de l'entraînement, pas une exception à la règle.", author: "Anonyme" },
];

/** Simple deterministic hash of a "YYYY-MM-DD" key, stable across a day. */
function dateHash(dateKey: string): number {
  let h = 0;
  for (let i = 0; i < dateKey.length; i++) h = (h * 31 + dateKey.charCodeAt(i)) >>> 0;
  return h;
}

export function quoteOfTheDay(now: Date = new Date()): { text: string; author: string } {
  const index = dateHash(localDateKey(now)) % QUOTES.length;
  return QUOTES[index];
}
