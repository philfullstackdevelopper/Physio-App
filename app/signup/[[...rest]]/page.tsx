import Link from "next/link";
import { FolderOpen, ClipboardList, Lock } from "lucide-react";
import { SignUp } from "@clerk/nextjs";
import RandomLine from "@/components/RandomLine";
import { LogoMark } from "@/components/Logo";
import DotCanvas from "@/components/DotCanvas";

const ENCOURAGEMENTS = [
  "Créez votre espace en quelques minutes et prescrivez dès aujourd'hui.",
  "Rejoignez les praticiens qui suivent leurs patients à distance, simplement.",
  "Un programme prêt à l'emploi vous attend dès la création du compte.",
  "Votre cabinet, prolongé jusque chez vos patients.",
];

const FEATURES = [
  {
    icon: FolderOpen,
    title: "Bibliothèque partagée",
    body: "Des conditions, séances et exercices prêts à l'emploi dès l'inscription.",
  },
  {
    icon: ClipboardList,
    title: "Suivi d'assiduité",
    body: "Visualisez en un coup d'œil qui progresse et qui a besoin d'attention.",
  },
  {
    icon: Lock,
    title: "Données isolées",
    body: "Chaque patient n'appartient qu'à vous, aucun accès croisé entre praticiens.",
  },
];

export default function SignupPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f6f8fd]">
      <DotCanvas />

      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col lg:flex-row lg:items-center">
        {/* Left: signup form */}
        <div className="flex flex-1 items-center justify-center p-4 py-16 lg:p-16">
          <div className="w-full max-w-sm">
            <Link href="/" className="mb-6 flex items-center justify-center gap-2.5 lg:hidden">
              <LogoMark size={36} />
              <span className="font-display text-xl font-semibold text-slate-900">Physio-App</span>
            </Link>

            <div className="rounded-3xl border border-blue-100 bg-white/90 p-8 shadow-sm backdrop-blur">
              <h1 className="font-display text-2xl font-semibold text-slate-900">
                Créer un compte
              </h1>
              <p className="mb-6 mt-1.5 text-sm leading-relaxed text-slate-500 lg:hidden">
                <RandomLine options={ENCOURAGEMENTS} />
              </p>
              <p className="mb-6 mt-1.5 hidden text-sm leading-relaxed text-slate-500 lg:block">
                Espace physiothérapeute — quelques informations suffisent.
              </p>

            {/* Clerk sign-up component (French via ClerkProvider).
                On success it lands on /signup/finalize, which records the
                instructor profile (status "pending") before the approval gate. */}
            <SignUp
              fallbackRedirectUrl="/signup/finalize"
              signInUrl="/login"
              appearance={{
                elements: { rootBox: "w-full", cardBox: "w-full" },
              }}
            />

            <p className="mt-4 text-center text-xs leading-relaxed text-slate-400">
              Votre demande sera vérifiée avant activation de votre compte praticien.
            </p>

            <p className="mt-6 text-center text-sm text-slate-500">
              Déjà un compte ?{" "}
              <Link href="/login" className="font-medium text-blue-700 hover:underline">
                Se connecter
              </Link>
            </p>
            </div>
          </div>
        </div>

        {/* Right: brand / encouragement panel (desktop only) */}
        <div className="hidden flex-1 flex-col justify-center px-16 py-16 lg:flex">
          <Link href="/" className="mb-10 flex items-center gap-2.5">
            <LogoMark size={36} />
            <span className="font-display text-xl font-semibold text-slate-900">Physio-App</span>
          </Link>

          <span className="mb-4 inline-flex w-fit items-center rounded-full border border-blue-100 bg-white/70 px-4 py-1.5 text-sm font-medium text-blue-700 shadow-sm backdrop-blur">
            Espace physiothérapeute
          </span>
          <h1 className="font-display max-w-md text-4xl font-semibold leading-[1.1] tracking-tight text-slate-900">
            Prescrivez, suivez, ajustez, le tout depuis un seul endroit.
          </h1>
          <p className="mt-4 max-w-sm text-base leading-relaxed text-slate-600">
            <RandomLine options={ENCOURAGEMENTS} />
          </p>

          <div className="mt-12 space-y-5">
            {FEATURES.map((f) => (
              <div key={f.title} className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-100 bg-white/80 text-blue-700 shadow-sm backdrop-blur">
                  <f.icon className="h-5 w-5" strokeWidth={1.75} />
                </span>
                <div>
                  <p className="font-medium text-slate-900">{f.title}</p>
                  <p className="text-sm leading-relaxed text-slate-500">{f.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
