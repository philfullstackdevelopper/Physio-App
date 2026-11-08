import Link from "next/link";
import { LogoLockup } from "@/components/Logo";
import WaitlistForm from "@/components/WaitlistForm";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useTranslations } from "next-intl";

// Affiché à la place des pages d'inscription tant que SIGNUPS_OPEN est faux
// (lib/launchFlags.ts — Philippe, 2026-10-12) : avant le lancement, on ne crée
// pas de compte, on rejoint la liste d'attente. Les comptes déjà existants
// (celui de Philippe, les comptes de test) se connectent normalement.
export default function SignupClosed() {
  const t = useTranslations("auth.signupClosed");
  const tShared = useTranslations("auth.shared");
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center bg-slate-950 px-5 py-16 text-center">
      <Link href="/" className="absolute left-4 top-4 flex items-center gap-2.5 lg:left-8 lg:top-8">
        <LogoLockup height={40} tone="light" />
      </Link>
      {/* Choix de la langue, en face du logo. */}
      <div className="absolute right-4 top-6 lg:right-8 lg:top-10">
        <LanguageSwitcher tone="light" />
      </div>

      <div className="w-full max-w-md">
        <h1 className="font-display text-3xl font-semibold leading-tight text-white sm:text-4xl">
          {t("title")}
        </h1>
        <p className="mx-auto mt-4 max-w-sm leading-relaxed text-slate-300">
          {t("body")}
        </p>
        <div className="mt-8">
          <WaitlistForm />
        </div>
        <p className="mt-8 text-sm text-slate-400">
          {t("haveAccount")}{" "}
          <Link href="/login" className="font-medium text-white underline-offset-4 hover:underline">
            {tShared("signIn")}
          </Link>
        </p>
      </div>
    </main>
  );
}
