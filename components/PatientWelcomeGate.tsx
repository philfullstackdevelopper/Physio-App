"use client";

import { useActionState, useEffect } from "react";
import Link from "next/link";
import { SignOutButton } from "@clerk/nextjs";
import { AlertCircle, HeartHandshake, LogOut, ShieldCheck } from "lucide-react";
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
//
// Composant client depuis le 2026-10-07 (Philippe) : l’échec de
// l’acceptation s’affiche ici (useActionState) au lieu d’être perdu dans un
// ?error= que rien ne lisait, et « Se déconnecter » est offert comme sur les
// autres barrières (onboarding, PatientNoRecordGate).
export default function PatientWelcomeGate({ instructorName }: { instructorName: string | null }) {
  const [state, formAction, pending] = useActionState(acceptTerms, { error: null } as {
    error: string | null;
    accepted?: boolean;
  });
  // CGU acceptées : vrai chargement de page (pas une navigation interne, qui
  // laissait un écran blanc — voir app/patient/actions.ts). La mise en page
  // patient envoie ensuite d'elle-même vers le questionnaire.
  const accepted = state.accepted === true;
  useEffect(() => {
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- chargement complet VOULU : la navigation interne laissait un écran blanc.
    if (accepted) window.location.assign("/patient");
  }, [accepted]);
  return (
    <main className="relative min-h-screen bg-[#f6f8fd]">
      <SignOutButton redirectUrl="/login">
        <button
          type="button"
          className="absolute bottom-4 left-4 z-10 inline-flex items-center gap-1.5 text-sm font-medium text-slate-400 transition-colors hover:text-slate-600 lg:bottom-6 lg:left-6"
        >
          <LogOut className="h-4 w-4 shrink-0" strokeWidth={1.75} />
          Se déconnecter
        </button>
      </SignOutButton>

      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col lg:flex-row lg:items-stretch">
        {/* Left: welcome message + CGU */}
        <div className="flex flex-1 items-center justify-center p-4 py-16 lg:p-16">
          <div className="w-full max-w-sm">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
              <HeartHandshake className="h-6 w-6" strokeWidth={1.75} />
            </span>

            <h1 className="font-display mt-4 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
              <span className="text-blue-700">EasyPhysio ·</span>{" "}Bienvenue{instructorName ? "" : " !"}
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

            <form action={formAction} className="mt-8">
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

              {state.error && (
                <p role="alert" className="mt-4 flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 p-3.5 text-sm text-red-700">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} />
                  {state.error}
                </p>
              )}

              <button
                type="submit"
                disabled={pending || accepted}
                className="mt-4 w-full rounded-full bg-blue-600 py-2.5 text-sm font-medium text-white shadow-sm transition active:scale-[0.98] hover:bg-blue-700 disabled:opacity-60"
              >
                {pending || accepted ? "Enregistrement…" : <>J&rsquo;accepte et je continue</>}
              </button>
            </form>
          </div>
        </div>

        {/* Right: same sticky exercise showcase as /login, /invitation and
            /patient/onboarding. */}
        <div className="hidden flex-1 flex-col px-16 py-6 lg:sticky lg:top-0 lg:flex lg:h-screen">
          <div className="min-h-0 flex-1">
            <LoginExerciseShowcase />
          </div>
        </div>
      </div>
    </main>
  );
}
