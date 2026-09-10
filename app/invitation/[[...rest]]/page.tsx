import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SignUp } from "@clerk/nextjs";
import { LogoMark } from "@/components/Logo";
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
  searchParams: Promise<{ kine?: string }>;
}) {
  const { kine } = await searchParams;

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
        {/* Left: invitation acceptance form */}
        <div className="flex flex-1 items-center justify-center p-4 py-16 lg:p-16">
          <div className="w-full max-w-sm">
            <Link href="/" className="mb-6 flex items-center justify-center gap-2.5 lg:hidden">
              <LogoMark size={36} />
              <span className="font-display text-xl font-semibold text-slate-900">EasyPhysio</span>
            </Link>

            <p className="mb-6 text-center text-sm leading-relaxed text-slate-500 lg:hidden">
              {kine ? <span className="font-medium text-slate-700">{kine}</span> : "Votre kinésithérapeute"} vous
              invite à rejoindre EasyPhysio. Choisissez votre mot de passe pour activer votre accès.
            </p>

            {/* Ticket-based invitation: Clerk reads __clerk_ticket from the URL
                (appended to the invitation's redirectTo) and completes the
                invited identity instead of offering a normal open sign-up. */}
            <SignUp
              fallbackRedirectUrl="/apres-connexion"
              signInUrl="/login"
              appearance={{
                elements: { rootBox: "w-full", cardBox: "w-full" },
              }}
            />
          </div>
        </div>

        {/* Right: same sticky exercise showcase as /login, with the welcome
            message as the panel's headline instead of a boxed callout. */}
        <div className="hidden flex-1 flex-col px-16 py-10 lg:sticky lg:top-0 lg:flex lg:h-screen">
          <Link href="/" className="flex items-center gap-2.5">
            <LogoMark size={36} />
            <span className="font-display text-xl font-semibold text-slate-900">EasyPhysio</span>
          </Link>
          <h1 className="font-display mt-6 max-w-sm text-3xl font-semibold leading-[1.15] tracking-tight text-slate-900">
            {kine ? (
              <>
                <span className="text-blue-700">{kine}</span> vous invite à rejoindre EasyPhysio
              </>
            ) : (
              "Votre kinésithérapeute vous invite à rejoindre EasyPhysio"
            )}
          </h1>
          <p className="mt-3 max-w-sm text-base leading-relaxed text-slate-600">
            Choisissez votre mot de passe pour accéder à votre programme d&rsquo;exercices personnalisé.
          </p>
          <div className="mt-8 min-h-0 flex-1">
            <LoginExerciseShowcase />
          </div>
        </div>
      </div>
    </main>
  );
}
