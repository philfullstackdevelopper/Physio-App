"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { joinWaitlist, type WaitlistState } from "@/app/waitlistActions";

// Liste d'attente du lancement (Philippe, 2026-10-12) : un visiteur — surtout
// un kiné — laisse son e-mail pour être prévenu de l'ouverture. Posé sur le
// bloc sombre de fin de page d'accueil (#liste-attente). Aucun e-mail
// automatique : Philippe écrit lui-même à la liste, visible dans /admin.

const INITIAL: WaitlistState = { ok: false, error: null };
type Role = "kine" | "patient";

export default function WaitlistForm() {
  const [state, formAction, pending] = useActionState(joinWaitlist, INITIAL);
  const [role, setRole] = useState<Role>("kine");

  if (state.ok) {
    return (
      <p role="status" className="mx-auto flex max-w-md items-center justify-center gap-2 text-sm font-medium text-emerald-300">
        <CheckCircle2 className="h-5 w-5 shrink-0" strokeWidth={1.75} />
        Merci, c&apos;est noté. Nous vous écrirons dès le lancement.
      </p>
    );
  }

  return (
    <form action={formAction} className="mx-auto max-w-md">
      <input type="hidden" name="role" value={role} />
      {/* Champ piège pour les robots : hors écran, jamais rempli par un humain. */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute -left-[9999px] h-0 w-0 opacity-0"
      />

      <div className="mx-auto flex w-fit rounded-full bg-white/10 p-1 text-sm" role="group" aria-label="Vous êtes">
        {(
          [
            { key: "kine", label: "Je suis kiné" },
            { key: "patient", label: "Je suis patient" },
          ] as const
        ).map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => setRole(opt.key)}
            aria-pressed={role === opt.key}
            className={`rounded-full px-4 py-1.5 font-medium transition ${
              role === opt.key ? "bg-white text-slate-900" : "text-slate-300 hover:text-white"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <label htmlFor="waitlist-email" className="sr-only">
          Votre adresse e-mail
        </label>
        <input
          id="waitlist-email"
          type="email"
          name="email"
          required
          maxLength={254}
          autoComplete="email"
          placeholder="votre@email.fr"
          className="min-w-0 flex-1 rounded-full border border-white/20 bg-white/10 px-4 py-2.5 text-sm text-white placeholder:text-slate-400 focus:border-white/60 focus:outline-none"
        />
        <button
          type="submit"
          disabled={pending}
          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-500 active:scale-95 disabled:opacity-60"
        >
          {pending ? "Envoi…" : "Me prévenir du lancement"}
          {!pending && <ArrowRight className="h-4 w-4" strokeWidth={2} />}
        </button>
      </div>

      {state.error && (
        <p role="alert" className="mt-2 text-sm text-red-300">
          {state.error}
        </p>
      )}
      <p className="mt-2 text-xs leading-snug text-slate-400">
        Votre e-mail ne sert qu&apos;à vous annoncer le lancement.{" "}
        <Link href="/confidentialite" className="underline underline-offset-2 hover:text-slate-200">
          Confidentialité
        </Link>
      </p>
    </form>
  );
}
