import Link from "next/link";
import type { ReactNode } from "react";
import { Dumbbell, ListChecks } from "lucide-react";
import { useTranslations } from "next-intl";

// « Bibliothèque » (Philippe, 2026-11-17) : deux onglets de même largeur,
// « Mes exercices » | « Mes séances », en haut des deux pages. Ils remplacent
// les titres et les anciens liens « Gérer mes exercices / mes séances ».
// `action` (ex. « Nouvelle séance ») se place sur la même ligne, à droite,
// pour gagner une ligne d'écran.
export default function LibraryTabs({ active, action }: { active: "exercises" | "seances"; action?: ReactNode }) {
  const t = useTranslations("exercise.libraryTabs");
  const tabs = [
    { key: "exercises", href: "/dashboard/exercises", label: t("exercises"), icon: ListChecks },
    { key: "seances", href: "/dashboard/seances", label: t("seances"), icon: Dumbbell },
  ] as const;
  return (
    <div className="flex items-center gap-3 border-b border-line max-sm:gap-2">
      <nav aria-label={t("label")} className="grid min-w-0 flex-1 grid-cols-2">
        {tabs.map((tab) => {
          const on = tab.key === active;
          const Heading = on ? "h1" : "span";
          return (
            <Link
              key={tab.key}
              href={tab.href}
              aria-current={on ? "page" : undefined}
              className={`-mb-px flex min-w-0 items-center justify-center gap-2 border-b-2 px-3 py-2.5 transition-colors max-sm:px-1 max-sm:py-2 ${
                on ? "border-brand text-ink" : "border-transparent text-muted hover:border-line hover:text-ink"
              }`}
            >
              <tab.icon className={`h-5 w-5 shrink-0 max-sm:h-4 max-sm:w-4 ${on ? "text-brand" : ""}`} strokeWidth={1.75} />
              <Heading className={`truncate text-xl font-semibold max-sm:text-base ${on ? "" : "font-medium"}`}>{tab.label}</Heading>
            </Link>
          );
        })}
      </nav>
      {action && <div className="shrink-0 py-1.5">{action}</div>}
    </div>
  );
}
