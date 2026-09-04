// Regroupe un fil de messages (déjà trié du plus ancien au plus récent) par
// jour calendaire local, avec le libellé du séparateur affiché dans le fil :
// « Aujourd'hui », « Hier », sinon « Mardi 1 septembre ».

import { daysBetween } from "../format/relativeDay.ts";

export interface DayGroup<T> {
  key: string;
  label: string;
  items: T[];
}

const LONG_DATE = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" });

export function dayLabel(iso: string, now: Date = new Date()): string {
  const days = daysBetween(iso, now);
  if (days <= 0) return "Aujourd'hui";
  if (days === 1) return "Hier";
  const s = LONG_DATE.format(new Date(iso));
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function groupByDay<T extends { created_at: string }>(items: T[], now: Date = new Date()): DayGroup<T>[] {
  const groups: DayGroup<T>[] = [];
  for (const item of items) {
    const d = new Date(item.created_at);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.items.push(item);
    else groups.push({ key, label: dayLabel(item.created_at, now), items: [item] });
  }
  return groups;
}
