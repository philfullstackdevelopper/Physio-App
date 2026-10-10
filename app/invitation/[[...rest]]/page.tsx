import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SignIn, SignUp } from "@clerk/nextjs";
import { brandedHeaderTitle } from "@/lib/clerk/brandedTitle";
import { compactClerkElements } from "@/lib/clerk/compact";
import { auth, currentUser } from "@clerk/nextjs/server";
import InvitationSignedInGate from "@/components/InvitationSignedInGate";
import LoginExerciseShowcase from "@/components/LoginExerciseShowcase";

// Same split layout as /login and /signup (left: Clerk widget, right: sticky
// exercise showcase) — Philippe, 2026-09-09: a lone centered card here read as
// a different, lesser page than the rest of the auth flow. The welcome line
// used to sit in a bordered/icon "callout" box above the form; dropped in
// favor of plain heading copy in the right panel (same treatment /signup uses
// for its own headline) — a boxed, icon-led notice for a one-line greeting is
// exactly the generic-AI-assistant look he flagged, not a deliberate choice.
export default async function PatientInvitationPage({
  searchParams,
}: {
  searchParams: Promise<{ kine?: string; __clerk_status?: string; __clerk_ticket?: string }>;
}) {
  const params = await searchParams;
  // Le nom du kiné vient de l'adresse du lien, que n'importe qui peut écrire
  // (audit du 2026-10-08) : on ne l'affiche que s'il ressemble à un nom —
  // lettres, espaces, tirets, apostrophes, 60 caractères au plus, aucun
  // chiffre (pas de numéro de téléphone ni d'adresse glissés dans le texte).
  const rawKine = (params.kine ?? "").trim();
  const kine = /^[\p{L}][\p{L} .'’-]{0,59}$/u.test(rawKine) ? rawKine : undefined;

  // Déjà une session ouverte dans ce navigateur : ne PAS laisser le widget
  // consommer le ticket par-dessus (deux sessions -> boucle de
  // rafraîchissement, voir InvitationSignedInGate). On propose de continuer
  // ou de se déconnecter puis de revenir sur ce même lien.
  const { userId } = await auth();
  const signedInEmail = userId
    ? ((await currentUser())?.primaryEmailAddress?.emailAddress ?? null)
    : null;
  const invitationUrl = `/invitation?${new URLSearchParams(
    Object.entries(params).filter((e): e is [string, string] => typeof e[1] === "string"),
  ).toString()}`;

  // __clerk_status=sign_in : Clerk signale que le compte de cette invitation
  // EXISTE déjà (lien du mail recliqué après avoir créé son mot de passe).
  // Il faut alors le formulaire de connexion, pas celui d'inscription.
  const accountExists = params.__clerk_status === "sign_in";

  return (
    <main className="relative min-h-dvh bg-[#f6f8fd]">
      <div className="absolute left-4 top-4 z-10 flex items-center gap-4 lg:left-6 lg:top-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/70 px-3 py-1.5 text-sm font-medium text-slate-600 shadow-sm backdrop-blur transition-colors hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
          Retour
        </Link>
      </div>

      <div className="relative mx-auto flex min-h-dvh max-w-6xl flex-col lg:flex-row lg:items-stretch">
        {/* Left: invitation acceptance form */}
        <div className="flex flex-1 items-center justify-center p-4 py-16 short:pb-1 short:pt-14 lg:p-16 short:lg:py-3">
          <div className="w-full max-w-sm">
            <p className="mb-6 text-center text-sm leading-relaxed text-slate-500 short:mb-2 lg:hidden">
              {kine ? <span className="font-medium text-slate-700">{kine}</span> : "Votre kinésithérapeute"} vous
              invite à rejoindre EasyPhysio.{" "}
              {accountExists
                ? "Votre compte existe déjà : connectez-vous pour continuer."
                : "Choisissez votre mot de passe pour activer votre accès."}
            </p>

            {/* Ticket-based invitation: Clerk reads __clerk_ticket from the URL
                (appended to the invitation's redirectTo) and completes the
                invited identity instead of offering a normal open sign-up. */}
            {userId ? (
              <InvitationSignedInGate email={signedInEmail} invitationUrl={invitationUrl} />
            ) : accountExists ? (
              <SignIn
                fallbackRedirectUrl="/apres-connexion"
                signUpUrl="/invitation"
                appearance={{
                  elements: {
                    ...compactClerkElements,
                    rootBox: "w-full",
                    cardBox: "w-full",
                    // Même réglage que /login : masque « pour continuer vers
                    // My Application » (nom d'appli Clerk par défaut, en anglais).
                    headerTitle: brandedHeaderTitle,
                    headerSubtitle: "hidden",
                  },
                }}
              />
            ) : (
              <SignUp
                fallbackRedirectUrl="/apres-connexion"
                signInUrl="/login"
                appearance={{
                  elements: { ...compactClerkElements, rootBox: "w-full", cardBox: "w-full", headerTitle: brandedHeaderTitle },
                }}
              />
            )}
          </div>
        </div>

        {/* Right: same sticky exercise showcase as /login, with the welcome
            message as the panel's headline instead of a boxed callout. */}
        <div className="hidden flex-1 flex-col px-16 py-6 lg:sticky lg:top-0 lg:flex lg:h-dvh">
          <h1 className="font-display max-w-sm text-3xl font-semibold leading-[1.15] tracking-tight text-slate-900">
            {kine ? (
              <>
                <span className="text-blue-700">{kine}</span> vous invite à rejoindre EasyPhysio
              </>
            ) : (
              "Votre kinésithérapeute vous invite à rejoindre EasyPhysio"
            )}
          </h1>
          <p className="mt-3 max-w-sm text-base leading-relaxed text-slate-600">
            {accountExists
              ? "Votre compte existe déjà : connectez-vous pour retrouver votre programme d’exercices personnalisé."
              : "Choisissez votre mot de passe pour accéder à votre programme d’exercices personnalisé."}
          </p>
          <div className="mt-8 min-h-0 flex-1">
            <LoginExerciseShowcase />
          </div>
        </div>
      </div>
    </main>
  );
}
