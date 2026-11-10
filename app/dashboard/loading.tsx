// Squelette affiché pendant le chargement d'une page de l'espace kiné (audit
// du 2026-11-10, A3) — même principe que app/patient/loading.tsx. Purement
// décoratif : aucun texte, donc rien à traduire.
export default function DashboardLoading() {
  return (
    <main className="min-w-0 flex-1 p-6 sm:p-8" aria-busy="true">
      <div className="mx-auto max-w-5xl motion-safe:animate-pulse">
        <div className="h-8 w-56 rounded-lg bg-line" />
        <div className="mt-3 h-4 w-80 max-w-full rounded bg-line" />
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="h-24 rounded-2xl border border-line bg-surface" />
          <div className="h-24 rounded-2xl border border-line bg-surface" />
          <div className="h-24 rounded-2xl border border-line bg-surface" />
        </div>
        <div className="mt-6 h-48 rounded-2xl border border-line bg-surface" />
      </div>
    </main>
  );
}
