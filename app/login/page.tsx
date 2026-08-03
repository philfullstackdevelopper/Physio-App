import Link from "next/link";
import { Target, Video, TrendingUp } from "lucide-react";
import RandomLine from "@/components/RandomLine";
import { login } from "./actions";

const ENCOURAGEMENTS = [
  "Chaque séance vous rapproche un peu plus de votre objectif.",
  "Un pas de plus vers votre rétablissement, aujourd'hui encore.",
  "La régularité compte plus que la performance.",
  "Votre praticien vous accompagne, séance après séance.",
];

const FEATURES = [
  {
    icon: Target,
    title: "Programmes sur mesure",
    body: "Votre situation et votre étape de récupération façonnent chaque séance.",
  },
  {
    icon: Video,
    title: "Correction par caméra",
    body: "L'IA compte vos répétitions et corrige votre posture en temps réel.",
  },
  {
    icon: TrendingUp,
    title: "Progression partagée",
    body: "Vous et votre praticien suivez vos progrès, séance après séance.",
  },
];

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#faf7f2]">
      {/* Warm ambient background, matching the homepage */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-20"
        style={{
          background:
            "radial-gradient(900px 500px at 10% -5%, #ccfbf1 0%, transparent 55%)," +
            "radial-gradient(800px 500px at 100% 10%, #fde9d9 0%, transparent 50%)",
        }}
      />

      {/* Subtle dot-grid pattern */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-60"
        style={{
          backgroundImage:
            "radial-gradient(rgba(15, 118, 110, 0.14) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
          maskImage:
            "radial-gradient(1100px 700px at 30% 40%, black 0%, transparent 75%)",
          WebkitMaskImage:
            "radial-gradient(1100px 700px at 30% 40%, black 0%, transparent 75%)",
        }}
      />

      <div className="mx-auto flex min-h-screen max-w-6xl flex-col lg:flex-row lg:items-center">
        {/* Left: login form */}
        <div className="flex flex-1 items-center justify-center p-4 py-16 lg:p-16">
          <div className="w-full max-w-sm">
            <Link href="/" className="mb-6 flex items-center justify-center gap-2.5 lg:hidden">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-600 text-lg font-bold text-white shadow-sm">
                P
              </span>
              <span className="text-xl font-semibold text-slate-900">Physio-App</span>
            </Link>

            <div className="rounded-3xl border border-teal-100 bg-white/90 p-8 shadow-sm backdrop-blur">
              <h1 className="font-display text-2xl font-semibold text-slate-900">
                Heureux de vous revoir
              </h1>
              <p className="mb-6 mt-1.5 text-sm leading-relaxed text-slate-500 lg:hidden">
                <RandomLine options={ENCOURAGEMENTS} />
              </p>
              <p className="mb-6 mt-1.5 hidden text-sm leading-relaxed text-slate-500 lg:block">
                Connectez-vous pour accéder à votre espace.
              </p>

              {error && (
                <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
              )}

              <form action={login} className="space-y-4">
                <div>
                  <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">
                    Adresse e-mail
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-900 transition focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-100"
                  />
                </div>
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                      Mot de passe
                    </label>
                    <Link
                      href="/forgot-password"
                      className="text-sm font-medium text-teal-700 hover:underline"
                    >
                      Mot de passe oublié ?
                    </Link>
                  </div>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-900 transition focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-100"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full rounded-xl bg-teal-600 py-2.5 font-medium text-white shadow-sm transition hover:bg-teal-700"
                >
                  Se connecter
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-slate-500">
                Pas encore de compte ?{" "}
                <Link href="/signup" className="font-medium text-teal-700 hover:underline">
                  Créer un compte
                </Link>
              </p>
            </div>
          </div>
        </div>

        {/* Right: brand / encouragement panel (desktop only) */}
        <div className="hidden flex-1 flex-col justify-center px-16 py-16 lg:flex">
          <Link href="/" className="mb-10 flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-600 text-lg font-bold text-white shadow-sm">
              P
            </span>
            <span className="text-xl font-semibold text-slate-900">Physio-App</span>
          </Link>

          <span className="mb-4 inline-flex w-fit items-center rounded-full border border-teal-100 bg-white/70 px-4 py-1.5 text-sm font-medium text-teal-700 shadow-sm backdrop-blur">
            Rééducation guidée, à domicile
          </span>
          <h1 className="font-display max-w-md text-4xl font-semibold leading-[1.1] tracking-tight text-slate-900">
            Reprenez là où vous vous êtes arrêté.
          </h1>
          <p className="mt-4 max-w-sm text-base leading-relaxed text-slate-600">
            <RandomLine options={ENCOURAGEMENTS} />
          </p>

          <div className="mt-12 space-y-5">
            {FEATURES.map((f) => (
              <div key={f.title} className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-100 bg-white/80 text-teal-700 shadow-sm backdrop-blur">
                  <f.icon className="h-5 w-5" strokeWidth={1.75} />
                </span>
                <div>
                  <p className="font-medium text-slate-900">{f.title}</p>
                  <p className="text-sm leading-relaxed text-slate-500">{f.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
