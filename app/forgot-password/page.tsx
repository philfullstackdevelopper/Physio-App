import Link from "next/link";
import { requestPasswordReset } from "./actions";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; sent?: string }>;
}) {
  const { error, sent } = await searchParams;

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#faf7f2] p-4">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-20"
        style={{
          background:
            "radial-gradient(900px 500px at 10% -5%, #ccfbf1 0%, transparent 55%)," +
            "radial-gradient(800px 500px at 100% 10%, #fde9d9 0%, transparent 50%)",
        }}
      />

      <div className="w-full max-w-sm">
        <Link href="/" className="mb-6 flex items-center justify-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-600 text-lg font-bold text-white shadow-sm">
            P
          </span>
          <span className="text-xl font-semibold text-slate-900">Physio-App</span>
        </Link>

        <div className="rounded-3xl border border-teal-100 bg-white/90 p-8 shadow-sm backdrop-blur">
          <h1 className="font-display text-2xl font-semibold text-slate-900">Mot de passe oublié</h1>

          {sent ? (
            <>
              <p className="mb-6 mt-1.5 text-sm leading-relaxed text-slate-500">
                Si un compte existe avec cette adresse, un e-mail vient de vous être envoyé avec un
                lien pour choisir un nouveau mot de passe.
              </p>
              <Link
                href="/login"
                className="block w-full rounded-xl bg-teal-600 py-2.5 text-center font-medium text-white shadow-sm transition hover:bg-teal-700"
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
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-900 transition focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-100"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full rounded-xl bg-teal-600 py-2.5 font-medium text-white shadow-sm transition hover:bg-teal-700"
                >
                  Envoyer le lien
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-slate-500">
                <Link href="/login" className="font-medium text-teal-700 hover:underline">
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
