import { getLocale, getTranslations } from "next-intl/server";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import DotCanvas from "@/components/DotCanvas";
// Titre et description propres à la page (audit du 2026-11-10 : toutes les
// pages publiques portaient le titre de l'accueil).
export async function generateMetadata() {
  const t = await getTranslations("legal.meta");
  return { title: t("privacyTitle"), description: t("privacyDescription") };
}

// Renders legal/politique-confidentialite.md for the app. Keep the two in
// sync by hand for now — this is still a DRAFT pending legal review (see the
// banner below and the source file's own warning).
// Textes : messages/<langue>/legal.json (« privacy ») ; la version anglaise est
// un brouillon à faire relire par un avocat, d'où le bandeau hors français.
export default async function ConfidentialitePage() {
  const t = await getTranslations("legal.privacy");
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

        <h1 className="font-display mt-6 text-2xl font-semibold text-slate-900">
          {t("title")}
        </h1>

        <div className="mt-6 space-y-6 text-sm leading-relaxed text-slate-700">
          <section>
            <h2 className="font-display font-semibold text-slate-900">{t("s1Title")}</h2>
            <p className="mt-1">{t("s1")}</p>
          </section>

          <section>
            <h2 className="font-display font-semibold text-slate-900">{t("s2Title")}</h2>
            <p className="mt-1">{t("s2a")}</p>
            <p className="mt-2">{t.rich("s2b", { b: (c) => <strong>{c}</strong> })}</p>
          </section>

          <section>
            <h2 className="font-display font-semibold text-slate-900">{t("s3Title")}</h2>
            <p className="mt-1">{t("s3")}</p>
          </section>

          <section>
            <h2 className="font-display font-semibold text-slate-900">{t("s4Title")}</h2>
            <p className="mt-1">{t("s4")}</p>
          </section>

          <section>
            <h2 className="font-display font-semibold text-slate-900">{t("s5Title")}</h2>
            <p className="mt-1">{t("s5")}</p>
          </section>

          <section>
            <h2 className="font-display font-semibold text-slate-900">{t("s6Title")}</h2>
            <p className="mt-1">{t("s6")}</p>
          </section>

          <section>
            <h2 className="font-display font-semibold text-slate-900">{t("s7Title")}</h2>
            <p className="mt-1">{t("s7")}</p>
          </section>

          <section>
            <h2 className="font-display font-semibold text-slate-900">{t("s8Title")}</h2>
            <p className="mt-1">{t("s8")}</p>
          </section>

          <section>
            <h2 className="font-display font-semibold text-slate-900">{t("s9Title")}</h2>
            <p className="mt-1">{t("s9")}</p>
          </section>

          <section>
            <h2 className="font-display font-semibold text-slate-900">{t("s10Title")}</h2>
            <p className="mt-1">{t("s10")}</p>
          </section>

          <section>
            <h2 className="font-display font-semibold text-slate-900">{t("s11Title")}</h2>
            <p className="mt-1">{t("s11")}</p>
          </section>
        </div>
      </div>
      </main>
      <SiteFooter />
      </div>
    </div>
  );
}
