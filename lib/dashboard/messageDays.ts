// Regroupe un fil de messages (déjà trié du plus ancien au plus récent) par
// jour calendaire local, avec le libellé du séparateur affiché dans le fil :
// « Aujourd'hui », « Hier », sinon « Mardi 1 septembre ».
// Langue : voir LibI18n (lib/format/relativeDay.ts) ; français par défaut.

import { daysBetween, type LibI18n } from "../format/relativeDay.ts";
import { INTL_TAGS, type Locale } from "../../i18n/locales.ts";

export interface DayGroup<T> {
  key: string;
  label: string;
  items: T[];
}

const LONG_DATE: Partial<Record<Locale, Intl.DateTimeFormat>> = {};
const longDate = (locale: Locale) =>
  (LONG_DATE[locale] ??= new Intl.DateTimeFormat(INTL_TAGS[locale], { weekday: "long", day: "numeric", month: "long" }));

export function dayLabel(iso: string, now: Date = new Date(), i18n?: LibI18n): string {
  const t = i18n?.t;
  const days = daysBetween(iso, now);
  if (days <= 0) return t ? t("relativeDay.today") : "Aujourd'hui";
  if (days === 1) return t ? t("relativeDay.yesterday") : "Hier";
  const s = longDate(i18n?.locale ?? "fr").format(new Date(iso));
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function groupByDay<T extends { created_at: string }>(items: T[], now: Date = new Date(), i18n?: LibI18n): DayGroup<T>[] {
  const groups: DayGroup<T>[] = [];
  for (const item of items) {
    const d = new Date(item.created_at);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.items.push(item);
    else groups.push({ key, label: dayLabel(item.created_at, now, i18n), items: [item] });
  }
  return groups;
}
