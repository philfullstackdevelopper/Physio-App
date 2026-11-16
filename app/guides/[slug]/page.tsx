import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import JsonLd from "@/components/JsonLd";
import { GUIDES, findGuide } from "@/lib/content/guides";
import { guideText } from "@/lib/content/guideText";
import { articleLd, breadcrumbLd, graph } from "@/lib/seo/structuredData";
import { siteConfig } from "@/lib/site";
import { SIGNUPS_OPEN, WAITLIST_HREF } from "@/lib/launchFlags";
import { intlTag } from "@/lib/i18n/translator";
import type { Locale } from "@/i18n/locales";

// Un guide public (contenu : lib/content/guides.ts). Textes d'interface :
// home.json (home.guides).

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const guide = findGuide(slug);
  if (!guide) return {};
  const text = guideText(guide, await getLocale());
  return {
    title: text.title,
    description: text.description,
    openGraph: { type: "article", title: text.title, description: text.description, url: `${siteConfig.url}/guides/${slug}` },
  };
}

export default async function GuidePage({ params }: Props) {
  const { slug } = await params;
  const guide = findGuide(slug);
  if (!guide) notFound();
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("home.guides");
  const text = guideText(guide, locale);
  const url = `${siteConfig.url}/guides/${slug}`;
  const updated = new Date(guide.updated).toLocaleDateString(intlTag(locale), { day: "numeric", month: "long", year: "numeric" });
  const ctaHref = guide.audience === "patient" ? "/login" : SIGNUPS_OPEN ? "/signup/kine" : WAITLIST_HREF;
  const ctaLabel = guide.audience === "patient" ? t("ctaPatient") : SIGNUPS_OPEN ? t("ctaKineOpen") : t("ctaKineWaitlist");
  const others = GUIDES.filter((g) => g.slug !== slug).map((g) => ({ slug: g.slug, title: guideText(g, locale).title }));

  return (
    <div className="relative min-h-screen bg-[#f6f8fd] text-slate-800">
      <JsonLd
        data={graph(
          articleLd({ url, title: text.title, description: text.description, published: guide.published, updated: guide.updated, locale: locale === "en" ? "en" : "fr" }),
          breadcrumbLd([
            { name: siteConfig.name, url: siteConfig.url },
            { name: t("title"), url: `${siteConfig.url}/guides` },
            { name: text.title, url },
          ]),
        )}
      />
      <SiteHeader />
      <main className="mx-auto max-w-2xl p-6 pt-32 sm:p-8 sm:pt-36">
        <Link href="/guides" className="inline-flex items-center gap-1 text-sm text-blue-700 hover:underline">
          <ArrowLeft className="h-4 w-4" strokeWidth={2} /> {t("back")}
        </Link>
        <article className="mt-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h1 className="font-display text-2xl font-semibold leading-snug text-slate-900 sm:text-3xl">{text.title}</h1>
          <p className="mt-3 text-slate-600">{text.description}</p>
          <p className="mt-2 text-xs text-slate-500">{t("updated", { date: updated })}</p>
          <div className="mt-6 space-y-7 leading-relaxed text-slate-700">
            {text.sections.map((s) => (
              <section key={s.heading}>
                <h2 className="font-display text-lg font-semibold text-slate-900">{s.heading}</h2>
                {s.paragraphs.map((p) => (
                  <p key={p} className="mt-2">{p}</p>
                ))}
                {s.bullets && (
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    {s.bullets.map((b) => (
                      <li key={b}>{b}</li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>
          <div className="mt-8 rounded-lg bg-blue-50 p-5">
            <p className="font-display font-semibold text-slate-900">{t("ctaTitle")}</p>
            <Link
              href={ctaHref}
              className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              {ctaLabel} <ArrowRight className="h-4 w-4" strokeWidth={2} />
            </Link>
          </div>
        </article>
        <nav className="mt-8">
          <p className="font-display text-sm font-semibold text-slate-900">{t("more")}</p>
          <ul className="mt-2 space-y-1 text-sm">
            {others.map((o) => (
              <li key={o.slug}>
                <Link href={`/guides/${o.slug}`} className="text-blue-700 hover:underline">{o.title}</Link>
              </li>
            ))}
          </ul>
        </nav>
      </main>
      <SiteFooter />
    </div>
  );
}
