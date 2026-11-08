import { getLocale, getTranslations } from "next-intl/server";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import DotCanvas from "@/components/DotCanvas";

// Renders legal/mentions-legales.md for the app. Keep the two in sync by
// hand — this is still a DRAFT pending legal review (see the banner below).
// Textes : messages/<langue>/legal.json (« legalNotice ») ; la version anglaise
// est un brouillon à faire relire par un avocat, d'où le bandeau hors français.
export default async function MentionsLegalesPage() {
  const t = await getTranslations("legal.legalNotice");
  const tCommon = await getTranslations("common");
  const locale = await getLocale();
  return (
    <div className="relative min-h-screen bg-[#f6f8fd] text-slate-800">
      <DotCanvas />
      <div className="relative z-10">
      <SiteHeader />
      <main className="p-6 pt-32 sm:p-8 sm:pt-36">
      <div className="mx-auto max-w-2xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        {locale !== "fr" && (
          <p className="mb-4 rounded-lg bg-warn-soft px-3 py-2 text-sm text-ink">{tCommon("reviewBanner")}</p>
        )}
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          {t.rich("draft", { b: (c) => <strong>{c}</strong> })}
        </div>

        <h1 className="font-display mt-6 text-2xl font-semibold text-slate-900">{t("title")}</h1>

        <div className="mt-6 space-y-6 text-sm leading-relaxed text-slate-700">
          <section>
            <h2 className="font-display font-semibold text-slate-900">{t("publisherTitle")}</h2>
            <p className="mt-1">{t("publisher")}</p>
          </section>

          <section>
            <h2 className="font-display font-semibold text-slate-900">{t("hostingTitle")}</h2>
            {/* Coordonnées reprises des mentions légales de Scalingo
                (scalingo.com/legal-notice), vérifiées le 2026-10-10. */}
            <p className="mt-1">{t("hosting")}</p>
          </section>

          <section>
            <h2 className="font-display font-semibold text-slate-900">{t("ipTitle")}</h2>
            <p className="mt-1">{t("ip")}</p>
          </section>

          <section>
            <h2 className="font-display font-semibold text-slate-900">{t("creditsTitle")}</h2>
            <p className="mt-1">
              {t.rich("credits", {
                everkinetic: (c) => (
                  <a href="https://github.com/everkinetic/data" className="text-blue-700 underline">
                    {c}
                  </a>
                ),
                workoutGuide: (c) => (
                  <a href="https://github.com/bryllim/workout-guide" className="text-blue-700 underline">
                    {c}
                  </a>
                ),
                license: (c) => (
                  <a href="https://creativecommons.org/licenses/by-sa/4.0/" className="text-blue-700 underline">
                    {c}
                  </a>
                ),
              })}
            </p>
          </section>

          <section>
            <h2 className="font-display font-semibold text-slate-900">{t("personalDataTitle")}</h2>
            <p className="mt-1">
              {t.rich("personalData", {
                link: (c) => (
                  <a href="/confidentialite" className="text-blue-700 underline">
                    {c}
                  </a>
                ),
              })}
            </p>
          </section>
        </div>
      </div>
      </main>
      <SiteFooter />
      </div>
    </div>
  );
}
