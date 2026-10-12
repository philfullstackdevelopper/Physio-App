import Link from "next/link";
import { LogoLockup } from "@/components/Logo";
import WaitlistForm from "@/components/WaitlistForm";

// Affiché à la place des pages d'inscription tant que SIGNUPS_OPEN est faux
// (lib/launchFlags.ts — Philippe, 2026-10-12) : avant le lancement, on ne crée
// pas de compte, on rejoint la liste d'attente. Les comptes déjà existants
// (celui de Philippe, les comptes de test) se connectent normalement.
export default function SignupClosed() {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center bg-slate-950 px-5 py-16 text-center">
      <Link href="/" className="absolute left-4 top-4 flex items-center gap-2.5 lg:left-8 lg:top-8">
        <LogoLockup height={40} tone="light" />
      </Link>

      <div className="w-full max-w-md">
        <h1 className="font-display text-3xl font-semibold leading-tight text-white sm:text-4xl">
          Les inscriptions ouvriront au lancement.
        </h1>
        <p className="mx-auto mt-4 max-w-sm leading-relaxed text-slate-300">
          EasyPhysio est en phase de test. Laissez votre e-mail&nbsp;: nous vous écrivons dès que vous pouvez créer
          votre compte.
        </p>
        <div className="mt-8">
          <WaitlistForm />
        </div>
        <p className="mt-8 text-sm text-slate-400">
          Vous avez déjà un compte&nbsp;?{" "}
          <Link href="/login" className="font-medium text-white underline-offset-4 hover:underline">
            Se connecter
          </Link>
        </p>
      </div>
    </main>
  );
}
