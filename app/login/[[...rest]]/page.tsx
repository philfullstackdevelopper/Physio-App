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
  // Doit tenir sur un seul écran, sans scroll, y compris sur le PC de Philippe
  // (zoom 150 % → ~1262×549) : padding vertical réduit, pas de doublon du lien
  // d'inscription (Clerk l'affiche déjà en pied de carte), sous-titre Clerk
  // masqué. min-h-dvh (et non h-dvh + overflow-hidden) : sur un écran vraiment
  // trop petit, la page défile au lieu d'être coupée.
  return (
    <main className="relative min-h-dvh bg-[#f6f8fd]">
      <Link
        href="/"
        className="absolute left-4 top-4 z-10 inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/70 px-3 py-1.5 text-sm font-medium text-slate-600 shadow-sm backdrop-blur transition-colors hover:text-slate-900 lg:left-6 lg:top-6"
      >
        <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
        Retour
      </Link>

      <div className="relative mx-auto flex min-h-dvh max-w-6xl flex-col lg:flex-row lg:items-stretch">
        {/* Left: login form */}
        <div className="flex flex-1 items-center justify-center px-4 pb-6 pt-16 lg:px-16 lg:py-4">
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
                elements: {
                  rootBox: "w-full",
                  cardBox: "w-full",
                  // « pour continuer vers My Application » : nom d'appli Clerk
                  // par défaut, en anglais, et une ligne de hauteur en moins.
                  headerSubtitle: "hidden",
                  // Espacements Clerk resserrés (32px partout par défaut) pour
                  // que la carte, champ mot de passe compris, tienne en 549px.
                  card: { paddingTop: "1.5rem", paddingBottom: "1.5rem", gap: "1.25rem" },
                  main: { gap: "1rem" },
                  form: { gap: "1.25rem" },
                },
              }}
            />
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
