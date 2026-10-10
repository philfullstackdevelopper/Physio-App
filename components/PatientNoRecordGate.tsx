import { AlertCircle, LogOut, Trash2 } from "lucide-react";
import { SignOutButton } from "@clerk/nextjs";
import LoginExerciseShowcase from "@/components/LoginExerciseShowcase";
import SubmitButton from "@/components/SubmitButton";
import { deleteOrphanIdentity } from "@/app/patient/compte/actions";

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
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
              <AlertCircle className="h-6 w-6" strokeWidth={1.75} />
            </span>

            <h1 className="font-display mt-4 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
              <span className="text-blue-700">EasyPhysio ·</span>{" "}Compte non associé à un kinésithérapeute
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              Nous ne retrouvons aucun profil patient lié à ce compte. EasyPhysio est réservé aux
              patients invités par leur kinésithérapeute : si vous pensez avoir reçu une invitation,
              vérifiez que vous êtes connecté·e avec la même adresse e-mail, ou contactez directement
              votre praticien pour qu&rsquo;il vérifie votre inscription.
            </p>

            {/* Compte supprimé (par le patient ou par son kiné) dont l'identifiant
                de connexion est resté : le supprimer libère l'adresse e-mail,
                pour pouvoir être invité·e par un autre kinésithérapeute
                (Philippe, 2026-10-10). N'agit que sur l'identifiant connecté. */}
            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-sm font-medium text-slate-900">Votre ancien compte a été supprimé ?</p>
              <p className="mt-1 text-sm leading-relaxed text-slate-500">
                Supprimez cet identifiant de connexion pour libérer votre adresse e-mail : un kinésithérapeute
                pourra alors vous inviter à nouveau.
              </p>
              <form action={deleteOrphanIdentity} className="mt-3">
                <SubmitButton
                  pendingText="Suppression…"
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-slate-900 py-2.5 text-sm font-medium text-white transition hover:bg-slate-700"
                >
                  <Trash2 className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                  Supprimer cet identifiant
                </SubmitButton>
              </form>
            </div>

            <SignOutButton redirectUrl="/login">
              <button
                type="button"
                className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-slate-200 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
              >
                <LogOut className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                Se déconnecter
              </button>
            </SignOutButton>
          </div>
        </div>

        <div className="hidden flex-1 flex-col px-16 py-6 lg:sticky lg:top-0 lg:flex lg:h-screen">
          <div className="min-h-0 flex-1">
            <LoginExerciseShowcase />
          </div>
        </div>
      </div>
    </main>
  );
}
