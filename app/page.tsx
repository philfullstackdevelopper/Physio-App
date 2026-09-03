import { Fragment } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  ClipboardList,
  Eye,
  PenSquare,
  Play,
  ShieldCheck,
  Sparkles,
  Video,
  Zap,
} from "lucide-react";
import ConditionsShowcase from "@/components/ConditionsShowcase";
import FeaturesShowcase from "@/components/FeaturesShowcase";
import FaqSection from "@/components/FaqSection";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import PhoneMockup from "@/components/PhoneMockup";
import KineJourneyDemo from "@/components/KineJourneyDemo";
import ComparisonTable from "@/components/ComparisonTable";
import Testimonials from "@/components/Testimonials";
import Reveal from "@/components/Reveal";
import RevealGroup, { RevealItem } from "@/components/RevealGroup";

const HERO_CHIPS = [
  { icon: Sparkles, label: "Gratuit pour les patients" },
  { icon: Video, label: "Vidéos, sans caméra ni capteur" },
  { icon: ShieldCheck, label: "Piloté par votre kiné, jamais par un algorithme seul" },
];

const STEPS = [
  {
    title: "Votre kiné construit votre programme",
    body: "Il choisit les exercices et la phase adaptés à votre situation, depuis sa bibliothèque.",
    visual: (
      <div className="rounded-xl border border-slate-100 bg-white p-3">
        <p className="text-[10px] font-medium uppercase tracking-wide text-blue-600">Programme</p>
        <p className="mt-0.5 text-sm font-semibold text-slate-900">Mobilité épaule · Phase 2</p>
        <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
          <Check className="h-3 w-3 text-emerald-500" strokeWidth={2.5} />
          8 exercices validés pour cette phase
        </p>
      </div>
    ),
  },
  {
    title: "Vous suivez vos séances, guidées pas à pas",
    body: "Une vidéo et des consignes claires pour chaque mouvement, un exercice à la fois.",
    visual: (
      <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
          <Play className="h-3.5 w-3.5 fill-current" strokeWidth={0} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-900">Rotation externe</p>
          <p className="text-xs text-slate-500">2 × 10 · 45 s restantes</p>
        </div>
        <ClipboardList className="h-4 w-4 shrink-0 text-slate-300" strokeWidth={1.75} />
      </div>
    ),
  },
  {
    title: "Il ajuste selon vos retours",
    body: "Douleur ou difficulté ? Votre praticien le voit et adapte le programme le jour même.",
    visual: (
      <div className="rounded-xl border border-slate-100 bg-white p-3">
        <p className="text-xs font-medium text-amber-600">Douleur signalée hier</p>
        <p className="mt-1 flex items-center gap-1 text-xs text-slate-600">
          <Check className="h-3 w-3 text-emerald-500" strokeWidth={2.5} />
          Charge allégée sur 2 exercices
        </p>
        <p className="mt-0.5 text-[11px] text-slate-400">Ajusté par Julien, kiné, il y a 2 h</p>
      </div>
    ),
  },
];

function PrimaryCta({
  href = "/signup",
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
              <PrimaryCta href="/signup">Créer un compte praticien</PrimaryCta>
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
        <section className="py-16 sm:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">Côté kiné</p>
            <h2 className="font-display mt-3 text-3xl font-semibold leading-tight text-slate-900 sm:text-4xl">
              De son tableau de bord à la fiche de chaque patient.
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-slate-600">
              Tout ce qui se passe entre deux séances, en un coup d&apos;œil. Comprendre, décider, ajuster : 2 clics suffisent.
            </p>
          </div>

          <RevealGroup className="mx-auto mt-10 grid max-w-4xl gap-6 sm:grid-cols-3">
            {[
              { icon: Eye, title: "Tout voir", body: "Assiduité, phases, dernières séances et signaux importants." },
              { icon: Zap, title: "Comprendre vite", body: "Ouvrez le suivi détaillé, l'historique de douleur et l'adhérence." },
              { icon: PenSquare, title: "Agir immédiatement", body: "Ajustez le programme en quelques clics, le patient voit le changement aussitôt." },
            ].map((f) => (
              <RevealItem key={f.title} className="flex gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600"><f.icon className="h-5 w-5" strokeWidth={1.75} /></span>
                <span><span className="block font-semibold text-slate-900">{f.title}</span><span className="mt-1 block text-sm leading-relaxed text-slate-600">{f.body}</span></span>
              </RevealItem>
            ))}
          </RevealGroup>

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

          {/* A connected diagram instead of three parallel cards: the mini
              UI-previews lead, arrows do the connecting work, and the copy
              shrinks to a caption — reads as one mechanism, not a generic
              3-column feature grid. Picked from a live 3-variant prototype
              (2026-09-02); see git history for the other two directions. */}
          <RevealGroup className="mt-10 flex flex-col items-stretch gap-6 lg:flex-row lg:items-center lg:gap-0">
            {STEPS.map((step, i) => (
              <Fragment key={step.title}>
                <RevealItem className="flex-1">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    {step.visual}
                  </div>
                  <p className="mt-4 text-sm font-semibold text-slate-900">
                    <span className="text-blue-600">{i + 1}.</span> {step.title}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500">{step.body}</p>
                </RevealItem>
                {i < STEPS.length - 1 && (
                  <div aria-hidden className="hidden shrink-0 px-4 lg:flex">
                    <ArrowRight className="h-5 w-5 text-blue-300" strokeWidth={1.75} />
                  </div>
                )}
              </Fragment>
            ))}
          </RevealGroup>

          <div className="mt-10 border-t border-slate-200 pt-8">
            <PrimaryCta>Commencer maintenant</PrimaryCta>
          </div>
        </section>
        </Reveal>

        {/* ── Fonctionnalités ──────────────────────────────────── */}
        <Reveal>
        <section id="fonctionnalites" className="mt-24 scroll-mt-28 text-center sm:mt-32">
          <h2 className="font-display mx-auto max-w-lg text-3xl font-semibold leading-tight text-slate-900 sm:text-4xl">
            Tout ce qu&apos;il faut, rien de superflu
          </h2>
          <div className="mx-auto mt-8 max-w-3xl">
            <FeaturesShowcase />
          </div>
        </section>
        </Reveal>

        {/* ── Comparaison ──────────────────────────────────────── */}
        <Reveal>
        <section id="comparaison" className="mt-24 scroll-mt-28 sm:mt-32">
          <h2 className="font-display max-w-xl text-3xl font-semibold leading-tight text-slate-900 sm:text-4xl">
            Ce qui change vraiment pour le patient
          </h2>
          <p className="mt-3 max-w-xl leading-relaxed text-slate-600">
            La plupart des programmes s&apos;arrêtent à la porte du cabinet. Voici la différence,
            ligne par ligne.
          </p>
          <div className="mt-8">
            <ComparisonTable />
          </div>
        </section>
        </Reveal>

        {/* ── Témoignages ──────────────────────────────────────── */}
        <Reveal>
        <section className="mt-24 sm:mt-32">
          <h2 className="font-display max-w-xl text-3xl font-semibold leading-tight text-slate-900 sm:text-4xl">
            Utilisé au cabinet, et surtout à la maison
          </h2>
          <Testimonials />
        </section>
        </Reveal>

        {/* ── Conditions couvertes ─────────────────────────────── */}
        <Reveal>
        <section id="conditions" className="mt-24 scroll-mt-28 sm:mt-32">
          <h2 className="font-display max-w-xl text-3xl font-semibold leading-tight text-slate-900 sm:text-4xl">
            Des programmes pour chaque situation
          </h2>
          <p className="mt-3 max-w-xl leading-relaxed text-slate-600">
            Cliquez sur une catégorie pour voir des exemples de situations concernées.
          </p>
          <ConditionsShowcase />
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
                href="/signup"
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
                href="/signup"
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
