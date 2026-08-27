import Link from "next/link";
import {
  ArrowRight,
  Check,
  ClipboardList,
  Play,
  ShieldCheck,
  Sparkles,
  Video,
} from "lucide-react";
import ConditionsShowcase from "@/components/ConditionsShowcase";
import FeaturesShowcase from "@/components/FeaturesShowcase";
import FaqSection from "@/components/FaqSection";
import SiteHeader from "@/components/SiteHeader";
import DotCanvas from "@/components/DotCanvas";
import SiteFooter from "@/components/SiteFooter";
import PhoneMockup from "@/components/PhoneMockup";
import PhoneShowcase from "@/components/PhoneShowcase";
import KineMockup from "@/components/KineMockup";
import ComparisonTable from "@/components/ComparisonTable";
import Testimonials from "@/components/Testimonials";
import Reveal from "@/components/Reveal";
import RevealGroup, { RevealItem } from "@/components/RevealGroup";

const HERO_CHIPS = [
  { icon: Sparkles, label: "Gratuit pour les patients" },
  { icon: Video, label: "Vidéos, sans caméra ni capteur" },
  { icon: ShieldCheck, label: "Piloté par votre kiné, jamais par un algorithme seul" },
];

const PROOF_STATS = [
  { value: "100 %", label: "des programmes créés par votre praticien" },
  { value: "0", label: "caméra ni capteur requis chez vous" },
  { value: "1", label: "seul exercice affiché à l'écran, à la fois" },
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
      <DotCanvas />
      <div className="relative z-10">
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-6">
        {/* ── Hero ─────────────────────────────────────────────── */}
        <section className="grid items-center gap-12 pb-16 pt-28 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:pb-24 lg:pt-36">
          <div>
            <span className="animate-[fadeInUp_0.6s_ease-out_both] inline-block rounded-full border border-blue-100 bg-white px-4 py-1.5 text-sm font-medium text-blue-700 shadow-sm">
              Conçu avec des kinésithérapeutes en cabinet libéral
            </span>
            <h1 className="font-display animate-[fadeInUp_0.6s_ease-out_both] [animation-delay:80ms] mt-6 max-w-xl text-4xl font-semibold leading-[1.08] tracking-tight text-slate-900 sm:text-5xl lg:text-[3.4rem]">
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
                className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-6 py-3 font-medium text-slate-700 transition hover:border-blue-200 hover:bg-blue-50/50"
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

        {/* ── Phone showcase: pinned phone, screens change as you scroll ── */}
        <PhoneShowcase />

        {/* ── Proof strip ──────────────────────────────────────── */}
        <Reveal>
        <section className="-mx-6 border-y border-slate-200/70 bg-white/70 backdrop-blur">
          <RevealGroup className="mx-auto grid max-w-6xl gap-6 px-6 py-8 sm:grid-cols-3">
            {PROOF_STATS.map((stat) => (
              <RevealItem key={stat.label} className="flex items-baseline gap-3 sm:block">
                <p className="font-display text-3xl font-semibold text-blue-700">{stat.value}</p>
                <p className="mt-1 text-sm leading-snug text-slate-600">{stat.label}</p>
              </RevealItem>
            ))}
          </RevealGroup>
        </section>
        </Reveal>

        {/* ── Comment ça marche ────────────────────────────────── */}
        <Reveal>
        <section id="comment-ca-marche" className="mt-24 scroll-mt-28 sm:mt-32">
          <div className="rounded-[2rem] border border-slate-200/70 bg-white p-8 shadow-sm sm:p-12">
            <p className="text-sm font-semibold uppercase tracking-[0.15em] text-blue-600">
              Le parcours
            </p>
            <h2 className="font-display mt-2 max-w-lg text-3xl font-semibold leading-tight text-slate-900 sm:text-4xl">
              Trois étapes, rien de plus
            </h2>

            <RevealGroup className="mt-10 grid gap-8 lg:grid-cols-3">
              {STEPS.map((step, i) => (
                <RevealItem key={step.title}>
                  <div className="flex items-center gap-3">
                    <span className="font-display flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-base font-semibold text-white">
                      {i + 1}
                    </span>
                    <h3 className="font-display text-lg font-semibold leading-snug text-slate-900">
                      {step.title}
                    </h3>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-slate-600">{step.body}</p>
                  <div className="mt-5">{step.visual}</div>
                </RevealItem>
              ))}
            </RevealGroup>

            <div className="mt-10 border-t border-slate-100 pt-8">
              <PrimaryCta>Commencer maintenant</PrimaryCta>
            </div>
          </div>
        </section>
        </Reveal>

        {/* ── Côté praticien : dashboard ───────────────────────── */}
        <Reveal>
        <section className="mt-24 grid items-center gap-12 sm:mt-32 lg:grid-cols-2 lg:gap-16">
          <div className="order-2 lg:order-1">
            <KineMockup />
          </div>
          <div className="order-1 lg:order-2">
            <p className="text-sm font-semibold uppercase tracking-[0.15em] text-blue-600">
              Côté praticien
            </p>
            <h2 className="font-display mt-2 max-w-md text-3xl font-semibold leading-tight text-slate-900 sm:text-4xl">
              Toute l&apos;assiduité du cabinet, d&apos;un coup d&apos;œil
            </h2>
            <ul className="mt-8 space-y-4">
              {[
                "Chaque patient : programme en cours, phase atteinte, date de la dernière séance.",
                "Les douleurs signalées remontent le jour même, plus besoin d'attendre le rendez-vous.",
                "Un exercice trop dur ? Allégez-le en deux clics, le patient voit le changement aussitôt.",
              ].map((point) => (
                <li key={point} className="flex items-start gap-3">
                  <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-50">
                    <Check className="h-3 w-3 text-blue-600" strokeWidth={2.5} />
                  </span>
                  <span className="leading-relaxed text-slate-600">{point}</span>
                </li>
              ))}
            </ul>
            <div className="mt-8">
              <PrimaryCta>Créer un compte praticien</PrimaryCta>
            </div>
          </div>
        </section>
        </Reveal>

        {/* ── Fonctionnalités ──────────────────────────────────── */}
        <Reveal>
        <section id="fonctionnalites" className="mt-24 scroll-mt-28 sm:mt-32">
          <div className="rounded-[2rem] border border-slate-200/70 bg-white p-8 shadow-sm sm:p-12">
            <p className="text-sm font-semibold uppercase tracking-[0.15em] text-blue-600">
              Fonctionnalités
            </p>
            <h2 className="font-display mt-2 max-w-lg text-3xl font-semibold leading-tight text-slate-900 sm:text-4xl">
              Tout ce qu&apos;il faut, rien de superflu
            </h2>
            <div className="mt-8 max-w-3xl">
              <FeaturesShowcase />
            </div>
          </div>
        </section>
        </Reveal>

        {/* ── Comparaison ──────────────────────────────────────── */}
        <Reveal>
        <section id="comparaison" className="mt-24 scroll-mt-28 sm:mt-32">
          <p className="text-sm font-semibold uppercase tracking-[0.15em] text-blue-600">
            Pourquoi pas juste du papier ?
          </p>
          <h2 className="font-display mt-2 max-w-xl text-3xl font-semibold leading-tight text-slate-900 sm:text-4xl">
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
          <div className="rounded-[2rem] border border-slate-200/70 bg-white p-8 sm:p-12">
            <p className="text-sm font-semibold uppercase tracking-[0.15em] text-blue-600">
              Premiers retours
            </p>
            <h2 className="font-display mt-2 max-w-xl text-3xl font-semibold leading-tight text-slate-900 sm:text-4xl">
              Utilisé au cabinet, et surtout à la maison
            </h2>
            <Testimonials />
          </div>
        </section>
        </Reveal>

        {/* ── Conditions couvertes ─────────────────────────────── */}
        <Reveal>
        <section id="conditions" className="mt-24 scroll-mt-28 sm:mt-32">
          <p className="text-sm font-semibold uppercase tracking-[0.15em] text-blue-600">
            Conditions couvertes
          </p>
          <h2 className="font-display mt-2 max-w-xl text-3xl font-semibold leading-tight text-slate-900 sm:text-4xl">
            Des programmes pour chaque situation
          </h2>
          <p className="mt-3 max-w-xl leading-relaxed text-slate-600">
            Cliquez sur une catégorie pour voir des exemples de situations concernées.
          </p>
          <ConditionsShowcase />
        </section>
        </Reveal>

        {/* ── Tarifs ───────────────────────────────────────────── */}
        <Reveal>
        <section id="tarifs" className="mt-24 scroll-mt-28 sm:mt-32">
          <div className="rounded-[2rem] border border-slate-200/70 bg-white p-8 shadow-sm sm:p-12">
            <p className="text-sm font-semibold uppercase tracking-[0.15em] text-blue-600">
              Tarifs
            </p>
            <h2 className="font-display mt-2 max-w-xl text-3xl font-semibold leading-tight text-slate-900 sm:text-4xl">
              Gratuite pour les patients, simple pour les cabinets
            </h2>

            <RevealGroup className="mt-10 grid items-start gap-6 lg:grid-cols-2">
              <RevealItem className="rounded-3xl border border-slate-200/70 p-8">
                <p className="text-sm font-semibold text-slate-500">Patients</p>
                <p className="font-display mt-2 text-4xl font-semibold text-slate-900">
                  Gratuit<span className="text-lg font-normal text-slate-400">, toujours</span>
                </p>
                <ul className="mt-6 space-y-2.5">
                  {[
                    "Aucune carte bancaire demandée",
                    "Accès via l'invitation de votre praticien",
                    "Historique complet de vos séances conservé",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-slate-600">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" strokeWidth={2.5} />
                      {item}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/login"
                  className="mt-8 inline-flex items-center justify-center gap-1.5 rounded-full border border-slate-300 bg-white px-6 py-3 font-medium text-slate-700 transition hover:border-blue-200 hover:bg-blue-50/50"
                >
                  Me connecter
                  <ArrowRight className="h-4 w-4" strokeWidth={2} />
                </Link>
              </RevealItem>

              <RevealItem className="relative rounded-3xl border-2 border-blue-600 bg-blue-50/40 p-8">
                <span className="absolute -top-3 right-6 rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white">
                  Bêta
                </span>
                <p className="text-sm font-semibold text-blue-700">Cabinets & praticiens</p>
                <p className="font-display mt-2 text-4xl font-semibold text-slate-900">
                  Gratuit<span className="text-lg font-normal text-slate-400"> sur invitation</span>
                </p>
                <ul className="mt-6 space-y-2.5">
                  {[
                    "Patients illimités",
                    "Bibliothèque d'exercices avec vidéos",
                    "Suivi d'assiduité et signalements de douleur",
                    "Ajustement de programme à distance",
                    "Facturation intégrée",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-slate-600">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" strokeWidth={2.5} />
                      {item}
                    </li>
                  ))}
                </ul>
                <div className="mt-8">
                  <PrimaryCta href="/signup">Demander un accès</PrimaryCta>
                </div>
                <p className="mt-4 text-xs leading-relaxed text-slate-500">
                  Le tarif définitif sera annoncé avant la fin de la bêta. Les cabinets pionniers
                  garderont des conditions avantageuses.
                </p>
              </RevealItem>
            </RevealGroup>
          </div>
        </section>
        </Reveal>

        {/* ── FAQ ──────────────────────────────────────────────── */}
        <Reveal>
        <section id="faq" className="mx-auto mt-24 max-w-2xl scroll-mt-28 sm:mt-32">
          <p className="text-sm font-semibold uppercase tracking-[0.15em] text-blue-600">
            Questions fréquentes
          </p>
          <h2 className="font-display mt-2 text-3xl font-semibold leading-tight text-slate-900 sm:text-4xl">
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
                className="inline-flex items-center justify-center rounded-full border border-slate-600 px-6 py-3 font-medium text-slate-200 transition hover:border-slate-400 hover:text-white"
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
