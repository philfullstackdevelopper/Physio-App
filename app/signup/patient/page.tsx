import Link from "next/link";
import { ArrowRight, Calendar, Lightbulb, Mail, ShieldCheck, UserRound } from "lucide-react";
import PatientReferralMessage from "@/components/PatientReferralMessage";

const STEPS = [
  { icon: Mail, title: "Vous envoyez le message", body: "à votre kiné" },
  { icon: UserRound, title: "Votre kiné crée son compte", body: "et vous invite" },
  { icon: Calendar, title: "Vous accédez à votre programme", body: null },
];

export default function SignupPatientPage() {
  return (
    // Une page = un écran (audit 2026-10-10) : sur téléphone, seul le message
    // prêt à envoyer reste (les 3 étapes sont déjà résumées par la phrase du
    // haut) ; sur écran peu haut, titres et marges se resserrent.
    <main className="relative flex min-h-dvh flex-col justify-center overflow-hidden bg-[#f6f8fd] px-4 py-16 max-sm:py-5 short:py-4">
      {/* Soft decorative blobs, same quiet marketing-page language as
          DotCanvas elsewhere — Philippe, 2026-09-10, built from a reference
          mock. */}
      <div aria-hidden className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-emerald-100/60 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-blue-100/50 blur-3xl" />

      <div className="relative mx-auto w-full max-w-4xl">
        <div className="text-center">
          <h1 className="font-display text-3xl font-semibold leading-tight text-slate-900 max-sm:text-2xl sm:text-4xl short:sm:text-2xl">
            <span className="text-blue-700">EasyPhysio ·</span>{" "}Votre kiné doit d&apos;abord
            <br className="max-sm:hidden short:hidden" />{" "}
            vous inviter
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-base leading-relaxed text-slate-600 max-sm:mt-2 max-sm:text-sm short:mt-1.5 short:text-sm short:sm:max-w-none">
            EasyPhysio fonctionne avec votre kinésithérapeute.{" "}
            <span className="max-sm:short:hidden">Pas d&apos;inquiétude, vous pouvez simplement lui envoyer un message tout prêt.</span>
          </p>
        </div>

        <div className="mt-10 grid gap-6 max-sm:mt-4 short:mt-3 short:gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur max-md:hidden short:p-4">
            <p className="flex items-center gap-2.5 text-lg font-semibold text-slate-900">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                <Lightbulb className="h-4.5 w-4.5" strokeWidth={1.75} />
              </span>
              Comment ça marche ?
            </p>

            <ol className="relative mt-6 space-y-6 short:mt-3 short:space-y-3">
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

            <div className="mt-6 flex items-start gap-2.5 rounded-xl bg-emerald-50 p-3.5 text-sm text-emerald-800 short:mt-3 short:p-2.5">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} />
              <span>C&apos;est rapide, simple et sécurisé. Vous n&apos;avez rien d&apos;autre à faire !</span>
            </div>
          </div>

          <PatientReferralMessage />
        </div>

        <p className="mt-8 text-center text-sm text-slate-500 max-sm:mt-4 short:mt-3">
          Déjà invité·e par votre kiné ?{" "}
          <Link href="/login" className="inline-flex items-center gap-1 font-medium text-blue-700 hover:underline">
            Se connecter <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
          </Link>
        </p>
      </div>
    </main>
  );
}
