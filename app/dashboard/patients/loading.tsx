export default function PatientsLoading() {
  return (
    <main className="min-h-screen p-6 sm:p-8">
      <div className="mx-auto max-w-7xl motion-safe:animate-pulse">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-7 w-40 rounded bg-line" />
            <div className="mt-2 h-4 w-72 rounded bg-line" />
          </div>
          <div className="h-9 w-40 rounded-full bg-line" />
        </div>
        <div className="mt-6 flex gap-3">
          <div className="h-9 flex-1 rounded-lg bg-line" />
          <div className="h-9 w-64 rounded-full bg-line" />
          <div className="h-9 w-9 rounded-lg bg-line" />
        </div>
        <div className="mt-4 divide-y divide-line rounded-xl border border-line bg-surface">
          {[0, 1, 2, 3, 4].map((i) => <div key={i} className="h-14" />)}
        </div>
      </div>
    </main>
  );
}
