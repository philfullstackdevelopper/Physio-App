import Link from "next/link";
import { ArrowRight, CreditCard, Lock, LogOut, UserRound } from "lucide-react";
import { SignOutButton } from "@clerk/nextjs";
import SubmitButton from "@/components/SubmitButton";
import { LogoLockup } from "@/components/Logo";
import { openBillingPortal } from "@/app/billing/actions";
import type { LockReason } from "@/lib/billing/access";

/**
 * Écran cadenas (Philippe, 2026-10-10) : dès qu'un patient qui avait un
 * abonnement n'a plus accès — carte refusée, ou abonnement terminé — l'appli
 * se verrouille sur cet écran, sur téléphone comme sur ordinateur. Un seul
 * geste pour en sortir : voir les offres (ou corriger sa carte).
 *
 * Affiché par /patient/abonnement, où toutes les portes de l'appli renvoient
 * déjà un patient sans accès (app/patient/layout.tsx, lib/patient/home-data.ts,
 * lib/patient/requirePatientAccess.ts) — aucune page ne peut donc y échapper.
 * « Mon compte et mes données » reste ouvert : exporter ou supprimer ses
 * données est un droit (RGPD) qui ne dépend pas de l'abonnement.
 */
export default function PatientLockScreen({
  reason,
  firstName,
  kineName,
}: {
  reason: LockReason;
  firstName: string | null;
  kineName: string | null;
}) {
  const failed = reason === "payment_failed";
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-[#f6f8fd] px-5 py-8">
      <div className="w-full max-w-md text-center">
        <div className="flex justify-center">
          <LogoLockup height={36} />
        </div>

        <div className="mt-8 rounded-3xl bg-white p-7 shadow-[0_10px_40px_-12px_rgba(20,71,201,0.25)] sm:p-9">
          <span
            className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full ${
              failed ? "bg-danger-soft text-danger" : "bg-brand-soft text-brand"
            }`}
          >
            <Lock className="h-9 w-9" strokeWidth={1.75} />
          </span>

          <h1 className="mt-5 text-2xl font-semibold tracking-tight text-slate-900">
            {failed ? "Votre paiement a été refusé" : "Votre abonnement est terminé"}
          </h1>
          <p className="mt-2 text-base leading-relaxed text-slate-600">
            {firstName ? `${firstName}, v` : "V"}otre programme est verrouillé.{" "}
            {failed
              ? "Votre carte n'a pas pu être débitée. Pour continuer, mettez à jour votre moyen de paiement."
              : `Pour continuer votre rééducation${kineName ? ` avec ${kineName}` : ""}, choisissez une offre.`}
          </p>
          <p className="mt-2 text-sm text-slate-500">Vos séances et votre historique sont conservés : vous les retrouvez dès la reprise.</p>

          {failed ? (
            <>
              <form action={openBillingPortal} className="mt-6">
                <input type="hidden" name="intent" value="manage" />
                <SubmitButton
                  pendingText="Ouverture…"
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-brand py-3.5 text-base font-semibold text-white shadow-sm transition hover:bg-brand-dark"
                >
                  <CreditCard className="h-5 w-5" strokeWidth={2} />
                  Mettre à jour ma carte
                </SubmitButton>
              </form>
              <Link href="/patient/abonnement?offres=1" className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline">
                Voir les offres
                <ArrowRight className="h-4 w-4" strokeWidth={2} />
              </Link>
            </>
          ) : (
            <Link
              href="/patient/abonnement?offres=1"
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-brand py-3.5 text-base font-semibold text-white shadow-sm transition hover:bg-brand-dark"
            >
              Voir les offres
              <ArrowRight className="h-5 w-5" strokeWidth={2} />
            </Link>
          )}
        </div>

        <div className="mt-6 flex flex-col items-center justify-center gap-3 text-sm font-medium text-slate-500 sm:flex-row sm:gap-6">
          <Link href="/patient/compte" className="inline-flex items-center gap-1.5 hover:text-slate-800">
            <UserRound className="h-4 w-4" strokeWidth={1.75} />
            Mon compte et mes données
          </Link>
          <SignOutButton redirectUrl="/login">
            <button type="button" className="inline-flex items-center gap-1.5 hover:text-slate-800">
              <LogOut className="h-4 w-4" strokeWidth={1.75} />
              Se déconnecter
            </button>
          </SignOutButton>
        </div>
      </div>
    </main>
  );
}
