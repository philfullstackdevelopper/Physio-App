import Link from "next/link";
import { ArrowRight, Calendar, Lightbulb, Mail, ShieldCheck, UserRound } from "lucide-react";
import { LogoMark } from "@/components/Logo";
import PatientReferralMessage from "@/components/PatientReferralMessage";

const STEPS = [
  { icon: Mail, title: "Vous envoyez le message", body: "à votre kiné" },
  { icon: UserRound, title: "Votre kiné crée son compte", body: "et vous invite" },
  { icon: Calendar, title: "Vous accédez à votre programme", body: null },
];

export default function SignupPatientPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f6f8fd] px-4 py-16">
      {/* Soft decorative blobs, same quiet marketing-page language as
          DotCanvas elsewhere — Philippe, 2026-09-10, built from a reference
          mock. */}
      <div aria-hidden className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-emerald-100/60 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-blue-100/50 blur-3xl" />

      <div className="relative mx-auto max-w-4xl">
        <Link href="/" className="mb-10 flex items-center justify-center gap-2.5">
          <LogoMark size={36} />
          <span className="font-display text-xl font-semibold text-slate-900">EasyPhysio</span>
        </Link>

        <div className="text-center">
          <h1 className="font-display text-3xl font-semibold leading-tight text-slate-900 sm:text-4xl">
            Votre kiné doit d&apos;abord
            <br />
            vous inviter
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-base leading-relaxed text-slate-600">
            EasyPhysio fonctionne avec votre kinésithérapeute. Pas d&apos;inquiétude, vous pouvez
            simplement lui envoyer un message tout prêt.
          </p>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur">
            <p className="flex items-center gap-2.5 text-lg font-semibold text-slate-900">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                <Lightbulb className="h-4.5 w-4.5" strokeWidth={1.75} />
              </span>
              Comment ça marche ?
            </p>

            <ol className="relative mt-6 space-y-6">
              {STEPS.map((step, i) => (
                <li key={step.title} className="relative flex gap-4">
                  {i < STEPS.length - 1 && (
                    <span aria-hidden className="absolute left-4 top-9 h-full w-px bg-slate-200" />
                  )}
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-semibold text-blue-600">
                    {i + 1}
                  </span>
                  <span>
                    <span className="flex items-center gap-1.5 font-medium text-slate-900">
                      <step.icon className="h-4 w-4 text-slate-400" strokeWidth={1.75} />
                      {step.title}
                    </span>
                    {step.body && <span className="mt-0.5 block text-sm text-slate-500">{step.body}</span>}
                  </span>
                </li>
              ))}
            </ol>

            <div className="mt-6 flex items-start gap-2.5 rounded-xl bg-emerald-50 p-3.5 text-sm text-emerald-800">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} />
              <span>C&apos;est rapide, simple et sécurisé. Vous n&apos;avez rien d&apos;autre à faire !</span>
            </div>
          </div>

          <PatientReferralMessage />
        </div>

        <p className="mt-8 text-center text-sm text-slate-500">
          Déjà invité·e par votre kiné ?{" "}
          <Link href="/login" className="inline-flex items-center gap-1 font-medium text-blue-700 hover:underline">
            Se connecter <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
          </Link>
        </p>
      </div>
    </main>
  );
}
