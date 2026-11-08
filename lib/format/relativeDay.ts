// Libellés relatifs partagés par le tableau de bord, le tableau des patients
// et la fiche patient — une seule façon de dire « quand ».
//
// Langue : sans traducteur, tout reste en français (tests, anciens appels).
// L'appelant qui connaît la langue passe la locale (dates) et un traducteur
// de « dashboard.lib » (useTranslations / getTranslations) — pas d'import de
// JSON ici, pour que `node --test` lise ce fichier tel quel.

import type { Locale } from "../../i18n/locales.ts";
import { INTL_TAGS } from "../../i18n/locales.ts";

/** Traducteur next-intl réduit à ce dont lib/ a besoin. */
export type Tr = (key: string, values?: Record<string, string | number>) => string;

/** Langue d'un calcul de lib/dashboard : locale (dates) + traducteur de
 *  « dashboard.lib » (`t`) et, si besoin, de « exercise » (`tx`). */
export interface LibI18n {
  locale: Locale;
  t: Tr;
  tx?: Tr;
}

const startOfLocalDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/** Jours calendaires (locaux) entre `iso` et `now`, positif si `iso` est passé. */
export function daysBetween(iso: string, now: Date = new Date()): number {
  const a = startOfLocalDay(new Date(iso)).getTime();
  const b = startOfLocalDay(now).getTime();
  return Math.round((b - a) / 86_400_000);
}

const SHORT_DATE: Partial<Record<Locale, Intl.DateTimeFormat>> = {};
const shortDate = (locale: Locale) =>
  (SHORT_DATE[locale] ??= new Intl.DateTimeFormat(INTL_TAGS[locale], { weekday: "short", day: "numeric", month: "short" }));

/** « Aujourd'hui », « Hier », « Il y a N jours » (2–6), sinon « Jeu. 27 août ». `null` → « Jamais ». */
export function relativeDay(iso: string | null | undefined, now: Date = new Date(), i18n?: LibI18n): string {
  const t = i18n?.t;
  const locale = i18n?.locale ?? "fr";
  if (!iso) return t ? t("relativeDay.never") : "Jamais";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return t ? t("relativeDay.never") : "Jamais";
  const days = daysBetween(iso, now);
  if (days <= 0) return t ? t("relativeDay.today") : "Aujourd'hui";
  if (days === 1) return t ? t("relativeDay.yesterday") : "Hier";
  if (days <= 6) return t ? t("relativeDay.daysAgo", { days }) : `Il y a ${days} jours`;
  // Ne pas retirer le point final : il appartient parfois au mois abrégé
  // (« janv. », « sept. », « nov. »...), pas seulement au jour de semaine.
  // Anglais : « Thu 27 Aug », déjà sans virgule ni point.
  const raw = shortDate(locale).format(d);
  const s = locale === "fr" ? raw.replace(/\.?,?\s+/, ". ") : raw;
  return s.charAt(0).toUpperCase() + s.slice(1);
}
