import Link from "next/link";

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#faf7f2] text-slate-800">
      {/* Warm ambient background */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(900px 500px at 15% -5%, #ccfbf1 0%, transparent 55%)," +
            "radial-gradient(800px 500px at 95% 0%, #fde9d9 0%, transparent 50%)",
        }}
      />

      {/* Header */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-600 text-lg font-bold text-white shadow-sm">
            P
          </span>
          <span className="text-xl font-semibold text-slate-900">Physio-App</span>
        </div>
        <Link
          href="/login"
          className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition hover:text-teal-700"
        >
          Se connecter
        </Link>
      </header>

      {/* Hero */}
      <main className="mx-auto max-w-6xl px-6">
        <section className="pt-14 text-center sm:pt-20">
          <span className="inline-block rounded-full border border-teal-100 bg-white/70 px-4 py-1.5 text-sm font-medium text-teal-700 shadow-sm backdrop-blur">
            Rééducation guidée, à domicile
          </span>
          <h1 className="font-display mx-auto mt-7 max-w-4xl text-5xl font-semibold leading-[1.05] tracking-tight text-slate-900 sm:text-6xl md:text-7xl">
            Votre rééducation,
            <br />
            <span className="text-teal-700">accompagnée à chaque pas.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-600 sm:text-xl">
            Des programmes d&apos;exercices sur mesure, une caméra qui corrige vos
            mouvements en temps réel, et votre praticien à vos côtés — où que vous soyez.
          </p>
        </section>

        {/* Clear patient / therapist choice */}
        <section className="mx-auto mt-14 grid max-w-4xl gap-5 sm:grid-cols-2">
          {/* Patient */}
          <div className="flex flex-col rounded-3xl border border-teal-100 bg-white p-8 shadow-sm transition hover:shadow-md">
            <span className="text-3xl">🧍</span>
            <h2 className="font-display mt-4 text-2xl font-semibold text-slate-900">
              Je suis patient
            </h2>
            <p className="mt-2 flex-1 text-slate-600">
              Suivez votre programme du jour, filmez vos exercices et laissez-vous
              guider répétition après répétition.
            </p>
            <Link
              href="/login"
              className="mt-6 inline-flex items-center justify-center rounded-xl bg-teal-600 px-5 py-3 font-medium text-white shadow-sm transition hover:bg-teal-700"
            >
              Accéder à mon espace →
            </Link>
          </div>

          {/* Therapist */}
          <div className="flex flex-col rounded-3xl border border-slate-200 bg-white/80 p-8 shadow-sm backdrop-blur transition hover:shadow-md">
            <span className="text-3xl">🩺</span>
            <h2 className="font-display mt-4 text-2xl font-semibold text-slate-900">
              Je suis praticien
            </h2>
            <p className="mt-2 flex-1 text-slate-600">
              Prescrivez des programmes adaptés, suivez l&apos;assiduité et la
              progression de chaque patient depuis un seul tableau de bord.
            </p>
            <div className="mt-6 flex flex-col gap-2">
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Espace praticien →
              </Link>
              <Link
                href="/signup"
                className="text-center text-sm font-medium text-teal-700 hover:underline"
              >
                Nouveau ? Créer un compte
              </Link>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="mx-auto mt-20 grid max-w-5xl gap-6 pb-24 sm:grid-cols-3">
          {[
            {
              icon: "🎯",
              title: "Programmes sur mesure",
              body: "Votre situation et votre étape de récupération façonnent chaque séance.",
            },
            {
              icon: "🎥",
              title: "Correction par caméra",
              body: "L'IA compte vos répétitions et corrige votre posture en temps réel.",
            },
            {
              icon: "📈",
              title: "Progression partagée",
              body: "Vous et votre praticien suivez vos progrès, séance après séance.",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-slate-100 bg-white/70 p-6 shadow-sm backdrop-blur"
            >
              <span className="text-2xl">{f.icon}</span>
              <h3 className="mt-3 font-semibold text-slate-900">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{f.body}</p>
            </div>
          ))}
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/70 py-8">
        <p className="text-center text-sm text-slate-400">© 2026 Physio-App</p>
      </footer>
    </div>
  );
}
