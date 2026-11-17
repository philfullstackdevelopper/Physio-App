import Link from "next/link";
import { Dumbbell, ListChecks } from "lucide-react";
import { useTranslations } from "next-intl";

// « Bibliothèque » (Philippe, 2026-11-17) : deux onglets d'une demi-largeur
// chacun, « Mes exercices » | « Mes séances », en haut des deux pages. Ils
// remplacent les deux titres (même hauteur d'écran) ; tout le reste de chaque
// page est inchangé. Les liens « Gérer mes exercices / mes séances » restent.
export default function LibraryTabs({ active }: { active: "exercises" | "seances" }) {
  const t = useTranslations("exercise.libraryTabs");
  const tabs = [
    { key: "exercises", href: "/dashboard/exercises", label: t("exercises"), icon: ListChecks },
    { key: "seances", href: "/dashboard/seances", label: t("seances"), icon: Dumbbell },
  ] as const;
  return (
    <nav aria-label={t("label")} className="grid grid-cols-2 border-b border-line">
      {tabs.map((tab) => {
        const on = tab.key === active;
        const Heading = on ? "h1" : "span";
        return (
          <Link
            key={tab.key}
            href={tab.href}
            aria-current={on ? "page" : undefined}
            className={`-mb-px flex items-center justify-center gap-2 border-b-2 px-3 py-2.5 transition-colors max-sm:py-2 ${
              on ? "border-brand text-ink" : "border-transparent text-muted hover:border-line hover:text-ink"
            }`}
          >
            <tab.icon className={`h-5 w-5 shrink-0 max-sm:h-4 max-sm:w-4 ${on ? "text-brand" : ""}`} strokeWidth={1.75} />
            <Heading className={`truncate text-xl font-semibold max-sm:text-base ${on ? "" : "font-medium"}`}>{tab.label}</Heading>
          </Link>
        );
      })}
    </nav>
  );
}
