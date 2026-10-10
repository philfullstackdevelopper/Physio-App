import type { ComponentProps } from "react";
import Link from "next/link";
import { AlertCircle, LogOut, X } from "lucide-react";
import { SignOutButton } from "@clerk/nextjs";
import LoginExerciseShowcase from "@/components/LoginExerciseShowcase";
import OnboardingWizard from "@/components/OnboardingWizard";

// Affichage seul de l'onboarding patient (les données viennent de page.tsx) —
// séparé pour pouvoir le prévisualiser avec des données fictives sans
// connexion (/prototypes/patient-ecrans?ecran=onboarding), audit des formats
// d'écran du 2026-10-10.
export default function OnboardingView({
  error,
  needsConsent,
  wizard,
}: {
  error?: string;
  needsConsent: boolean;
  wizard: ComponentProps<typeof OnboardingWizard>;
}) {
  return (
    // h-dvh (hauteur VISIBLE) et non h-screen (2026-10-10) : sur téléphone,
    // « 100vh » compte aussi la zone cachée derrière les barres du navigateur
    // — dans le navigateur intégré d'une appli de mail, ces barres ne se
    // replient pas, et le bas de la carte (bouton « Suivant ») restait hors
    // d'atteinte. h-screen reste le repli des navigateurs sans dvh.
    <main className="relative h-screen overflow-hidden bg-[#f6f8fd] supports-[height:100dvh]:h-dvh">
      {/* Bottom-left, always reachable: the onboarding gate in
          app/patient/layout.tsx has no nav to escape from otherwise, and a
          patient who wants out (wrong account, second thoughts) needs a way
          that isn't "close the tab" (Philippe, 2026-09-09). */}
      <SignOutButton redirectUrl="/login">
        <button
          type="button"
          className="absolute bottom-4 left-4 z-10 inline-flex items-center gap-1.5 text-sm font-medium text-slate-400 transition-colors hover:text-slate-600 lg:bottom-6 lg:left-6"
        >
          <LogOut className="h-4 w-4 shrink-0" strokeWidth={1.75} />
          Se déconnecter
        </button>
      </SignOutButton>

      {/* Modification d'un profil existant (depuis « Modifier ma situation ») :
          une porte de sortie sans enregistrer, retour au compte. Le premier
          onboarding (pas encore de consentement) reste inchangé — il n'y a
          nulle part où revenir (Philippe, 2026-10-07). */}
      {!needsConsent && (
        <Link
          href="/patient/compte"
          className="absolute right-4 top-4 z-10 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 max-sm:right-3 max-sm:top-1 transition-colors hover:text-slate-700 lg:right-6 lg:top-6"
        >
          <X className="h-4 w-4 shrink-0" strokeWidth={1.75} />
          Annuler
        </Link>
      )}

      <div className="relative mx-auto flex h-full max-w-6xl flex-col overflow-y-auto lg:flex-row lg:items-stretch lg:overflow-hidden">
        {/* Left: the wizard itself */}
        {/* Avant : carte plus haute que l'écran coupée sans pouvoir défiler —
            bouton « Suivant » compris, ce qui bloquait l'onboarding (Philippe,
            2026-10-01). Maintenant la colonne a une hauteur bornée, la carte
            est calée en haut (pas centrée : sinon la barre des 4 étapes bougeait
            d'une étape à l'autre, la carte n'ayant pas la même hauteur) et
            seuls ses champs défilent. */}
        <div className="flex min-h-0 flex-1 flex-col p-4 py-6 sm:p-6 lg:py-[8vh] short:py-3">
          {/* max-w-lg -> max-w-xl -> max-w-2xl (Philippe, 2026-09-09: onboarding
              must fit without scrolling, then flagged as too much empty
              gutter around a small card once it did) — the extra width lets
              the 9 body-part illustrations lay out in 2 rows instead of 3,
              see OnboardingWizard.tsx's grid, and fills more of the left
              half instead of floating in it. Still well inside the lg: split
              layout's left half. */}
          {/* max-h-full + flex-col : la carte ne dépasse jamais l'écran, c'est
              sa zone de champs qui défile (OnboardingWizard). */}
          <div className="mx-auto flex max-h-full min-h-0 w-full max-w-2xl flex-col">
            <div className="text-center">
              <h1 className="font-display text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl short:text-xl">
                <span className="text-blue-700">EasyPhysio ·</span>{" "}Votre situation
              </h1>
            </div>

            {error && (
              <p className="mt-6 flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 p-3.5 text-sm text-red-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} />
                {error}
              </p>
            )}

            <div className="mt-4 flex min-h-0 flex-col short:mt-2">
              <OnboardingWizard {...wizard} />
            </div>
          </div>
        </div>

        {/* Right: same sticky exercise showcase as /login and /invitation —
            gives the "why" while the wizard gives the "how long" (Philippe,
            2026-09-09). */}
        <div className="hidden flex-1 flex-col px-16 py-6 lg:sticky lg:top-0 lg:flex lg:h-screen">
          <div className="min-h-0 flex-1">
            <LoginExerciseShowcase />
          </div>
        </div>
      </div>
    </main>
  );
}
