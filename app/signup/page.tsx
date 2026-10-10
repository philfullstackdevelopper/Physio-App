import Link from "next/link";
import { ArrowRight, HeartPulse, Stethoscope } from "lucide-react";
import { LogoLockup } from "@/components/Logo";

// Entry point for "Créer un compte" everywhere on the marketing site — a
// full-bleed, two-way split rather than a small in-page toggle: the whole
// half is one big link, so there's nothing to hunt for and no wrong click
// (Philippe, 2026-09-10, working from a reference mockup). Kiné-labelled
// CTAs elsewhere (SiteFooter, the homepage hero, /praticiens) already say
// "praticien" and skip straight to /signup/kine — this page is only for the
// genuinely ambiguous "Créer un compte" buttons and the /login "no account
// yet" link.
export default function SignupChooserPage() {
  return (
    <main className="relative min-h-dvh bg-slate-950">
      <Link
        href="/"
        className="absolute left-4 top-4 z-10 flex items-center gap-2.5 lg:left-8 lg:top-8"
      >
        <LogoLockup height={40} tone="light" />
      </Link>

      {/* Téléphone / tablette : les deux moitiés tiennent ensemble sur un
          écran, sans défiler (audit 2026-10-10) — marges et pastille réduites. */}
      <div className="flex min-h-dvh flex-col lg:flex-row phone-land:flex-row">
        <Link
          href="/signup/kine"
          className="group relative flex flex-1 flex-col items-center justify-center gap-5 overflow-hidden bg-gradient-to-br from-blue-950 via-blue-900 to-slate-900 px-8 py-24 text-center transition-[flex-grow] duration-500 ease-out hover:flex-[1.08] max-lg:gap-3 max-lg:pb-4 max-lg:pt-14 phone-land:gap-2 phone-land:py-4"
        >
          <div
            aria-hidden
            className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(37,99,235,0.35),transparent_60%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          />
          <span className="relative flex h-20 w-20 items-center justify-center rounded-full bg-blue-500/15 text-blue-300 ring-1 ring-inset ring-blue-400/30 transition-transform duration-500 group-hover:scale-110 max-sm:h-14 max-sm:w-14 phone-land:h-12 phone-land:w-12">
            <Stethoscope className="h-9 w-9 max-sm:h-7 max-sm:w-7" strokeWidth={1.5} />
          </span>
          <h2 className="font-display relative text-3xl font-semibold text-white max-sm:text-2xl sm:text-4xl phone-land:text-2xl">
            Je suis
            <br />
            kinésithérapeute
          </h2>
          <p className="relative max-w-xs text-sm leading-relaxed text-blue-100/70">
            Prescrire des exercices, suivre mes patients et leur progression.
          </p>
          <span className="relative mt-2 inline-flex items-center gap-2 rounded-full bg-blue-600 max-lg:mt-0 px-6 py-2.5 text-sm font-medium text-white transition-colors group-hover:bg-blue-500">
            Continuer <ArrowRight className="h-4 w-4" strokeWidth={2} />
          </span>
        </Link>

        <Link
          href="/signup/patient"
          className="group relative flex flex-1 flex-col items-center justify-center gap-5 overflow-hidden bg-gradient-to-bl from-emerald-950 via-emerald-900 to-slate-900 px-8 py-24 text-center transition-[flex-grow] duration-500 ease-out hover:flex-[1.08] max-lg:gap-3 max-lg:pb-14 max-lg:pt-4 phone-land:gap-2 phone-land:py-4"
        >
          <div
            aria-hidden
            className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(16,185,129,0.35),transparent_60%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          />
          <span className="relative flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300 ring-1 ring-inset ring-emerald-400/30 transition-transform duration-500 group-hover:scale-110 max-sm:h-14 max-sm:w-14 phone-land:h-12 phone-land:w-12">
            <HeartPulse className="h-9 w-9 max-sm:h-7 max-sm:w-7" strokeWidth={1.5} />
          </span>
          <h2 className="font-display relative text-3xl font-semibold text-white max-sm:text-2xl sm:text-4xl phone-land:text-2xl">
            Je suis
            <br />
            patient·e
          </h2>
          <p className="relative max-w-xs text-sm leading-relaxed text-emerald-100/70">
            Suivre mon programme, faire mes exercices et voir ma progression.
          </p>
          <span className="relative mt-2 inline-flex items-center gap-2 rounded-full bg-emerald-600 max-lg:mt-0 px-6 py-2.5 text-sm font-medium text-white transition-colors group-hover:bg-emerald-500">
            Continuer <ArrowRight className="h-4 w-4" strokeWidth={2} />
          </span>
        </Link>
      </div>

      <p className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2 text-center text-sm text-white/50 lg:bottom-8">
        Déjà un compte ?{" "}
        <Link href="/login" className="font-medium text-white underline underline-offset-2 hover:no-underline">
          Se connecter
        </Link>
      </p>
    </main>
  );
}
