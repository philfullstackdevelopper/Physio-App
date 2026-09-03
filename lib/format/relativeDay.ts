// Libellés relatifs partagés par le tableau de bord, le tableau des patients
// et la fiche patient — une seule façon de dire « quand ».

const startOfLocalDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/** Jours calendaires (locaux) entre `iso` et `now`, positif si `iso` est passé. */
export function daysBetween(iso: string, now: Date = new Date()): number {
  const a = startOfLocalDay(new Date(iso)).getTime();
  const b = startOfLocalDay(now).getTime();
  return Math.round((b - a) / 86_400_000);
}

const SHORT_DATE = new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "short" });

/** « Aujourd'hui », « Hier », « Il y a N jours » (2–6), sinon « Jeu. 27 août ». `null` → « Jamais ». */
export function relativeDay(iso: string | null | undefined, now: Date = new Date()): string {
  if (!iso) return "Jamais";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Jamais";
  const days = daysBetween(iso, now);
  if (days <= 0) return "Aujourd'hui";
  if (days === 1) return "Hier";
  if (days <= 6) return `Il y a ${days} jours`;
  const s = SHORT_DATE.format(d).replace(/\.?,?\s+/, ". ").replace(/\.$/, "");
  return s.charAt(0).toUpperCase() + s.slice(1);
}
