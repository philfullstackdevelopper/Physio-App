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
import FitToBox from "@/components/FitToBox";
import FitToViewport from "@/components/FitToViewport";
import KineJourneyDemo from "@/components/KineJourneyDemo";
import ComparisonTable from "@/components/ComparisonTable";
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
        {/* Tout le hero — texte, boutons ET le téléphone en entier — doit
            être visible dès l'arrivée, sans défiler, sur tout écran
            (Philippe, 2026-09-29) : la section fait la hauteur de l'écran
            (min-h-dvh, pt = place du header fixe), le texte se resserre sur
            les écrans peu hauts (variante `short`, app/globals.css) et le
            téléphone se réduit tout seul dans la place restante (FitToBox). */}
        <section className="flex min-h-dvh flex-col gap-4 pb-4 pt-20 lg:grid lg:grid-cols-[minmax(0,36rem)_18rem] lg:items-center lg:justify-center lg:gap-24 lg:pb-6 lg:pt-24 lg:short:pt-20">
          <div>
            <h1 className="font-display animate-[fadeInUp_0.6s_ease-out_both] max-w-xl text-3xl font-semibold leading-[1.08] tracking-tight text-slate-900 sm:text-5xl lg:text-[3.4rem] lg:short:text-[2.6rem]">
              La rééducation ne s&apos;arrête pas en sortant du cabinet.
            </h1>
            <p className="animate-[fadeInUp_0.6s_ease-out_both] [animation-delay:160ms] mt-3 max-w-lg text-base leading-relaxed text-slate-600 sm:mt-5 sm:text-lg lg:short:mt-3 lg:short:text-base">
              Chaque exercice choisi par votre kiné. Chaque séance guidée en vidéo. Chaque progrès
              visible pour lui, entre deux rendez-vous.
            </p>

            <div className="animate-[fadeInUp_0.6s_ease-out_both] [animation-delay:220ms] mt-5 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:items-center lg:short:mt-5">
              <PrimaryCta href="/signup/kine">Créer un compte praticien</PrimaryCta>
              <Link
                href="/login"
                className="inline-flex items-center justify-center font-medium text-slate-600 underline-offset-4 transition hover:text-blue-700 hover:underline"
              >
                J&apos;ai déjà un programme
              </Link>
            </div>

            <ul className="animate-[fadeInUp_0.6s_ease-out_both] [animation-delay:280ms] mt-5 flex flex-col gap-1.5 sm:mt-8 sm:gap-2.5 lg:short:mt-5 lg:short:gap-1.5">
              {HERO_CHIPS.map((chip) => (
                <li key={chip.label} className="flex items-center gap-2">
                  <chip.icon className="h-4 w-4 shrink-0 text-blue-600" strokeWidth={1.75} />
                  <span className="text-xs font-medium text-slate-600 sm:text-sm">{chip.label}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* 280 × 620 : taille naturelle du PhoneMockup (cadre 260 px + écran
              540 px + bordures) + marge pour le flottement et l'inclinaison 3D. */}
          <FitToBox
            width={280}
            height={620}
            className="min-h-0 flex-1 animate-[fadeInUp_0.7s_ease-out_both] [animation-delay:250ms] lg:h-full lg:self-stretch"
          >
            <PhoneMockup />
          </FitToBox>
        </section>

        {/* ── Côté kiné : tableau de bord → patient → action ─────── */}
        <Reveal>
        <section id="cote-kine" className="mt-16 scroll-mt-24 sm:mt-24">
          <div className="mx-auto max-w-2xl text-center sm:short:max-w-5xl">
            <h2 className="font-display text-2xl font-semibold leading-tight text-slate-900 sm:text-3xl">
              Côté kiné : de son tableau de bord à la fiche de chaque patient.
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-slate-600 sm:short:mt-1 sm:short:text-sm">
              Tout ce qui se passe entre deux séances, en un coup d&apos;œil. Comprendre, décider, ajuster : 2 clics suffisent.
            </p>
          </div>

          {/* La démo déborde de la colonne de texte : pleine largeur jusqu'à 1 200 px. */}
          <FitToViewport stable className="mx-auto mt-12 max-w-7xl sm:short:mt-4 lg:-mx-16">
            <KineJourneyDemo />
          </FitToViewport>

          {/* Masqué sur téléphone et écran peu haut : le header garde son bouton « Créer un compte ». */}
          <div className="mt-10 hidden text-center sm:block sm:short:hidden">
            <PrimaryCta>Créer un compte praticien</PrimaryCta>
          </div>
        </section>
        </Reveal>

        {/* ── Comparaison ──────────────────────────────────────── */}
        <Reveal>
        {/* Dès lg : titre à gauche, tableau à droite — le titre ne prend plus
            de hauteur au-dessus du tableau (tenir sur un écran, Philippe
            2026-09-29). */}
        <section id="comparaison" className="mt-24 scroll-mt-24 sm:mt-32 lg:grid lg:grid-cols-[1fr_3fr] lg:items-center lg:gap-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="font-display max-w-xl text-2xl font-semibold leading-tight text-slate-900 sm:text-3xl">
                Ce qui change vraiment pour le patient
              </h2>
              <p className="mt-3 max-w-xl leading-relaxed text-slate-600 sm:short:mt-1">
                La plupart des programmes s&apos;arrêtent à la porte du cabinet.{" "}
                <br className="hidden sm:block lg:hidden" />
                EasyPhysio assure un suivi continu, personnalisé et efficace.
              </p>
            </div>
          </div>
          <FitToViewport className="mt-8 sm:short:mt-4 lg:mt-0">
            <ComparisonTable />
          </FitToViewport>
        </section>
        </Reveal>

        {/* ── Témoignages ──────────────────────────────────────── */}
        <Reveal>
        <section className="mt-24 sm:mt-32">
          <h2 className="font-display max-w-xl text-2xl font-semibold leading-tight text-slate-900 sm:text-3xl">
            Utilisé au cabinet,
            <br className="sm:hidden" />{" "}
            et surtout à la maison
          </h2>
          <FitToViewport>
            <Testimonials />
          </FitToViewport>
        </section>
        </Reveal>

        {/* ── Tarifs ───────────────────────────────────────────── */}
        {/* Bascule "Côté kiné" / "Côté patient" (Philippe, 2026-09-13) : un
            seul prix parle à chaque audience (la commission pour le kiné,
            les 3 offres pour le patient) — les montrer côte à côte, comme
            avant, ne parlait vraiment à personne. Les prix patient viennent
            de lib/billing/plans.ts (même source que /patient/abonnement). */}
        <Reveal>
        <section id="tarifs" className="mt-24 scroll-mt-24 text-center sm:mt-32">
          <h2 className="font-display mx-auto max-w-xl text-2xl font-semibold leading-tight text-slate-900 sm:text-3xl">
            Le patient paie son kiné. Le kiné paie EasyPhysio.
          </h2>

          <FitToViewport className="mt-10 text-left sm:short:mt-5">
            <PricingSection />
          </FitToViewport>
        </section>
        </Reveal>

        {/* ── FAQ ──────────────────────────────────────────────── */}
        <Reveal>
        <section id="faq" className="mx-auto mt-24 max-w-2xl scroll-mt-28 sm:mt-32">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Encore un doute&nbsp;?</p>
          <h2 className="font-display mt-2 text-2xl font-semibold leading-tight text-slate-900 sm:text-3xl">
            Les réponses à toutes vos questions
          </h2>
          <div className="mt-8 sm:short:mt-4">
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
