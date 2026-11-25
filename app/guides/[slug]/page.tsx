import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ChevronRight } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import GuidesShell, { GuideCta } from "@/components/GuidesShell";
import Reveal from "@/components/Reveal";
import JsonLd from "@/components/JsonLd";
import { GUIDES, findGuide } from "@/lib/content/guides";
import { guideText } from "@/lib/content/guideText";
import { articleLd, breadcrumbLd, graph } from "@/lib/seo/structuredData";
import { siteConfig } from "@/lib/site";
import { intlTag } from "@/lib/i18n/translator";
import type { Locale } from "@/i18n/locales";

// Un guide public (contenu : lib/content/guides.ts ; textes d'interface :
// home.json, home.guides). Même habillage que l'accueil.

type Props = { params: Promise<{ slug: string }> };

/** Auteur des guides (identique à l'auteur des données Article, lib/seo/structuredData.ts). */
const AUTHOR = "Philippe Maupain";

/**
 * Liens dans le texte d'un guide : « [texte](/adresse) » dans lib/content/guides.ts
 * devient un vrai lien. Les liens internes entre guides aident Google à trouver
 * les pages et à comprendre de quoi elles parlent (texte du lien = sujet visé).
 */
function RichText({ text }: { text: string }) {
  const parts = text.split(/(\[[^\]]+\]\([^)\s]+\))/g);
  return (
    <>
      {parts.map((part, i) => {
        const m = part.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
        if (!m) return part;
        return (
          <Link key={i} href={m[2]} className="font-medium text-blue-600 underline underline-offset-4 hover:text-blue-700">
            {m[1]}
          </Link>
        );
      })}
    </>
  );
}

export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const guide = findGuide(slug);
  if (!guide) return {};
  const text = guideText(guide, await getLocale());
  return {
    // Titre Google = titre affiché (H1), sans « · EasyPhysio » ajouté : les
    // titres des guides font déjà ~50 caractères, et Google coupe vers 60.
    title: { absolute: text.title },
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
  // « À lire aussi » : 3 guides, ceux du même public d'abord.
  const others = GUIDES.filter((g) => g.slug !== slug)
    .sort((a, b) => Number(b.audience === guide.audience) - Number(a.audience === guide.audience))
    .slice(0, 3)
    .map((g) => ({ slug: g.slug, ...guideText(g, locale) }));

  return (
    <GuidesShell>
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
      <main className="mx-auto max-w-5xl px-6 pt-32 sm:pt-40">
        <article className="mx-auto max-w-2xl">
          <header className="animate-[fadeInUp_0.6s_ease-out_both]">
            <nav aria-label={t("breadcrumb")} className="flex items-center gap-1 text-sm text-slate-500">
              <Link href="/guides" className="font-medium text-blue-600 hover:underline">{t("title")}</Link>
              <ChevronRight className="h-3.5 w-3.5" strokeWidth={2} />
              <span>{guide.audience === "kine" ? t("forKine") : t("forPatient")}</span>
            </nav>
            <h1 className="font-display mt-4 text-3xl font-semibold leading-[1.15] tracking-tight text-slate-900 sm:text-[2.4rem]">
              {text.title}
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-slate-600">{text.description}</p>
            {/* Auteur visible (expérience vécue, E-E-A-T) — même nom que articleLd. */}
            <p className="mt-4 text-sm text-slate-500">
              {t("byline", { name: AUTHOR })} · {t("updated", { date: updated })}
            </p>
          </header>

          <div className="mt-10 border-t border-slate-200/70 pt-2">
            {text.sections.map((s) => (
              <section key={s.heading} className="mt-10">
                <h2 className="font-display text-xl font-semibold leading-snug text-slate-900 sm:text-2xl">{s.heading}</h2>
                {s.paragraphs.map((p) => (
                  <p key={p} className="mt-4 text-[1.0625rem] leading-relaxed text-slate-700"><RichText text={p} /></p>
                ))}
                {s.bullets && (
                  <ul className="mt-4 space-y-2.5">
                    {s.bullets.map((b) => (
                      <li key={b} className="flex gap-3 text-[1.0625rem] leading-relaxed text-slate-700">
                        <span aria-hidden className="mt-[0.6em] h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                        <span><RichText text={b} /></span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
            {text.sources && text.sources.length > 0 && (
              <section className="mt-10">
                <h2 className="font-display text-lg font-semibold text-slate-900">{t("sources")}</h2>
                <ul className="mt-3 space-y-1.5 text-[0.95rem]">
                  {text.sources.map((s) => (
                    <li key={s.url}>
                      <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline-offset-4 hover:underline">
                        {s.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          <aside className="mt-12 rounded-2xl border border-slate-200/70 bg-white p-5 text-[0.95rem] leading-relaxed text-slate-600">
            <p className="font-semibold text-slate-900">{t("authorTitle")}</p>
            <p className="mt-1.5">{t("authorBody", { name: AUTHOR })}</p>
          </aside>
        </article>

        <Reveal>
          <section className="mt-20 sm:mt-24">
            <GuideCta audience={guide.audience} />
          </section>
        </Reveal>

        <Reveal>
          <section className="my-20 sm:my-24">
            <h2 className="font-display text-2xl font-semibold leading-tight text-slate-900">{t("more")}</h2>
            <ul className="mt-6 grid gap-4 sm:grid-cols-3">
              {others.map((o) => (
                <li key={o.slug}>
                  <Link
                    href={`/guides/${o.slug}`}
                    className="group flex h-full flex-col rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
                  >
                    <span className="font-display flex-1 font-semibold leading-snug text-slate-900">{o.title}</span>
                    <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-blue-600">
                      {t("read")}
                      <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" strokeWidth={2} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </Reveal>
      </main>
    </GuidesShell>
  );
}
