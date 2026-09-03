export default function PatientsLoading() {
  return (
    <main className="min-h-screen p-6 sm:p-8">
      <div className="mx-auto max-w-2xl motion-safe:animate-pulse">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-4 w-28 rounded bg-stone-200" />
            <div className="mt-2 h-7 w-40 rounded bg-stone-200" />
          </div>
          <div className="h-9 w-28 rounded-lg bg-stone-200" />
        </div>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <div className="h-10 w-full rounded-lg bg-stone-200 sm:flex-1" />
          <div className="h-10 w-full rounded-lg bg-stone-200 sm:w-48" />
          <div className="h-10 w-full rounded-lg bg-stone-200 sm:w-40" />
        </div>

        <div className="mt-3 space-y-2 rounded-xl border border-stone-200 bg-white p-2">
          <div className="h-16 rounded-lg bg-stone-100" />
          <div className="h-16 rounded-lg bg-stone-100" />
          <div className="h-16 rounded-lg bg-stone-100" />
          <div className="h-16 rounded-lg bg-stone-100" />
        </div>
      </div>
    </main>
  );
}
