import Link from "next/link";
import { ArrowRight, Calendar, Lightbulb, Mail, ShieldCheck, UserRound } from "lucide-react";
import PatientReferralMessage from "@/components/PatientReferralMessage";
import SignupClosed from "@/components/SignupClosed";
import { SIGNUPS_OPEN } from "@/lib/launchFlags";
import { getTranslations } from "next-intl/server";
import LanguageSwitcher from "@/components/LanguageSwitcher";

export default async function SignupPatientPage() {
  // Avant le lancement : pas de création de compte (lib/launchFlags.ts).
  if (!SIGNUPS_OPEN) return <SignupClosed />;
  const t = await getTranslations("auth.signupPatient");
  const tShared = await getTranslations("auth.shared");
  const STEPS = [
    { icon: Mail, title: t("step1Title"), body: t("step1Body") },
    { icon: UserRound, title: t("step2Title"), body: t("step2Body") },
    { icon: Calendar, title: t("step3Title"), body: null },
  ];
  return (
    // Une page = un écran (audit 2026-10-10) : sur téléphone, seul le message
    // prêt à envoyer reste (les 3 étapes sont déjà résumées par la phrase du
    // haut) ; sur écran peu haut, titres et marges se resserrent.
    <main className="relative flex min-h-dvh flex-col justify-center overflow-hidden bg-[#f6f8fd] px-4 py-16 max-sm:py-5 short:py-4">
      {/* Soft decorative blobs, same quiet marketing-page language as
          DotCanvas elsewhere — Philippe, 2026-09-10, built from a reference
          mock. */}
      <div aria-hidden className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-emerald-100/60 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-blue-100/50 blur-3xl" />
      {/* Choix de la langue, discret en haut à droite. */}
      <div className="absolute right-4 top-4 z-10 lg:right-6 lg:top-6">
        <LanguageSwitcher />
      </div>

      <div className="relative mx-auto w-full max-w-4xl">
        <div className="text-center">
          <h1 className="font-display text-3xl font-semibold leading-tight text-slate-900 max-sm:text-2xl sm:text-4xl short:sm:text-2xl">
            {t.rich("title", {
              brand: (c) => <span className="text-blue-700">{c}</span>,
              br: () => <br className="max-sm:hidden short:hidden" />,
            })}
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-base leading-relaxed text-slate-600 max-sm:mt-2 max-sm:text-sm short:mt-1.5 short:text-sm short:sm:max-w-none">
            {t("worksWith")}{" "}
            <span className="max-sm:short:hidden">{t("noWorries")}</span>
          </p>
        </div>

        <div className="mt-10 grid gap-6 max-sm:mt-4 short:mt-3 short:gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur max-md:hidden short:p-4">
            <p className="flex items-center gap-2.5 text-lg font-semibold text-slate-900">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                <Lightbulb className="h-4.5 w-4.5" strokeWidth={1.75} />
              </span>
              {t("howItWorks")}
            </p>

            <ol className="relative mt-6 space-y-6 short:mt-3 short:space-y-3">
              {STEPS.map((step, i) => (
                <li key={step.title} className="relative flex gap-4">
                  {i < STEPS.length - 1 && (
                    <span aria-hidden className="absolute left-4 top-9 h-full w-px bg-slate-200" />
                  )}
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-semibold text-blue-600">
                    {i + 1}
                  </span>
                  <span>
                    <span className="flex items-center gap-1.5 font-medium text-slate-900">
                      <step.icon className="h-4 w-4 text-slate-400" strokeWidth={1.75} />
                      {step.title}
                    </span>
                    {step.body && <span className="mt-0.5 block text-sm text-slate-500">{step.body}</span>}
                  </span>
                </li>
              ))}
            </ol>

            <div className="mt-6 flex items-start gap-2.5 rounded-xl bg-emerald-50 p-3.5 text-sm text-emerald-800 short:mt-3 short:p-2.5">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} />
              <span>{t("quick")}</span>
            </div>
          </div>

          <PatientReferralMessage />
        </div>

        <p className="mt-8 text-center text-sm text-slate-500 max-sm:mt-4 short:mt-3">
          {t("alreadyInvited")}{" "}
          <Link href="/login" className="inline-flex items-center gap-1 font-medium text-blue-700 hover:underline">
            {tShared("signIn")} <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
          </Link>
        </p>
      </div>
    </main>
  );
}
