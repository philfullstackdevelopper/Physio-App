import Link from "next/link";
import {
  UserRound,
  Stethoscope,
  ShieldCheck,
  HeartHandshake,
  Sparkles,
  Play,
  CheckCircle2,
  Video,
  Quote,
} from "lucide-react";
import ConditionsShowcase from "@/components/ConditionsShowcase";
import FeaturesShowcase from "@/components/FeaturesShowcase";

const TRUST_POINTS = [
  { icon: HeartHandshake, label: "Conçu avec des kinésithérapeutes" },
  { icon: ShieldCheck, label: "Vos données de santé restent privées" },
  { icon: Sparkles, label: "Un programme, pas une app générique" },
];

const STEPS = [
  {
    title: "Votre kiné vous inscrit",
    body: "Il configure votre programme selon votre situation et votre étape de récupération.",
  },
  {
    title: "Vous suivez vos séances",
    body: "Guidées à l'écran, avec correction par caméra et ajustement automatique de l'intensité.",
  },
  {
    title: "Vous progressez ensemble",
    body: "Votre praticien voit votre assiduité et adapte le programme au fil des semaines.",
  },
];

const QUESTIONS = [
  { color: "bg-teal-600", question: "Comment reprendre le sport sans risquer une rechute ?" },
  { color: "bg-orange-400", question: "Puis-je faire mes exercices seul(e), sans risque ?" },
  { color: "bg-slate-700", question: "Comment mon kiné peut-il me suivre à distance ?" },
];

/** Illustrative mockup of a guided session — no real data, purely decorative. */
function SessionMockup() {
  const circumference = 2 * Math.PI * 42;
  const progress = 0.7;
  return (
    <div
      className="animate-[fadeInUp_0.7s_ease-out_both] [animation-delay:250ms] mx-auto w-full max-w-sm rounded-[2rem] border border-teal-100 bg-white p-6 shadow-xl shadow-teal-900/5"
      aria-hidden
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-teal-600">Séance du jour</p>
          <p className="mt-0.5 font-display text-lg font-semibold text-slate-900">Mobilité — Phase 2</p>
        </div>
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-50 text-teal-700">
          <Video className="h-4.5 w-4.5" strokeWidth={1.75} />
        </span>
      </div>

      <div className="mt-6 flex items-center gap-5">
        <div className="relative flex h-24 w-24 shrink-0 items-center justify-center">
          <svg viewBox="0 0 96 96" className="h-24 w-24 -rotate-90">
            <circle cx="48" cy="48" r="42" fill="none" stroke="#f1f5f9" strokeWidth="8" />
            <circle
              cx="48"
              cy="48"
              r="42"
              fill="none"
              stroke="#0d9488"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - progress)}
            />
          </svg>
          <span className="absolute font-display text-xl font-semibold text-slate-900">
            {Math.round(progress * 10)}/10
          </span>
        </div>
        <div className="flex-1 space-y-2">
          {["Étirement épaule", "Rotation externe", "Renforcement léger"].map((name, i) => (
            <div key={name} className="flex items-center gap-2 text-sm">
              <CheckCircle2
                className={`h-4 w-4 shrink-0 ${i < 2 ? "text-teal-600" : "text-slate-300"}`}
                strokeWidth={2}
              />
              <span className={i < 2 ? "text-slate-500 line-through" : "text-slate-700"}>{name}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
        <span className="text-sm font-medium text-slate-600">Caméra IA active</span>
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-600 text-white">
          <Play className="h-3.5 w-3.5 fill-current" strokeWidth={0} />
        </span>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#faf7f2] text-slate-800">
      {/* Warm ambient background */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(900px 500px at 15% -5%, #ccfbf1 0%, transparent 55%)," +
            "radial-gradient(800px 500px at 95% 0%, #fde9d9 0%, transparent 50%)",
        }}
      />

      {/* Header */}
      <header className="mx-auto flex max-w-6xl items-center justify-center px-6 py-6">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-600 text-lg font-bold text-white shadow-sm">
            P
          </span>
          <span className="text-xl font-semibold text-slate-900">Physio-App</span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6">
        {/* Hero */}
        <section className="pt-6 text-center sm:pt-10">
          <span className="animate-[fadeInUp_0.6s_ease-out_both] inline-block rounded-full border border-teal-100 bg-white/70 px-4 py-1.5 text-sm font-medium text-teal-700 shadow-sm backdrop-blur">
            Rééducation guidée, à domicile
          </span>
          <h1 className="font-display animate-[fadeInUp_0.6s_ease-out_both] [animation-delay:80ms] mx-auto mt-6 max-w-3xl text-4xl font-semibold leading-[1.05] tracking-tight text-slate-900 sm:text-6xl">
            Votre rééducation,
            <br />
            <span className="text-teal-700">accompagnée à chaque pas.</span>
          </h1>
          <p className="animate-[fadeInUp_0.6s_ease-out_both] [animation-delay:160ms] mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-slate-600 sm:text-xl">
            Des programmes d&apos;exercices sur mesure, une caméra qui corrige vos
            mouvements en temps réel, et votre praticien à vos côtés — où que vous soyez.
          </p>

          <div className="animate-[fadeInUp_0.6s_ease-out_both] [animation-delay:220ms] mx-auto mt-6 flex max-w-2xl flex-col items-center justify-center gap-3 sm:flex-row">
            {TRUST_POINTS.map((t) => (
              <div key={t.label} className="flex items-center justify-center gap-2">
                <t.icon className="h-4 w-4 shrink-0 text-teal-600" strokeWidth={1.75} />
                <span className="text-sm font-medium text-slate-600">{t.label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Clear patient / therapist choice */}
        <section className="animate-[fadeInUp_0.6s_ease-out_both] [animation-delay:280ms] mx-auto mt-10 grid max-w-4xl gap-5 sm:grid-cols-2">
          {/* Patient */}
          <div className="group flex flex-col rounded-3xl border border-teal-100 bg-white p-8 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-teal-700 transition group-hover:scale-105">
              <UserRound className="h-6 w-6" strokeWidth={1.75} />
            </span>
            <h2 className="font-display mt-4 text-2xl font-semibold text-slate-900">
              Je suis patient
            </h2>
            <p className="mt-2 flex-1 text-slate-600">
              Suivez votre programme du jour, filmez vos exercices et laissez-vous
              guider répétition après répétition.
            </p>
            <Link
              href="/login"
              className="mt-6 inline-flex items-center justify-center rounded-xl bg-teal-600 px-5 py-3 font-medium text-white shadow-sm transition hover:bg-teal-700"
            >
              Accéder à mon espace →
            </Link>
          </div>

          {/* Therapist */}
          <div className="group flex flex-col rounded-3xl border border-slate-200 bg-white/80 p-8 shadow-sm backdrop-blur transition hover:-translate-y-1 hover:shadow-lg">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 transition group-hover:scale-105">
              <Stethoscope className="h-6 w-6" strokeWidth={1.75} />
            </span>
            <h2 className="font-display mt-4 text-2xl font-semibold text-slate-900">
              Je suis praticien
            </h2>
            <p className="mt-2 flex-1 text-slate-600">
              Prescrivez des programmes adaptés, suivez l&apos;assiduité et la
              progression de chaque patient depuis un seul tableau de bord.
            </p>
            <div className="mt-6 flex flex-col gap-2">
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Espace praticien →
              </Link>
              <Link
                href="/signup"
                className="text-center text-sm font-medium text-teal-700 hover:underline"
              >
                Nouveau ? Créer un compte
              </Link>
            </div>
          </div>
        </section>

        {/* Questions patients ont en tête — avatars illustrés, pas de vraies photos */}
        <section className="mx-auto mt-20 max-w-4xl">
          <h2 className="font-display text-center text-2xl font-semibold text-slate-900 sm:text-3xl">
            Des questions qu&apos;on se pose tous
          </h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {QUESTIONS.map((q) => (
              <div key={q.question} className="flex flex-col items-center text-center">
                <span
                  className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-white shadow-sm ${q.color}`}
                >
                  <UserRound className="h-7 w-7" strokeWidth={1.75} />
                </span>
                <div className="relative mt-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                  <Quote className="mx-auto h-4 w-4 text-teal-300" strokeWidth={2} />
                  <p className="mt-2 text-sm font-medium leading-relaxed text-slate-700">
                    {q.question}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="mt-24 grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <h2 className="font-display text-center text-3xl font-semibold text-slate-900 sm:text-4xl lg:text-left">
              Comment ça marche
            </h2>
            <div className="relative mx-auto mt-12 max-w-sm space-y-10 lg:mx-0">
              <div
                aria-hidden
                className="absolute bottom-6 left-6 top-6 hidden w-px bg-gradient-to-b from-transparent via-teal-200 to-transparent sm:block"
              />
              {STEPS.map((s, i) => (
                <div key={s.title} className="relative flex gap-4">
                  <span className="font-display relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-teal-200 bg-[#faf7f2] text-lg font-semibold text-teal-700">
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="mt-2.5 font-semibold text-slate-900">{s.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{s.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <SessionMockup />
        </section>

        {/* Trust banner */}
        <section className="mx-auto mt-20 max-w-5xl">
          <div className="rounded-3xl bg-slate-900 px-8 py-7 text-center shadow-lg sm:px-14">
            <p className="text-lg font-medium text-white sm:text-xl">
              Le programme reste entièrement conçu et piloté par votre kinésithérapeute
              <span className="text-teal-300"> — jamais un algorithme seul.</span>
            </p>
          </div>
        </section>

        {/* Conditions covered */}
        <section className="mx-auto mt-20 max-w-5xl">
          <h2 className="font-display text-center text-3xl font-semibold text-slate-900 sm:text-4xl">
            Des programmes pour chaque situation
          </h2>
          <p className="mx-auto mt-2 max-w-md text-center text-sm text-slate-500">
            Cliquez sur une catégorie pour voir des exemples de situations concernées.
          </p>
          <ConditionsShowcase />
        </section>

        {/* Features */}
        <FeaturesShowcase />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/70 py-8">
        <p className="text-center text-sm text-slate-400">© 2026 Physio-App</p>
      </footer>
    </div>
  );
}
