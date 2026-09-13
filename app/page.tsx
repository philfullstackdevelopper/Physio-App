import Link from "next/link";
import {
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Video,
} from "lucide-react";
import FaqSection from "@/components/FaqSection";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import PhoneMockup from "@/components/PhoneMockup";
import KineJourneyDemo from "@/components/KineJourneyDemo";
import ComparisonTable, { ComparisonBadge } from "@/components/ComparisonTable";
import PricingSection from "@/components/PricingSection";
import Testimonials from "@/components/Testimonials";
import Reveal from "@/components/Reveal";
import RevealGroup, { RevealItem } from "@/components/RevealGroup";

const HERO_CHIPS = [
  { icon: Sparkles, label: "Gratuit pour les patients" },
  { icon: Video, label: "Vidéos, sans caméra ni capteur" },
  { icon: ShieldCheck, label: "Piloté par votre kiné, jamais par un algorithme seul" },
];

function PrimaryCta({
  href = "/signup/kine",
  children,
}: {
  href?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center justify-center gap-1.5 rounded-full bg-blue-600 px-6 py-3 font-medium text-white shadow-sm transition hover:bg-blue-700 active:scale-95"
    >
      {children}
      <ArrowRight className="h-4 w-4" strokeWidth={2} />
    </Link>
  );
}

export default function Home() {
  return (
    <div className="relative min-h-screen bg-[#f6f8fd] text-slate-800">
      {/* Ambient background: a soft blue glow behind the hero (echoes the
          dashboard's own corner glow, in the site's accent instead of its
          warm amber, so the marketing site and the product read as one
          family) plus a faint paper grain for tactility instead of flat
          color — no busy pattern, unlike the dot canvas this replaced. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-20"
        style={{
          background:
            "radial-gradient(1200px 800px at 85% -8%, rgba(37, 99, 235, 0.12) 0%, transparent 55%), radial-gradient(900px 650px at 4% 18%, rgba(37, 99, 235, 0.07) 0%, transparent 60%)",
        }}
      />
      <div aria-hidden className="grain pointer-events-none absolute inset-0 -z-10" />
      <div className="relative z-10">
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-6">
        {/* ── Hero ─────────────────────────────────────────────── */}
        <section className="grid items-center gap-12 pb-16 pt-28 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:pb-24 lg:pt-36">
          <div>
            <h1 className="font-display animate-[fadeInUp_0.6s_ease-out_both] max-w-xl text-4xl font-semibold leading-[1.08] tracking-tight text-slate-900 sm:text-5xl lg:text-[3.4rem]">
              La rééducation ne s&apos;arrête pas en sortant du cabinet.
            </h1>
            <p className="animate-[fadeInUp_0.6s_ease-out_both] [animation-delay:160ms] mt-5 max-w-lg text-lg leading-relaxed text-slate-600">
              Chaque exercice choisi par votre kiné. Chaque séance guidée en vidéo. Chaque progrès
              visible pour lui, entre deux rendez-vous.
            </p>

            <div className="animate-[fadeInUp_0.6s_ease-out_both] [animation-delay:220ms] mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <PrimaryCta href="/signup/kine">Créer un compte praticien</PrimaryCta>
              <Link
                href="/login"
                className="inline-flex items-center justify-center font-medium text-slate-600 underline-offset-4 transition hover:text-blue-700 hover:underline"
              >
                J&apos;ai déjà un programme
              </Link>
            </div>

            <ul className="animate-[fadeInUp_0.6s_ease-out_both] [animation-delay:280ms] mt-8 flex flex-col gap-2.5">
              {HERO_CHIPS.map((chip) => (
                <li key={chip.label} className="flex items-center gap-2">
                  <chip.icon className="h-4 w-4 shrink-0 text-blue-600" strokeWidth={1.75} />
                  <span className="text-sm font-medium text-slate-600">{chip.label}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="animate-[fadeInUp_0.7s_ease-out_both] [animation-delay:250ms]">
            <PhoneMockup />
          </div>
        </section>

        {/* ── Côté kiné : tableau de bord → patient → action ─────── */}
        <Reveal>
        <section id="cote-kine" className="scroll-mt-28 py-16 sm:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-semibold leading-tight text-slate-900 sm:text-4xl">
              Côté kiné : de son tableau de bord à la fiche de chaque patient.
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-slate-600">
              Tout ce qui se passe entre deux séances, en un coup d&apos;œil. Comprendre, décider, ajuster : 2 clics suffisent.
            </p>
          </div>

          {/* La démo déborde de la colonne de texte : pleine largeur jusqu'à 1 200 px. */}
          <div className="mx-auto mt-12 max-w-7xl lg:-mx-16">
            <KineJourneyDemo />
          </div>

          <div className="mt-10 text-center">
            <PrimaryCta>Créer un compte praticien</PrimaryCta>
          </div>
        </section>
        </Reveal>

        {/* ── Comparaison ──────────────────────────────────────── */}
        <Reveal>
        <section id="comparaison" className="mt-24 scroll-mt-28 sm:mt-32">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="font-display max-w-xl text-3xl font-semibold leading-tight text-slate-900 sm:text-4xl">
                Ce qui change vraiment pour le patient
              </h2>
              <p className="mt-3 max-w-xl leading-relaxed text-slate-600">
                La plupart des programmes s&apos;arrêtent à la porte du cabinet.
                <br className="hidden sm:block" />
                EasyPhysio assure un suivi continu, personnalisé et efficace.
              </p>
            </div>
            <ComparisonBadge />
          </div>
          <div className="mt-8">
            <ComparisonTable />
          </div>
        </section>
        </Reveal>

        {/* ── Témoignages ──────────────────────────────────────── */}
        <Reveal>
        <section className="mt-24 sm:mt-32">
          <h2 className="font-display max-w-xl text-3xl font-semibold leading-tight text-slate-900 sm:text-4xl">
            Utilisé au cabinet,
            <br />
            et surtout à la maison
          </h2>
          <Testimonials />
        </section>
        </Reveal>

        {/* ── Tarifs ───────────────────────────────────────────── */}
        {/* Bascule "Côté kiné" / "Côté patient" (Philippe, 2026-09-13) : un
            seul prix parle à chaque audience (la commission pour le kiné,
            les 3 offres pour le patient) — les montrer côte à côte, comme
            avant, ne parlait vraiment à personne. Les prix patient viennent
            de lib/billing/plans.ts (même source que /patient/abonnement). */}
        <Reveal>
        <section id="tarifs" className="mt-24 scroll-mt-28 text-center sm:mt-32">
          <h2 className="font-display mx-auto max-w-xl text-3xl font-semibold leading-tight text-slate-900 sm:text-4xl">
            Le patient paie son kiné. Le kiné paie EasyPhysio.
          </h2>

          <div className="mt-10 text-left">
            <PricingSection />
          </div>
        </section>
        </Reveal>

        {/* ── FAQ ──────────────────────────────────────────────── */}
        <Reveal>
        <section id="faq" className="mx-auto mt-24 max-w-2xl scroll-mt-28 sm:mt-32">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Encore un doute&nbsp;?</p>
          <h2 className="font-display mt-2 text-3xl font-semibold leading-tight text-slate-900 sm:text-4xl">
            Les réponses à toutes vos questions
          </h2>
          <div className="mt-8">
            <FaqSection />
          </div>
        </section>
        </Reveal>

        {/* ── Final CTA ────────────────────────────────────────── */}
        <Reveal>
        <section className="my-24 sm:my-32">
          <div className="rounded-[2rem] bg-slate-900 px-8 py-14 text-center shadow-xl sm:px-14">
            <h2 className="font-display mx-auto max-w-xl text-3xl font-semibold leading-tight text-white sm:text-4xl">
              Prêt à suivre vos patients entre les séances ?
            </h2>
            <p className="mx-auto mt-4 max-w-md leading-relaxed text-slate-300">
              Créez votre compte, composez un premier programme et invitez un patient en quelques
              minutes.
            </p>
            <p className="mt-6 text-sm font-medium text-blue-300">
              Le programme reste conçu et piloté par vous. L&apos;app ne décide rien à votre place.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/signup/kine"
                className="inline-flex items-center justify-center gap-1.5 rounded-full bg-white px-6 py-3 font-medium text-slate-900 shadow-sm transition hover:bg-slate-100 active:scale-95"
              >
                Créer un compte praticien
                <ArrowRight className="h-4 w-4" strokeWidth={2} />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center font-medium text-slate-300 underline-offset-4 transition hover:text-white hover:underline"
              >
                Se connecter
              </Link>
            </div>
          </div>
        </section>
        </Reveal>
      </main>

      <SiteFooter />
      </div>
    </div>
  );
}
