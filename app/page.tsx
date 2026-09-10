import Link from "next/link";
import {
  ArrowRight,
  PlayCircle,
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
import Testimonials from "@/components/Testimonials";
import StepsShowcase from "@/components/StepsShowcase";
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

        {/* ── Comment ça marche ────────────────────────────────── */}
        <Reveal>
        <section id="comment-ca-marche" className="mt-24 scroll-mt-28 sm:mt-32">
          <h2 className="font-display max-w-lg text-3xl font-semibold leading-tight text-slate-900 sm:text-4xl">
            Trois étapes, rien de plus
          </h2>
          <p className="mt-3 max-w-xl text-lg leading-relaxed text-slate-600">
            EasyPhysio simplifie le suivi et l&apos;adaptation de vos patients au quotidien.
          </p>

          <StepsShowcase />

          <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
            <PrimaryCta>Découvrir EasyPhysio en action</PrimaryCta>
            <Link
              href="#cote-kine"
              className="inline-flex items-center gap-2 font-medium text-slate-700 transition hover:text-blue-700"
            >
              <PlayCircle className="h-5 w-5 text-blue-600" strokeWidth={1.75} />
              Voir la démo <span className="font-normal text-slate-500">(1 min)</span>
            </Link>
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
        {/* "Big number" direction, picked from a live 3-variant prototype
            (2026-09-02; see git history for the other two). Money flow is
            stated plainly (patient pays kiné, kiné pays EasyPhysio) rather
            than the old "free for everyone" framing, which no longer
            matched lib/billing/platformFee.ts. */}
        <Reveal>
        <section id="tarifs" className="mt-24 scroll-mt-28 sm:mt-32">
          <h2 className="font-display max-w-xl text-3xl font-semibold leading-tight text-slate-900 sm:text-4xl">
            Le patient paie son kiné. Le kiné paie EasyPhysio.
          </h2>

          <RevealGroup className="mt-10 grid gap-4 sm:grid-cols-2">
            <RevealItem className="rounded-2xl bg-white/70 p-8">
              <p className="text-sm font-medium text-slate-500">Patients</p>
              <p className="font-display mt-3 text-4xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-5xl">
                Fixé par votre kiné
              </p>
              <p className="mt-2 text-sm text-slate-400">
                réglé directement à votre praticien, via Stripe
              </p>
              <ul className="mt-8 space-y-2 text-sm text-slate-600">
                <li>
                  Accès uniquement sur invitation d&apos;un kinésithérapeute déjà inscrit sur
                  EasyPhysio
                </li>
                <li>Paiement sécurisé, directement à votre kiné</li>
                <li>Historique complet de vos séances conservé</li>
              </ul>
              <Link
                href="/login"
                className="mt-8 inline-flex items-center gap-1 text-sm font-medium text-slate-600 underline-offset-4 transition hover:text-blue-700 hover:underline"
              >
                Me connecter
                <ArrowRight className="h-4 w-4" strokeWidth={2} />
              </Link>
            </RevealItem>

            <RevealItem className="rounded-2xl bg-blue-600 p-8 text-white">
              <p className="text-sm font-medium text-blue-100">
                Cabinets &amp; praticiens · Bêta
              </p>
              <p className="font-display mt-3 text-7xl font-semibold tracking-tight">15 %</p>
              <p className="mt-1 text-sm text-blue-200">
                prélevés par patient actif, sur le tarif que vous fixez
              </p>
              <ul className="mt-8 space-y-2 text-sm text-blue-50">
                <li>Vous fixez votre tarif mensuel par patient</li>
                <li>Paiement direct par vos patients, via Stripe Connect</li>
                <li>Patients illimités</li>
                <li>Bibliothèque d&apos;exercices avec vidéos</li>
                <li>Suivi d&apos;assiduité et signalements de douleur</li>
                <li>Ajustement de programme à distance</li>
              </ul>
              <Link
                href="/signup/kine"
                className="mt-8 inline-flex items-center gap-1.5 rounded-full bg-white px-6 py-3 text-sm font-medium text-blue-700 shadow-sm transition hover:bg-slate-100 active:scale-[0.97]"
              >
                Demander un accès
                <ArrowRight className="h-4 w-4" strokeWidth={2} />
              </Link>
              <p className="mt-4 text-xs leading-relaxed text-blue-100">
                Aucun abonnement fixe — la commission est prélevée automatiquement, uniquement sur
                vos patients actifs.
              </p>
            </RevealItem>
          </RevealGroup>
        </section>
        </Reveal>

        {/* ── FAQ ──────────────────────────────────────────────── */}
        <Reveal>
        <section id="faq" className="mx-auto mt-24 max-w-2xl scroll-mt-28 sm:mt-32">
          <h2 className="font-display text-3xl font-semibold leading-tight text-slate-900 sm:text-4xl">
            Les questions qu&apos;on nous pose le plus
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
