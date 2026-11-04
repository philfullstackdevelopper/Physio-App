// /admin — « À traiter » (Philippe, 2026-11-04 : « il faut que je puisse y
// voir toutes les infos pertinentes que je dois traiter »). Un coup d'œil en
// haut de page : ce qui attend une action, avec un lien vers la section, puis
// les chiffres clés. Purement affichage : les données viennent de page.tsx.

export interface AdminTodo {
  key: string;
  label: string;
  count: number;
  /** Phrase sous le chiffre : ce qu'il faut faire, ou depuis quand ça attend. */
  detail: string;
  href: string;
  /** Rouge si ça bloque quelqu'un (un kiné attend), orange sinon. */
  urgent?: boolean;
}

export interface AdminStat {
  label: string;
  value: number;
}

export default function AdminSummary({ todos, stats }: { todos: AdminTodo[]; stats: AdminStat[] }) {
  const open = todos.filter((t) => t.count > 0);
  return (
    <section aria-labelledby="a-traiter" className="mb-10">
      <h1 id="a-traiter" className="font-display text-2xl font-semibold text-slate-900">
        À traiter
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        {open.length === 0 ? "Rien à traiter pour le moment." : `${open.length} sujet${open.length > 1 ? "s" : ""} en attente d'une action de votre part.`}
      </p>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {todos.map((t) => {
          const active = t.count > 0;
          return (
            <li key={t.key}>
              <a
                href={t.href}
                className={`flex h-full flex-col gap-1 rounded-2xl border p-4 transition hover:shadow-sm ${
                  !active
                    ? "border-slate-200 bg-white opacity-60"
                    : t.urgent
                      ? "border-red-200 bg-red-50"
                      : "border-amber-200 bg-amber-50"
                }`}
              >
                <span className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-semibold text-slate-900">{t.label}</span>
                  <span
                    className={`font-mono text-2xl font-semibold tabular-nums ${
                      !active ? "text-slate-400" : t.urgent ? "text-red-700" : "text-amber-700"
                    }`}
                  >
                    {t.count}
                  </span>
                </span>
                <span className="text-xs text-slate-600">{active ? t.detail : "Rien en attente."}</span>
              </a>
            </li>
          );
        })}
      </ul>
      <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm">
        {stats.map((s) => (
          <div key={s.label} className="flex items-baseline gap-1.5">
            <dd className="font-mono font-semibold tabular-nums text-slate-900">{s.value}</dd>
            <dt className="text-slate-500">{s.label}</dt>
          </div>
        ))}
      </dl>
    </section>
  );
}

/** Depuis combien de temps (« depuis 3 j »), pour la phrase d'un sujet. */
export function sinceLabel(iso: string | null | undefined, now: Date = new Date()): string {
  if (!iso) return "";
  const hours = Math.max(0, Math.round((now.getTime() - new Date(iso).getTime()) / 3_600_000));
  if (hours < 1) return "à l'instant";
  if (hours < 24) return `depuis ${hours} h`;
  return `depuis ${Math.round(hours / 24)} j`;
}
