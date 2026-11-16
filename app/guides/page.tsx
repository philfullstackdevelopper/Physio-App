import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import JsonLd from "@/components/JsonLd";
import { GUIDES } from "@/lib/content/guides";
import { guideText } from "@/lib/content/guideText";
import { breadcrumbLd, graph } from "@/lib/seo/structuredData";
import { siteConfig } from "@/lib/site";

// Liste des guides publics (lib/content/guides.ts). Textes : home.json (home.guides).
export async function generateMetadata() {
  const t = await getTranslations("home.guides");
  return { title: t("metaTitle"), description: t("metaDescription") };
}

export default async function GuidesPage() {
  const t = await getTranslations("home.guides");
  const locale = await getLocale();
  const groups = (["kine", "patient"] as const).map((audience) => ({
    audience,
    items: GUIDES.filter((g) => g.audience === audience).map((g) => ({ slug: g.slug, ...guideText(g, locale) })),
  }));
  return (
    <div className="relative min-h-screen bg-[#f6f8fd] text-slate-800">
      <JsonLd
        data={graph(
          breadcrumbLd([
            { name: siteConfig.name, url: siteConfig.url },
            { name: t("title"), url: `${siteConfig.url}/guides` },
          ]),
        )}
      />
      <SiteHeader />
      <main className="mx-auto max-w-3xl p-6 pt-32 sm:p-8 sm:pt-36">
        <h1 className="font-display text-3xl font-semibold text-slate-900">{t("title")}</h1>
        <p className="mt-3 text-slate-600">{t("intro")}</p>
        {groups.map((group) => (
          <section key={group.audience} className="mt-10">
            <h2 className="font-display text-lg font-semibold text-slate-900">
              {group.audience === "kine" ? t("forKine") : t("forPatient")}
            </h2>
            <ul className="mt-4 space-y-3">
              {group.items.map((g) => (
                <li key={g.slug}>
                  <Link
                    href={`/guides/${g.slug}`}
                    className="group block rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-300"
                  >
                    <span className="font-display font-semibold text-slate-900 group-hover:text-blue-700">{g.title}</span>
                    <span className="mt-1 block text-sm text-slate-600">{g.description}</span>
                    <span className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-blue-700">
                      {t("read")} <ArrowRight className="h-4 w-4" strokeWidth={2} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </main>
      <SiteFooter />
    </div>
  );
}
