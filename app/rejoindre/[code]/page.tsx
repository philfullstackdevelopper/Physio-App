import Link from "next/link";
import { AlertCircle, ArrowLeft, HeartHandshake, MailCheck } from "lucide-react";
import SubmitButton from "@/components/SubmitButton";
import LoginExerciseShowcase from "@/components/LoginExerciseShowcase";
import { joinLinkKine } from "@/lib/db/admin";
import { instructorIdFromJoinCode } from "@/lib/patient/joinLink";
import { canInvitePatients } from "@/lib/launch";
import { joinViaLink } from "./actions";

// Page ouverte en scannant le QR code d'un kiné, ou par son lien (Philippe,
// 2026-11-04). Même mise en page que /invitation et /login : à gauche le
// formulaire, à droite la vitrine d'exercices.
export const metadata = { title: "Rejoindre mon kiné", robots: { index: false } };
export const dynamic = "force-dynamic";

const field =
  "mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-slate-900 shadow-sm transition-colors focus:border-blue-600 focus:outline-none focus:ring-4 focus:ring-blue-600/10";

export default async function JoinPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ error?: string; ok?: string; email?: string }>;
}) {
  const { code } = await params;
  const sp = await searchParams;
  const instructorId = instructorIdFromJoinCode(code);
  const kine = instructorId ? await joinLinkKine(instructorId).catch(() => null) : null;
  const available = !!kine && kine.status === "approved";
  const open = available && canInvitePatients(kine!.email);
  const kineName = kine?.full_name ?? "votre kinésithérapeute";

  return (
    <main className="relative min-h-dvh bg-[#f6f8fd]">
      <div className="absolute left-4 top-4 z-10 lg:left-6 lg:top-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/70 px-3 py-1.5 text-sm font-medium text-slate-600 shadow-sm backdrop-blur transition-colors hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
          EasyPhysio
        </Link>
      </div>

      <div className="relative mx-auto flex min-h-dvh max-w-6xl flex-col lg:flex-row lg:items-stretch">
        <div className="flex flex-1 items-center justify-center p-4 py-16 lg:p-16">
          <div className="w-full max-w-sm">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
              {sp.ok ? <MailCheck className="h-6 w-6" strokeWidth={1.75} /> : <HeartHandshake className="h-6 w-6" strokeWidth={1.75} />}
            </span>

            {!available ? (
              <>
                <h1 className="font-display mt-4 text-2xl font-semibold tracking-tight text-slate-900">Lien non valide</h1>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">
                  Ce lien ne correspond à aucun kinésithérapeute disponible. Demandez à votre kiné de vous le renvoyer.
                </p>
              </>
            ) : sp.ok ? (
              <>
                <h1 className="font-display mt-4 text-2xl font-semibold tracking-tight text-slate-900">Vérifiez vos e-mails</h1>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">
                  Nous venons d&apos;envoyer une invitation à <span className="font-medium text-slate-700">{sp.email ?? "votre adresse"}</span>.
                  Ouvrez-la pour créer votre mot de passe et retrouver votre programme avec {kineName}.
                </p>
                <p className="mt-4 text-xs text-slate-400">Rien reçu après quelques minutes ? Regardez dans les indésirables.</p>
              </>
            ) : (
              <>
                <h1 className="font-display mt-4 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                  <span className="text-blue-700">EasyPhysio ·</span> Rejoindre le suivi de {kineName}
                </h1>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">
                  Vos exercices en vidéo, à faire chez vous, suivis par votre kiné. Indiquez votre nom et votre e-mail : vous
                  recevrez un lien pour créer votre mot de passe.
                </p>

                {!open && (
                  <p className="mt-6 flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50 p-3.5 text-sm text-slate-700">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-blue-700" strokeWidth={1.75} />
                    Les inscriptions de patients ouvriront au lancement d&apos;EasyPhysio.
                  </p>
                )}
                {sp.error && (
                  <p role="alert" className="mt-6 flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 p-3.5 text-sm text-red-700">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} />
                    {sp.error}
                  </p>
                )}

                <form action={joinViaLink.bind(null, code)} className="mt-6">
                  <fieldset disabled={!open} className="space-y-4 disabled:opacity-50">
                    <label className="block text-sm font-medium text-slate-700">
                      Nom complet
                      <input name="full_name" type="text" required autoComplete="name" className={field} />
                    </label>
                    <label className="block text-sm font-medium text-slate-700">
                      Adresse e-mail
                      <input name="email" type="email" required autoComplete="email" inputMode="email" className={field} />
                    </label>
                    <SubmitButton
                      pendingText="Envoi…"
                      className="w-full rounded-full bg-blue-600 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60"
                    >
                      Recevoir mon invitation
                    </SubmitButton>
                  </fieldset>
                </form>
                <p className="mt-4 text-center text-sm text-slate-500">
                  Déjà un compte ?{" "}
                  <Link href="/login" className="font-medium text-blue-700 hover:underline">
                    Se connecter
                  </Link>
                </p>
              </>
            )}
          </div>
        </div>

        <div className="hidden flex-1 flex-col px-16 py-6 lg:sticky lg:top-0 lg:flex lg:h-screen">
          <div className="min-h-0 flex-1">
            <LoginExerciseShowcase />
          </div>
        </div>
      </div>
    </main>
  );
}
