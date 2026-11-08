import Link from "next/link";
import { ArrowRight, HeartPulse, Stethoscope } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { LogoLockup } from "@/components/Logo";

// Entrée de la démo publique (2026-10-16) : le visiteur choisit l'espace à
// visiter. Données fictives, rien n'est enregistré (voir components/DemoShell.tsx).
//
// Même double page que « Créer un compte » (app/signup/page.tsx) — Philippe,
// 2026-10-17 : « mets la double page que j'avais déjà avec les couleurs » :
// bleu côté kiné, vert côté patient, chaque moitié est un seul grand lien.
export async function generateMetadata() {
  const t = await getTranslations("demo.meta");
  return { title: t("entry") };
}

export default async function DemoPage() {
  const t = await getTranslations("demo.entry");
  return (
    <main className="relative min-h-dvh bg-slate-950">
      <Link href="/" aria-label={t("homeAria")} className="absolute left-4 top-4 z-10 flex items-center gap-2.5 lg:left-8 lg:top-8">
        <LogoLockup height={40} tone="light" />
      </Link>

      <div className="flex min-h-dvh flex-col lg:flex-row phone-land:flex-row">
        <Link
          href="/demo/kine"
          className="group relative flex flex-1 flex-col items-center justify-center gap-5 overflow-hidden bg-gradient-to-br from-blue-950 via-blue-900 to-slate-900 px-8 py-24 text-center transition-[flex-grow] duration-500 ease-out hover:flex-[1.08] max-lg:gap-3 max-lg:pb-4 max-lg:pt-16 phone-land:gap-2 phone-land:py-4"
        >
          <div
            aria-hidden
            className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(37,99,235,0.35),transparent_60%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          />
          <span className="relative flex h-20 w-20 items-center justify-center rounded-full bg-blue-500/15 text-blue-300 ring-1 ring-inset ring-blue-400/30 transition-transform duration-500 group-hover:scale-110 max-sm:h-14 max-sm:w-14 phone-land:h-12 phone-land:w-12">
            <Stethoscope className="h-9 w-9 max-sm:h-7 max-sm:w-7" strokeWidth={1.5} />
          </span>
          <h2 className="font-display relative text-3xl font-semibold text-white max-sm:text-2xl sm:text-4xl phone-land:text-2xl">
            {t("space")}
            <br />
            {t("kineTitle")}
          </h2>
          <p className="relative max-w-xs text-sm leading-relaxed text-blue-100/70">
            {t("kineText")}
          </p>
          <span className="relative mt-2 inline-flex items-center gap-2 rounded-full bg-blue-600 px-6 py-2.5 text-sm font-medium text-white transition-colors group-hover:bg-blue-500 max-lg:mt-0">
            {t("try")} <ArrowRight className="h-4 w-4" strokeWidth={2} />
          </span>
        </Link>

        <Link
          href="/demo/patient"
          className="group relative flex flex-1 flex-col items-center justify-center gap-5 overflow-hidden bg-gradient-to-bl from-emerald-950 via-emerald-900 to-slate-900 px-8 py-24 text-center transition-[flex-grow] duration-500 ease-out hover:flex-[1.08] max-lg:gap-3 max-lg:pb-16 max-lg:pt-4 phone-land:gap-2 phone-land:py-4"
        >
          <div
            aria-hidden
            className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(16,185,129,0.35),transparent_60%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          />
          <span className="relative flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300 ring-1 ring-inset ring-emerald-400/30 transition-transform duration-500 group-hover:scale-110 max-sm:h-14 max-sm:w-14 phone-land:h-12 phone-land:w-12">
            <HeartPulse className="h-9 w-9 max-sm:h-7 max-sm:w-7" strokeWidth={1.5} />
          </span>
          <h2 className="font-display relative text-3xl font-semibold text-white max-sm:text-2xl sm:text-4xl phone-land:text-2xl">
            {t("space")}
            <br />
            {t("patientTitle")}
          </h2>
          <p className="relative max-w-xs text-sm leading-relaxed text-emerald-100/70">
            {t("patientText")}
          </p>
          <span className="relative mt-2 inline-flex items-center gap-2 rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-medium text-white transition-colors group-hover:bg-emerald-500 max-lg:mt-0">
            {t("try")} <ArrowRight className="h-4 w-4" strokeWidth={2} />
          </span>
        </Link>
      </div>

      {/* Bandeau du bas : ce qu'est la démo + retour. */}
      <p className="absolute bottom-4 left-1/2 z-10 w-max max-w-[calc(100vw-2rem)] -translate-x-1/2 text-center text-xs text-white/60 sm:text-sm lg:bottom-8">
        {t("footer")}{" "}
        <Link href="/" className="font-medium text-white underline underline-offset-2 hover:no-underline">
          {t("back")}
        </Link>
      </p>
    </main>
  );
}
