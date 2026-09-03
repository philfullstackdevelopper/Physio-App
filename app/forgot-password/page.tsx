import Link from "next/link";
import { requestPasswordReset } from "./actions";
import DotCanvas from "@/components/DotCanvas";
import { LogoMark } from "@/components/Logo";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; sent?: string }>;
}) {
  const { error, sent } = await searchParams;

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f6f8fd] p-4">
      <DotCanvas />

      <div className="relative w-full max-w-sm">
        <Link href="/" className="mb-6 flex items-center justify-center gap-2.5">
          <LogoMark size={36} />
          <span className="font-display text-xl font-semibold text-slate-900">EasyPhysio</span>
        </Link>

        <div className="rounded-3xl border border-blue-100 bg-white/90 p-8 shadow-sm backdrop-blur">
          <h1 className="font-display text-2xl font-semibold text-slate-900">Mot de passe oublié</h1>

          {sent ? (
            <>
              <p className="mb-6 mt-1.5 text-sm leading-relaxed text-slate-500">
                Si un compte existe avec cette adresse, un e-mail vient de vous être envoyé avec un
                lien pour choisir un nouveau mot de passe.
              </p>
              <Link
                href="/login"
                className="block w-full rounded-xl bg-blue-600 py-2.5 text-center font-medium text-white shadow-sm transition hover:bg-blue-700"
              >
                Retour à la connexion
              </Link>
            </>
          ) : (
            <>
              <p className="mb-6 mt-1.5 text-sm leading-relaxed text-slate-500">
                Indiquez votre e-mail, nous vous enverrons un lien pour réinitialiser votre mot de
                passe.
              </p>

              {error && (
                <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
              )}

              <form action={requestPasswordReset} className="space-y-4">
                <div>
                  <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">
                    Adresse e-mail
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-900 transition focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full rounded-xl bg-blue-600 py-2.5 font-medium text-white shadow-sm transition hover:bg-blue-700"
                >
                  Envoyer le lien
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-slate-500">
                <Link href="/login" className="font-medium text-blue-700 hover:underline">
                  ← Retour à la connexion
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
