import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import GuidesShell, { GuideCta } from "@/components/GuidesShell";
import Reveal from "@/components/Reveal";
import JsonLd from "@/components/JsonLd";
import { GUIDES } from "@/lib/content/guides";
import { guideText } from "@/lib/content/guideText";
import { breadcrumbLd, graph } from "@/lib/seo/structuredData";
import { siteConfig } from "@/lib/site";

// Liste des guides publics (contenu : lib/content/guides.ts ; textes
// d'interface : home.json, home.guides). Même habillage que l'accueil.
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
    <GuidesShell>
      <JsonLd
        data={graph(
          breadcrumbLd([
            { name: siteConfig.name, url: siteConfig.url },
            { name: t("title"), url: `${siteConfig.url}/guides` },
          ]),
        )}
      />
      <main className="mx-auto max-w-5xl px-6 pt-32 sm:pt-40">
        <header className="max-w-2xl animate-[fadeInUp_0.6s_ease-out_both]">
          <p className="text-sm font-semibold text-blue-600">{t("title")}</p>
          <h1 className="font-display mt-2 text-3xl font-semibold leading-[1.1] tracking-tight text-slate-900 sm:text-[2.6rem]">
            {t("heading")}
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-slate-600">{t("intro")}</p>
        </header>

        {groups.map((group) => (
          <Reveal key={group.audience}>
            <section className="mt-16 sm:mt-20">
              <h2 className="font-display text-2xl font-semibold leading-tight text-slate-900 sm:text-3xl">
                {group.audience === "kine" ? t("forKine") : t("forPatient")}
              </h2>
              <ul className="mt-8 grid gap-4 sm:grid-cols-2">
                {group.items.map((g) => (
                  <li key={g.slug}>
                    <Link
                      href={`/guides/${g.slug}`}
                      className="group flex h-full flex-col rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
                    >
                      <span className="font-display text-lg font-semibold leading-snug text-slate-900">{g.title}</span>
                      <span className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">{g.description}</span>
                      <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-blue-600">
                        {t("read")}
                        <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" strokeWidth={2} />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          </Reveal>
        ))}

        <Reveal>
          <section className="my-24 sm:my-32">
            <GuideCta audience="kine" />
          </section>
        </Reveal>
      </main>
    </GuidesShell>
  );
}
