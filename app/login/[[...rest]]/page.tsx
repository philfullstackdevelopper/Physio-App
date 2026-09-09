import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SignIn } from "@clerk/nextjs";
import RandomLine from "@/components/RandomLine";
import { LogoMark } from "@/components/Logo";
import LoginExerciseShowcase from "@/components/LoginExerciseShowcase";

const ENCOURAGEMENTS = [
  "Chaque séance vous rapproche un peu plus de votre objectif.",
  "Un pas de plus vers votre rétablissement, aujourd'hui encore.",
  "La régularité compte plus que la performance.",
  "Votre praticien vous accompagne, séance après séance.",
];

export default function LoginPage() {
  return (
    <main className="relative min-h-screen bg-[#f6f8fd]">
      <Link
        href="/"
        className="absolute left-4 top-4 z-10 inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/70 px-3 py-1.5 text-sm font-medium text-slate-600 shadow-sm backdrop-blur transition-colors hover:text-slate-900 lg:left-6 lg:top-6"
      >
        <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
        Retour
      </Link>

      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col lg:flex-row lg:items-stretch">
        {/* Left: login form */}
        <div className="flex flex-1 items-center justify-center p-4 py-16 lg:p-16">
          <div className="w-full max-w-sm">
            <Link href="/" className="mb-6 flex items-center justify-center gap-2.5 lg:hidden">
              <LogoMark size={36} />
              <span className="font-display text-xl font-semibold text-slate-900">EasyPhysio</span>
            </Link>

            {/* Clerk sign-in component (localized in French via ClerkProvider).
                Handles e-mail + password, "mot de passe oublié", and error
                messages natively — no custom form code needed anymore. */}
            <SignIn
              fallbackRedirectUrl="/apres-connexion"
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

        {/* Right: vertical reel of real exercise demonstrations (desktop only) */}
        <div className="hidden flex-1 flex-col px-16 py-10 lg:sticky lg:top-0 lg:flex lg:h-screen">
          <Link href="/" className="flex items-center gap-2.5">
            <LogoMark size={36} />
            <span className="font-display text-xl font-semibold text-slate-900">EasyPhysio</span>
          </Link>
          <p className="mt-4 mb-6 max-w-sm text-base leading-relaxed text-slate-600">
            <RandomLine options={ENCOURAGEMENTS} />
          </p>
          <div className="min-h-0 flex-1">
            <LoginExerciseShowcase />
          </div>
        </div>
      </div>
    </main>
  );
}
