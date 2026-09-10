import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import RandomLine from "@/components/RandomLine";
import { LogoMark } from "@/components/Logo";
import DotCanvas from "@/components/DotCanvas";
import KineSignupFlow from "@/components/KineSignupFlow";
import LoginExerciseShowcase from "@/components/LoginExerciseShowcase";

const ENCOURAGEMENTS = [
  "Créez votre espace en quelques minutes et prescrivez dès aujourd'hui.",
  "Rejoignez les praticiens qui suivent leurs patients à distance, simplement.",
  "Un programme prêt à l'emploi vous attend dès la création du compte.",
  "Votre cabinet, prolongé jusque chez vos patients.",
];

export default function SignupPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f6f8fd]">
      <DotCanvas />

      <Link
        href="/signup"
        className="absolute left-4 top-4 z-10 inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/70 px-3 py-1.5 text-sm font-medium text-slate-600 shadow-sm backdrop-blur transition-colors hover:text-slate-900 lg:left-6 lg:top-6"
      >
        <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
        Retour
      </Link>

      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col lg:flex-row lg:items-center">
        {/* Left: signup form */}
        <div className="flex flex-1 items-center justify-center p-4 py-16 lg:p-16">
          <div className="w-full max-w-sm">
            <Link href="/" className="mb-6 flex items-center justify-center gap-2.5 lg:hidden">
              <LogoMark size={36} />
              <span className="font-display text-xl font-semibold text-slate-900">EasyPhysio</span>
            </Link>

            {/* Cabinet details first, Clerk account creation last — the
                order a professional signup on a real B2B site follows
                (Philippe, 2026-09-10): a visitor sees they're on the kiné
                page, with kiné-specific fields (cabinet, RPPS...) right
                away, instead of Clerk's generic "Créez votre compte" card.
                See components/KineSignupFlow.tsx for how the cabinet fields
                survive into the account that gets created after them. */}
            <KineSignupFlow />

            <p className="mt-6 text-center text-sm text-slate-500">
              Déjà un compte ?{" "}
              <Link href="/login" className="font-medium text-blue-700 hover:underline">
                Se connecter
              </Link>
            </p>
          </div>
        </div>

        {/* Right: same vertical exercise reel as the login/patient-onboarding
            pages (components/LoginExerciseShowcase.tsx) — Philippe,
            2026-09-10: keep the moving exercise filmstrip here too, instead
            of a static feature list. */}
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
