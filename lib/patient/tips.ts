import { localDateKey } from "@/lib/patient/weeks";

// Same "one per day, same for everyone" pattern as quoteOfTheDay — practical
// rehab habits rather than motivational lines, for the "Conseil du jour" card
// on /patient/programme (Philippe, 2026-09-08).
const TIPS: string[] = [
  "Échauffez-vous 2 à 3 minutes avant de commencer, même pour une séance courte.",
  "Respirez normalement pendant l'effort — ne bloquez jamais votre respiration.",
  "Une douleur vive doit faire arrêter l'exercice ; une gêne légère et supportable est normale.",
  "Faites vos séances à heure fixe : elles deviennent vite un réflexe, pas un effort de volonté.",
  "Buvez un verre d'eau avant de commencer, surtout par temps chaud.",
  "La qualité du mouvement compte plus que la vitesse — ralentissez si besoin.",
  "Un sol stable et un espace dégagé suffisent, pas besoin de matériel particulier.",
  "Notez ce que vous ressentez après la séance : votre kiné en tient compte.",
  "La régularité prime sur l'intensité — mieux vaut 3 séances courtes qu'une longue et rare.",
  "Étirez-vous doucement en fin de séance pour terminer sur une sensation agréable.",
];

function dateHash(dateKey: string, salt: string): number {
  let h = 0;
  const s = salt + dateKey;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export function tipOfTheDay(now: Date = new Date()): string {
  return TIPS[dateHash(localDateKey(now), "tip") % TIPS.length];
}
