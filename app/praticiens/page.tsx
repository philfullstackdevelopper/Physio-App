import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  ClipboardList,
  Bell,
  FileBarChart,
  Video,
} from "lucide-react";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import KineMockup from "@/components/KineMockup";
import DotCanvas from "@/components/DotCanvas";

export const metadata: Metadata = {
  title: "Pour les kinésithérapeutes",
  description:
    "Construisez vos programmes en quelques minutes, suivez l'assiduité de vos patients entre deux rendez-vous et ajustez à distance. Gratuit pendant la bêta.",
};

const PAIN_POINTS = [
  {
    icon: ClipboardList,
    title: "Des programmes sur papier",
    body: "Imprimés, perdus, ou refaits de mémoire, et impossibles à corriger une fois le patient rentré chez lui.",
  },
  {
    icon: Bell,
    title: "Un trou noir entre deux séances",
    body: "Six semaines sans savoir si les exercices sont faits, mal faits, ou pas faits du tout.",
  },
  {
    icon: FileBarChart,
    title: "Des bilans reconstruits de mémoire",
    body: "« Ça va mieux » n'est pas une donnée. Sans suivi, chaque consultation repart de zéro.",
  },
];

const CAPABILITIES = [
  {
    title: "Composez un programme en quelques minutes",
    body: "Bibliothèque d'exercices filmés, classés par zone et par phase. Ajustez séries, tempo et intensité pour chaque patient.",
  },
  {
    title: "Voyez qui fait ses exercices",
    body: "Séances validées, durée réelle, ressenti après chaque exercice : l'assiduité est visible patient par patient, semaine par semaine.",
  },
  {
    title: "Soyez alerté quand ça bloque",
    body: "Une douleur signalée remonte le jour même avec son contexte, pas au prochain rendez-vous, dans une phrase vague.",
  },
  {
    title: "Ajustez à distance",
    body: "Allégez un exercice ou changez de phase en deux clics. Le patient voit la mise à jour aussitôt dans son application.",
  },
];

const SETUP_STEPS = [
  {
    title: "Créez votre compte cabinet",
    body: "Nom du cabinet, tarif patient éventuel, c'est tout. Vos patients n'ont rien à payer.",
  },
  {
    title: "Composez votre premier programme",
    body: "Choisissez les exercices dans la bibliothèque, ordonnez-les en phases, envoyez l'invitation au patient.",
  },
  {
    title: "Suivez et ajustez en continu",
    body: "Le tableau de bord devient votre point de départ avant chaque séance, et votre filet de sécurité entre elles.",
  },
];

function Cta() {
  return (
    <Link
      href="/signup/kine"
      className="inline-flex items-center justify-center gap-1.5 rounded-full bg-blue-600 px-6 py-3 font-medium text-white shadow-sm transition hover:bg-blue-700 active:scale-95"
    >
      Créer mon compte praticien
      <ArrowRight className="h-4 w-4" strokeWidth={2} />
    </Link>
  );
}

export default function PraticiensPage() {
  return (
    <div className="relative min-h-screen bg-[#f6f8fd] text-slate-800">
      <DotCanvas />
      <div className="relative z-10">
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-6">
        {/* Hero */}
        <section className="grid items-center gap-12 pb-16 pt-28 lg:grid-cols-2 lg:gap-16 lg:pb-24 lg:pt-36">
          <div>
            <h1 className="font-display max-w-xl text-4xl font-semibold leading-[1.08] tracking-tight text-slate-900 sm:text-5xl">
              Vos programmes suivis, même quand vos patients sont chez eux.
            </h1>
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-slate-600">
              Pensé pour les kinésithérapeutes : EasyPhysio distribue vos programmes sur le téléphone du patient, le guide
              exercice par exercice, et vous remontre ce qui se passe vraiment entre deux
              rendez-vous.
            </p>
            <div className="mt-8">
              <Cta />
            </div>
            <p className="mt-4 text-sm text-slate-500">
              Gratuit pendant la bêta · sans engagement · vos patients ne payent jamais
            </p>
          </div>
          <KineMockup />
        </section>

        {/* Pain points */}
        <section className="mt-8 sm:mt-12">
          <h2 className="font-display mx-auto max-w-xl text-center text-3xl font-semibold leading-tight text-slate-900 sm:text-4xl">
            Ce qui se passe aujourd&apos;hui entre deux rendez-vous
          </h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {PAIN_POINTS.map((p) => (
              <div
                key={p.title}
                className="rounded-3xl border border-slate-200/70 bg-white p-7 shadow-sm"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                  <p.icon className="h-5 w-5" strokeWidth={1.75} />
                </span>
                <h3 className="font-display mt-4 text-lg font-semibold text-slate-900">{p.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{p.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Capabilities */}
        <section className="my-24 sm:my-32">
          <div className="rounded-[2rem] border border-slate-200/70 bg-white p-8 shadow-sm sm:p-12">
            <h2 className="font-display max-w-xl text-3xl font-semibold leading-tight text-slate-900 sm:text-4xl">
              Le suivi continue là où la séance s&apos;arrête
            </h2>
            <div className="mt-10 grid gap-x-12 gap-y-8 sm:grid-cols-2">
              {CAPABILITIES.map((c, i) => (
                <div key={c.title} className="flex gap-4">
                  <span className="font-display flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-base font-semibold text-white">
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="font-display text-lg font-semibold text-slate-900">{c.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{c.body}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-10 flex flex-col gap-3 border-t border-slate-100 pt-8 sm:flex-row sm:items-center sm:gap-6">
              <Cta />
              <span className="flex items-center gap-1.5 text-sm text-slate-500">
                <Video className="h-4 w-4 text-blue-600" strokeWidth={1.75} />
                Bibliothèque d&apos;exercices vidéo incluse
              </span>
            </div>
          </div>
        </section>

        {/* Setup steps */}
        <section className="mb-24 sm:mb-32">
          <h2 className="font-display max-w-xl text-3xl font-semibold leading-tight text-slate-900 sm:text-4xl">
            Démarrer côté cabinet prend moins d&apos;une consultation
          </h2>
          <div className="mt-10 grid gap-8 lg:grid-cols-3">
            {SETUP_STEPS.map((step, i) => (
              <div key={step.title}>
                <span className="font-display flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-base font-semibold text-blue-700">
                  {i + 1}
                </span>
                <h3 className="font-display mt-4 text-lg font-semibold text-slate-900">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{step.body}</p>
              </div>
            ))}
          </div>

          {/* Beta band */}
          <div className="mt-14 rounded-[2rem] bg-slate-900 px-8 py-12 text-center shadow-xl sm:px-14">
            <h2 className="font-display mx-auto max-w-lg text-2xl font-semibold leading-tight text-white sm:text-3xl">
              Bêta : gratuit pour les premiers cabinets
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-300">
              Patients illimités, bibliothèque complète, suivi et alertes. Le tarif définitif
              sera annoncé avant la fin de la bêta. Les cabinets pionniers garderont des
              conditions avantageuses.
            </p>
            <ul className="mx-auto mt-6 flex max-w-md flex-col gap-2 text-left sm:flex-row sm:justify-center sm:gap-6 sm:text-left">
              {["Sans engagement", "Données RGPD", "Support direct"].map((point) => (
                <li key={point} className="flex items-center gap-2 text-sm text-slate-200">
                  <Check className="h-4 w-4 shrink-0 text-emerald-400" strokeWidth={2.5} />
                  {point}
                </li>
              ))}
            </ul>
            <div className="mt-8">
              <Link
                href="/signup/kine"
                className="inline-flex items-center justify-center gap-1.5 rounded-full bg-white px-6 py-3 font-medium text-slate-900 shadow-sm transition hover:bg-slate-100 active:scale-95"
              >
                Demander mon invitation
                <ArrowRight className="h-4 w-4" strokeWidth={2} />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
      </div>
    </div>
  );
}
