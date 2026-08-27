import Link from "next/link";
import { Target, ClipboardList, TrendingUp } from "lucide-react";
import { SignIn } from "@clerk/nextjs";
import RandomLine from "@/components/RandomLine";
import { LogoMark } from "@/components/Logo";
import DotCanvas from "@/components/DotCanvas";

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
    icon: ClipboardList,
    title: "Séances guidées pas à pas",
    body: "Une démonstration vidéo et des consignes claires pour chaque exercice, un à la fois.",
  },
  {
    icon: TrendingUp,
    title: "Progression partagée",
    body: "Vous et votre praticien suivez vos progrès, séance après séance.",
  },
];

export default function LoginPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f6f8fd]">
      <DotCanvas />

      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col lg:flex-row lg:items-center">
        {/* Left: login form */}
        <div className="flex flex-1 items-center justify-center p-4 py-16 lg:p-16">
          <div className="w-full max-w-sm">
            <Link href="/" className="mb-6 flex items-center justify-center gap-2.5 lg:hidden">
              <LogoMark size={36} />
              <span className="font-display text-xl font-semibold text-slate-900">Physio-App</span>
            </Link>

            {/* Clerk sign-in component (localized in French via ClerkProvider).
                Handles e-mail + password, "mot de passe oublié", and error
                messages natively — no custom form code needed anymore. */}
            <SignIn
              fallbackRedirectUrl="/dashboard"
              signUpUrl="/signup"
              appearance={{
                elements: { rootBox: "w-full", cardBox: "w-full" },
              }}
            />

            <p className="mt-6 text-center text-sm text-slate-500">
              Pas encore de compte ?{" "}
              <Link href="/signup" className="font-medium text-blue-700 hover:underline">
                Créer un compte
              </Link>
            </p>
          </div>
        </div>

        {/* Right: brand / encouragement panel (desktop only) */}
        <div className="hidden flex-1 flex-col justify-center px-16 py-16 lg:flex">
          <Link href="/" className="mb-10 flex items-center gap-2.5">
            <LogoMark size={36} />
            <span className="font-display text-xl font-semibold text-slate-900">Physio-App</span>
          </Link>

          <span className="mb-4 inline-flex w-fit items-center rounded-full border border-blue-100 bg-white/70 px-4 py-1.5 text-sm font-medium text-blue-700 shadow-sm backdrop-blur">
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
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-100 bg-white/80 text-blue-700 shadow-sm backdrop-blur">
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
