import Link from "next/link";
import { FolderOpen, ClipboardList, Lock } from "lucide-react";
import RandomLine from "@/components/RandomLine";
import { signup } from "./actions";

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

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#faf7f2]">
      {/* Warm ambient background, matching the homepage / login */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-20"
        style={{
          background:
            "radial-gradient(900px 500px at 10% -5%, #ccfbf1 0%, transparent 55%)," +
            "radial-gradient(800px 500px at 100% 10%, #fde9d9 0%, transparent 50%)",
        }}
      />

      {/* Subtle dot-grid pattern */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-60"
        style={{
          backgroundImage:
            "radial-gradient(rgba(15, 118, 110, 0.14) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
          maskImage:
            "radial-gradient(1100px 700px at 30% 40%, black 0%, transparent 75%)",
          WebkitMaskImage:
            "radial-gradient(1100px 700px at 30% 40%, black 0%, transparent 75%)",
        }}
      />

      <div className="mx-auto flex min-h-screen max-w-6xl flex-col lg:flex-row lg:items-center">
        {/* Left: signup form */}
        <div className="flex flex-1 items-center justify-center p-4 py-16 lg:p-16">
          <div className="w-full max-w-sm">
            <Link href="/" className="mb-6 flex items-center justify-center gap-2.5 lg:hidden">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-600 text-lg font-bold text-white shadow-sm">
                P
              </span>
              <span className="text-xl font-semibold text-slate-900">Physio-App</span>
            </Link>

            <div className="rounded-3xl border border-teal-100 bg-white/90 p-8 shadow-sm backdrop-blur">
              <h1 className="font-display text-2xl font-semibold text-slate-900">
                Créer un compte
              </h1>
              <p className="mb-6 mt-1.5 text-sm leading-relaxed text-slate-500 lg:hidden">
                <RandomLine options={ENCOURAGEMENTS} />
              </p>
              <p className="mb-6 mt-1.5 hidden text-sm leading-relaxed text-slate-500 lg:block">
                Espace physiothérapeute — quelques informations suffisent.
              </p>

              {error && (
                <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
              )}

              <form action={signup} className="space-y-4">
                <div>
                  <label htmlFor="full_name" className="mb-1 block text-sm font-medium text-slate-700">
                    Nom complet
                  </label>
                  <input
                    id="full_name"
                    name="full_name"
                    type="text"
                    required
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-900 transition focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-100"
                  />
                </div>
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
                <div>
                  <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">
                    Mot de passe
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    minLength={6}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-900 transition focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-100"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full rounded-xl bg-teal-600 py-2.5 font-medium text-white shadow-sm transition hover:bg-teal-700"
                >
                  S&apos;inscrire
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-slate-500">
                Déjà un compte ?{" "}
                <Link href="/login" className="font-medium text-teal-700 hover:underline">
                  Se connecter
                </Link>
              </p>
            </div>
          </div>
        </div>

        {/* Right: brand / encouragement panel (desktop only) */}
        <div className="hidden flex-1 flex-col justify-center px-16 py-16 lg:flex">
          <Link href="/" className="mb-10 flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-600 text-lg font-bold text-white shadow-sm">
              P
            </span>
            <span className="text-xl font-semibold text-slate-900">Physio-App</span>
          </Link>

          <span className="mb-4 inline-flex w-fit items-center rounded-full border border-teal-100 bg-white/70 px-4 py-1.5 text-sm font-medium text-teal-700 shadow-sm backdrop-blur">
            Espace physiothérapeute
          </span>
          <h1 className="font-display max-w-md text-4xl font-semibold leading-[1.1] tracking-tight text-slate-900">
            Prescrivez, suivez, ajustez — le tout depuis un seul endroit.
          </h1>
          <p className="mt-4 max-w-sm text-base leading-relaxed text-slate-600">
            <RandomLine options={ENCOURAGEMENTS} />
          </p>

          <div className="mt-12 space-y-5">
            {FEATURES.map((f) => (
              <div key={f.title} className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-100 bg-white/80 text-teal-700 shadow-sm backdrop-blur">
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
