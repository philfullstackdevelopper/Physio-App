import type { ReactNode } from "react";
import { getLocale, getTranslations } from "next-intl/server";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import DotCanvas from "@/components/DotCanvas";
import { HIGHEST_MONTHLY_TOTAL_CENTS, HIGHEST_PLATFORM_CENTS, LOWEST_MONTHLY_TOTAL_CENTS, LOWEST_PLATFORM_CENTS, KINE_FOLLOW_UP_CENTS, PLATFORM_OFFERS, TRIAL_DAYS, eurosFR } from "@/lib/billing/patientPlans";
import { intlTag } from "@/lib/i18n/translator";
import type { Locale } from "@/i18n/locales";

// Renders legal/cgu.md for the app. Keep the two in sync by hand — this is
// still a DRAFT pending legal review (see the banner below).
// Textes : messages/<langue>/legal.json (« cgu ») ; la version anglaise est un
// brouillon à faire relire par un avocat, d'où le bandeau hors français.
export default async function CguPage() {
  const t = await getTranslations("legal.cgu");
  const tCommon = await getTranslations("common");
  const locale = (await getLocale()) as Locale;
  // Montants : en français exactement eurosFR ; sinon le format de la langue.
  const eur = (cents: number) =>
    locale === "fr"
      ? eurosFR(cents)
      : (cents / 100).toLocaleString(intlTag(locale), { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const b = (c: ReactNode) => <strong>{c}</strong>;
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
          {t.rich("draft", { b })}
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
            <p className="mt-1">{t("s2")}</p>
          </section>

          <section>
            <h2 className="font-display font-semibold text-slate-900">{t("s3Title")}</h2>
            <p className="mt-1">{t("s3Intro")}</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                {t.rich("s3Platform", { b, low: eur(LOWEST_PLATFORM_CENTS), high: eur(HIGHEST_PLATFORM_CENTS) })}
              </li>
              <li>
                {t.rich("s3Kine", { b, kine: eur(KINE_FOLLOW_UP_CENTS) })}
              </li>
            </ul>
            <p className="mt-2">
              {t("s3Total", {
                low: eur(LOWEST_MONTHLY_TOTAL_CENTS),
                high: eur(HIGHEST_MONTHLY_TOTAL_CENTS),
                kine: eur(KINE_FOLLOW_UP_CENTS),
                offers: PLATFORM_OFFERS.map((o) =>
                  t("offer", { label: o.label.toLowerCase(), months: o.commitmentMonths, price: eur(o.platformCents) }),
                ).join(", "),
              })}
            </p>
          </section>

          <section>
            <h2 className="font-display font-semibold text-slate-900">{t("s4Title")}</h2>
            <p className="mt-1">{t("s4a", { trial: TRIAL_DAYS })}</p>
            <p className="mt-2">{t("s4b")}</p>
            <p className="mt-2">{t("s4c")}</p>
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
        </div>
      </div>
      </main>
      <SiteFooter />
      </div>
    </div>
  );
}
