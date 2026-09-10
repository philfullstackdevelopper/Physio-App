import Link from "next/link";
import { HeartHandshake, ShieldCheck } from "lucide-react";
import { LogoMark } from "@/components/Logo";
import LoginExerciseShowcase from "@/components/LoginExerciseShowcase";
import { acceptTerms } from "@/app/patient/actions";

// Shown in place of every /patient/* page until the patient accepts the CGU —
// see app/patient/layout.tsx. Standalone from health-data consent (asked next,
// in /patient/onboarding): RGPD requires the two to stay separate, and this
// step also doubles as the patient's actual "welcome" moment, since the
// invite email/signup screen (app/invitation) is necessarily terse.
//
// Same split layout as /login, /invitation and /patient/onboarding (Philippe,
// 2026-09-09: this used to be a lone centered card — the exact boxed,
// icon-led "generic AI assistant" look already flagged and dropped on
// /invitation. Bringing it into the shared shell instead of inventing its
// own makes the very first thing a patient sees read as one continuous
// product, not four different screens stitched together.
export default function PatientWelcomeGate({ instructorName }: { instructorName: string | null }) {
  return (
    <main className="relative min-h-screen bg-[#f6f8fd]">
      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col lg:flex-row lg:items-stretch">
        {/* Left: welcome message + CGU */}
        <div className="flex flex-1 items-center justify-center p-4 py-16 lg:p-16">
          <div className="w-full max-w-sm">
            <Link href="/" className="mb-6 flex items-center justify-center gap-2.5 lg:hidden">
              <LogoMark size={32} />
              <span className="font-display text-lg font-semibold text-slate-900">EasyPhysio</span>
            </Link>

            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
              <HeartHandshake className="h-6 w-6" strokeWidth={1.75} />
            </span>

            <h1 className="font-display mt-4 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
              Bienvenue{instructorName ? "" : " !"}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              {instructorName ? (
                <>
                  <span className="font-medium text-slate-700">{instructorName}</span> vous a inscrit·e sur
                  EasyPhysio pour suivre votre programme d&rsquo;exercices.
                </>
              ) : (
                <>Votre kinésithérapeute vous a inscrit·e sur EasyPhysio pour suivre votre programme d&rsquo;exercices.</>
              )}{" "}
              Avant de commencer, il reste une étape.
            </p>

            <form action={acceptTerms} className="mt-8">
              {/* Informational, not an interactive checkbox — "J'accepte et je
                  continue" below is the actual consent action (same pattern
                  as the original), so this shouldn't look clickable on its
                  own. */}
              <div className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 text-sm leading-relaxed text-slate-600">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-blue-700" strokeWidth={1.75} />
                <p>
                  En continuant, vous acceptez les{" "}
                  <Link
                    href="/cgu"
                    target="_blank"
                    className="font-medium text-blue-700 underline underline-offset-2"
                  >
                    conditions générales d&rsquo;utilisation
                  </Link>{" "}
                  d&rsquo;EasyPhysio.
                </p>
              </div>

              <button
                type="submit"
                className="mt-4 w-full rounded-full bg-blue-600 py-2.5 text-sm font-medium text-white shadow-sm transition active:scale-[0.98] hover:bg-blue-700"
              >
                J&rsquo;accepte et je continue
              </button>
            </form>
          </div>
        </div>

        {/* Right: same sticky exercise showcase as /login, /invitation and
            /patient/onboarding. */}
        <div className="hidden flex-1 flex-col px-16 py-10 lg:sticky lg:top-0 lg:flex lg:h-screen">
          <Link href="/" className="flex items-center gap-2.5">
            <LogoMark size={36} />
            <span className="font-display text-xl font-semibold text-slate-900">EasyPhysio</span>
          </Link>
          <div className="mt-8 min-h-0 flex-1">
            <LoginExerciseShowcase />
          </div>
        </div>
      </div>
    </main>
  );
}
