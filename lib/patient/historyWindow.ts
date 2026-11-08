// Jour d'une séance pour l'Historique du patient (liste et détail).
import type { Locale } from "../../i18n/locales.ts";
import { intlTag } from "../i18n/translator.ts";

/** Libellé du jour d'une séance ; sert aussi de clé de regroupement. */
export function formatHistoryDay(iso: string, locale: Locale = "fr") {
  return new Date(iso).toLocaleDateString(intlTag(locale), { weekday: "long", day: "numeric", month: "long" });
}
