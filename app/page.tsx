import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-600 font-bold text-white">
            P
          </span>
          <span className="text-lg font-semibold text-slate-900">Physio-App</span>
        </div>
        <Link
          href="/login"
          className="rounded-lg px-4 py-2 text-sm font-medium text-slate-700 hover:text-teal-700"
        >
          Se connecter
        </Link>
      </header>

      {/* Hero */}
      <main className="mx-auto max-w-5xl px-6">
        <section className="pt-16 pb-20 text-center sm:pt-24">
          <span className="inline-block rounded-full bg-teal-50 px-3 py-1 text-sm font-medium text-teal-700">
            Suivi d&apos;exercices en ligne
          </span>
          <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            Vos exercices de rééducation, guidés par votre physiothérapeute
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-600">
            Une plateforme simple pour prescrire des programmes d&apos;exercices, suivre
            l&apos;assiduité des patients et progresser ensemble, où que vous soyez.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/login"
              className="w-full rounded-lg bg-teal-600 px-6 py-3 font-medium text-white shadow-sm hover:bg-teal-700 sm:w-auto"
            >
              Se connecter
            </Link>
            <Link
              href="/signup"
              className="w-full rounded-lg border border-slate-300 bg-white px-6 py-3 font-medium text-slate-700 hover:bg-slate-50 sm:w-auto"
            >
              Espace physiothérapeute
            </Link>
          </div>
        </section>

        {/* Features */}
        <section className="grid gap-6 pb-24 sm:grid-cols-3">
          {[
            {
              title: "Programmes en un clic",
              body: "Assignez une condition à un patient et son programme d'exercices se génère automatiquement.",
            },
            {
              title: "Suivi de l'assiduité",
              body: "Vos patients cochent leurs exercices réalisés ; vous visualisez leur progression.",
            },
            {
              title: "Exercices illustrés",
              body: "Chaque exercice est accompagné d'instructions claires et de vidéos de démonstration.",
            },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <h3 className="font-semibold text-slate-900">{f.title}</h3>
              <p className="mt-2 text-sm text-slate-600">{f.body}</p>
            </div>
          ))}
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-100 py-8">
        <p className="text-center text-sm text-slate-400">© 2026 Physio-App</p>
      </footer>
    </div>
  );
}
