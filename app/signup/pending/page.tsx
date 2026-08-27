import Link from "next/link";
import { MailCheck } from "lucide-react";
import DotCanvas from "@/components/DotCanvas";

export default function SignupPendingPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f6f8fd] p-4">
      <DotCanvas />

      <div className="relative w-full max-w-sm rounded-3xl border border-blue-100 bg-white/90 p-8 text-center shadow-sm backdrop-blur">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
          <MailCheck className="h-7 w-7" strokeWidth={1.75} />
        </span>
        <h1 className="font-display mt-4 text-2xl font-semibold text-slate-900">
          Demande envoyée
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Nous vérifions chaque nouveau compte praticien avant de l&apos;activer. Vous pourrez
          vous connecter dès que votre compte sera validé.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-block w-full rounded-xl border border-slate-300 py-2.5 font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Retour à la connexion
        </Link>
      </div>
    </main>
  );
}
