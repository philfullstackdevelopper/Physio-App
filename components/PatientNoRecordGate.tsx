import { AlertCircle, LogOut } from "lucide-react";
import { SignOutButton } from "@clerk/nextjs";
import { LogoMark } from "@/components/Logo";
import LoginExerciseShowcase from "@/components/LoginExerciseShowcase";

// Shown in place of every /patient/* page (onboarding included) when this
// authenticated identity has NO row in `patients` at all — see
// app/patient/layout.tsx. Different from PatientWelcomeGate (CGU not yet
// accepted, but a real patients row exists): here there is nothing to attach
// a profile to. patient_profiles.id has a foreign key onto patients.id
// (0004_stage_pii_and_feedback.sql), so letting this identity reach
// /patient/onboarding would fail with a raw Postgres error instead of an
// explanation (Philippe, 2026-09-13: a test account hit exactly this — a
// Clerk account existed but no instructor had ever invited it, so
// resolveAppUserId() minted a brand-new app_users row with no matching
// patients row to go with it).
export default function PatientNoRecordGate() {
  return (
    <main className="relative min-h-screen bg-[#f6f8fd]">
      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col lg:flex-row lg:items-stretch">
        <div className="flex flex-1 items-center justify-center p-4 py-16 lg:p-16">
          <div className="w-full max-w-sm">
            <div className="mb-6 flex items-center justify-center gap-2.5 lg:hidden">
              <LogoMark size={32} />
              <span className="font-display text-lg font-semibold text-slate-900">EasyPhysio</span>
            </div>

            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
              <AlertCircle className="h-6 w-6" strokeWidth={1.75} />
            </span>

            <h1 className="font-display mt-4 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
              Compte non associé à un kinésithérapeute
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              Nous ne retrouvons aucun profil patient lié à ce compte. EasyPhysio est réservé aux
              patients invités par leur kinésithérapeute : si vous pensez avoir reçu une invitation,
              vérifiez que vous êtes connecté·e avec la même adresse e-mail, ou contactez directement
              votre praticien pour qu&rsquo;il vérifie votre inscription.
            </p>

            <SignOutButton redirectUrl="/login">
              <button
                type="button"
                className="mt-8 inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-slate-200 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
              >
                <LogOut className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                Se déconnecter
              </button>
            </SignOutButton>
          </div>
        </div>

        <div className="hidden flex-1 flex-col px-16 py-10 lg:sticky lg:top-0 lg:flex lg:h-screen">
          <div className="flex items-center gap-2.5">
            <LogoMark size={36} />
            <span className="font-display text-xl font-semibold text-slate-900">EasyPhysio</span>
          </div>
          <div className="mt-8 min-h-0 flex-1">
            <LoginExerciseShowcase />
          </div>
        </div>
      </div>
    </main>
  );
}
