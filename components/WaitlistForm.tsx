"use client";

import { useActionState, useEffect, useState } from "react";
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

  // Tous les boutons « liste d'attente » de la page (en-tête, haut de page,
  // Tarifs, pied de page) pointent vers #liste-attente. Le défilement
  // automatique vers une ancre ne se déclenchait pas (Philippe, 2026-10-12 :
  // « appuyer sur le bouton ne fait absolument rien ») : on le fait donc ici,
  // pour tous ces liens d'un coup, et on place le curseur dans le champ e-mail.
  useEffect(() => {
    const goToForm = () => {
      const target = document.getElementById("liste-attente");
      if (!target) return false;
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      // Filet de sécurité : si le défilement animé n'a pas abouti (onglet en
      // arrière-plan, animations désactivées, navigateur capricieux), on saute
      // directement au formulaire. Puis le curseur va dans le champ e-mail.
      window.setTimeout(() => {
        const r = target.getBoundingClientRect();
        const visible = r.top < window.innerHeight * 0.6 && r.bottom > window.innerHeight * 0.4;
        if (!visible) target.scrollIntoView({ behavior: "instant", block: "center" });
        document.getElementById("waitlist-email")?.focus({ preventScroll: true });
      }, 1000);
      return true;
    };
    const onClick = (e: MouseEvent) => {
      const link = (e.target as Element | null)?.closest?.('a[href$="#liste-attente"]');
      if (!link || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      if (!goToForm()) return; // pas sur la page d'accueil : le lien y mène normalement
      e.preventDefault();
      window.history.replaceState(null, "", "#liste-attente");
    };
    // Phase de capture : avant le gestionnaire de navigation de Next.
    document.addEventListener("click", onClick, true);
    // Arrivée directe sur …/#liste-attente (lien envoyé, autre page du site) :
    // on attend que la page ait pris sa hauteur définitive.
    const arrival = window.location.hash === "#liste-attente" ? window.setTimeout(goToForm, 900) : undefined;
    return () => {
      document.removeEventListener("click", onClick, true);
      window.clearTimeout(arrival);
    };
  }, []);

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
