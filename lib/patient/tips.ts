import { localDateKey } from "./weeks";
import type { Locale } from "../../i18n/locales";
import { libTranslator } from "../i18n/translator";
import fr from "../../messages/fr/patient.json";
import en from "../../messages/en/patient.json";

// Same "one per day, same for everyone" pattern as quoteOfTheDay — practical
// rehab habits rather than motivational lines, for the "Conseil du jour" card
// on /patient/programme (Philippe, 2026-09-08). Textes dans
// messages/<langue>/patient.json (« tips », t0…t9).
const TIP_COUNT = 10;

function dateHash(dateKey: string, salt: string): number {
  let h = 0;
  const s = salt + dateKey;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export function tipOfTheDay(now: Date = new Date(), locale: Locale = "fr"): string {
  const t = libTranslator(locale, { fr, en }, "tips");
  return t(`t${dateHash(localDateKey(now), "tip") % TIP_COUNT}`);
}
