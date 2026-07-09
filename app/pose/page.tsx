import SessionFlow from "@/components/SessionFlow";

// Demo page for the computer-vision prototype: http://localhost:3000/pose
export default function PosePage() {
  return (
    <main className="min-h-screen p-8">
      <div className="mx-auto max-w-xl">
        <h1 className="text-2xl font-semibold text-slate-900">
          Suivi de posture (prototype)
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Réglez les objectifs, puis lancez la caméra et placez-vous face à l&apos;objectif.
        </p>
        <div className="mt-6">
          <SessionFlow />
        </div>
      </div>
    </main>
  );
}
