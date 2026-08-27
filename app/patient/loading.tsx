export default function PatientDashboardLoading() {
  return (
    <main className="min-h-screen p-6 sm:p-8">
      <div className="mx-auto max-w-2xl motion-safe:animate-pulse">
        <div className="pt-2 flex justify-center">
          <div className="h-10 w-56 rounded-lg bg-slate-200 sm:h-12 sm:w-72" />
        </div>

        <div className="mt-3 flex items-center justify-center gap-3">
          <div className="h-14 w-14 shrink-0 rounded-full bg-slate-200" />
          <div className="h-4 w-40 rounded bg-slate-200" />
        </div>

        <div className="mt-2 flex justify-center">
          <div className="h-4 w-64 rounded bg-slate-200" />
        </div>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
          <div className="mx-auto h-4 w-3/4 rounded bg-slate-200" />
          <div className="mx-auto mt-2 h-4 w-1/2 rounded bg-slate-200" />
        </div>

        <div className="mt-6 h-20 rounded-2xl bg-slate-200" />

        <div className="mt-6 rounded-2xl border border-slate-100 bg-white p-5">
          <div className="h-4 w-40 rounded bg-slate-200" />
          <div className="mt-3 space-y-3">
            <div className="h-14 rounded-xl border border-slate-200" />
            <div className="h-14 rounded-xl border border-slate-200" />
          </div>
        </div>

        <div className="mt-8 flex justify-center">
          <div className="h-4 w-32 rounded bg-slate-200" />
        </div>
      </div>
    </main>
  );
}
