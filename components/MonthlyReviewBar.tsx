"use client";

import { useRef } from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2, ClipboardCheck, FileText, Hourglass, Send, X } from "lucide-react";
import SubmitButton from "@/components/SubmitButton";

export type MonthlyReviewState = {
  patientId: string;
  firstName: string;
  monthLabel: string;
  followUp: "none" | "pending_card" | "active" | "stopped";
  priceCents: number;
  review: { id: string; paymentStatus: "pending" | "paid" | "failed"; amountCents: number } | null;
  draft: string;
  connectActive: boolean;
};

const eur = (cents: number) => `${(cents / 100).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €`;

// Barre « Suivi mensuel » de la fiche patient (nouveau modèle, 2026-10-24) :
// une ligne compacte au-dessus de la frise (la fiche doit tenir sur un écran),
// et le bilan s'écrit dans une fenêtre. Ordinateur et téléphone.
export default function MonthlyReviewBar({
  state,
  validateAction,
  proposeAction,
  notice,
}: {
  state: MonthlyReviewState;
  validateAction: (fd: FormData) => Promise<void>;
  proposeAction: (fd: FormData) => Promise<void>;
  notice?: { kind: "ok" | "warn" | "error"; text: string } | null;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const s = state;

  let line: React.ReactNode;
  let action: React.ReactNode = null;
  if (s.review) {
    const p = s.review.paymentStatus;
    line = (
      <span className="flex items-center gap-1.5">
        {p === "paid" ? (
          <CheckCircle2 className="h-4 w-4 shrink-0 text-ok" strokeWidth={1.75} />
        ) : p === "pending" ? (
          <Hourglass className="h-4 w-4 shrink-0 text-warn" strokeWidth={1.75} />
        ) : (
          <AlertCircle className="h-4 w-4 shrink-0 text-danger" strokeWidth={1.75} />
        )}
        Bilan de {s.monthLabel} validé · {eur(s.review.amountCents)} ·{" "}
        {p === "paid" ? "payé" : p === "pending" ? "paiement en cours" : "paiement refusé"}
      </span>
    );
    action = (
      <Link
        href={`/documents/honoraires?review=${s.review.id}`}
        target="_blank"
        className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-line px-3 py-1.5 text-sm font-medium text-ink transition hover:bg-app-bg"
      >
        <FileText className="h-4 w-4" strokeWidth={1.75} />
        Note d&apos;honoraires
      </Link>
    );
  } else if (s.followUp === "active") {
    line = (
      <span>
        Bilan de {s.monthLabel} <span className="font-medium text-brand">à faire</span> · {eur(s.priceCents)}
      </span>
    );
    action = (
      <button
        type="button"
        onClick={() => dialog.current?.showModal()}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-brand px-3 py-1.5 text-sm font-medium text-white transition hover:bg-brand-dark"
      >
        <ClipboardCheck className="h-4 w-4" strokeWidth={1.75} />
        Faire le bilan
      </button>
    );
  } else if (s.followUp === "pending_card") {
    line = <span>Suivi mensuel accepté · {s.firstName} doit encore enregistrer sa carte</span>;
  } else if (s.followUp === "stopped") {
    line = <span>Suivi mensuel arrêté par {s.firstName}</span>;
  } else {
    line = <span className="text-muted">Pas de suivi mensuel</span>;
    action = (
      <form action={proposeAction}>
        <input type="hidden" name="patient_id" value={s.patientId} />
        <input type="hidden" name="price_cents" value={s.priceCents} />
        <SubmitButton
          pendingText="Envoi…"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-brand px-3 py-1.5 text-sm font-medium text-brand transition hover:bg-brand-soft"
        >
          <Send className="h-4 w-4" strokeWidth={1.75} />
          Proposer le suivi
        </SubmitButton>
      </form>
    );
  }

  return (
    <div id="bilan" data-hide-when-week-open="" className="mt-3 scroll-mt-20 max-sm:shrink-0">
      {notice && (
        <p
          className={`mb-2 rounded-xl px-4 py-2 text-sm ${
            notice.kind === "ok" ? "bg-ok-soft text-ok" : notice.kind === "warn" ? "bg-warn-soft text-warn" : "bg-danger-soft text-danger"
          }`}
        >
          {notice.text}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-surface px-4 py-2 text-sm text-ink max-sm:rounded-2xl max-sm:border-0 max-sm:px-3 max-sm:shadow-soft">
        <span className="flex min-w-0 items-center gap-2">
          <span className="hidden text-xs font-semibold uppercase tracking-wide text-muted sm:inline">Suivi mensuel</span>
          {line}
        </span>
        {action}
      </div>

      <dialog
        ref={dialog}
        className="m-auto w-[min(560px,calc(100vw-2rem))] rounded-2xl bg-surface p-0 text-ink shadow-soft backdrop:bg-black/40"
      >
        <form action={validateAction} className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Bilan de {s.monthLabel}</h2>
              <p className="mt-0.5 text-sm text-muted">
                Votre retour à {s.firstName}. Il lui est envoyé dans sa messagerie, et sa carte est prélevée de{" "}
                {eur(s.priceCents)} (100 % pour vous).
              </p>
            </div>
            <button type="button" onClick={() => dialog.current?.close()} aria-label="Fermer" className="rounded-full p-1 text-muted hover:bg-app-bg">
              <X className="h-5 w-5" strokeWidth={1.75} />
            </button>
          </div>
          <input type="hidden" name="patient_id" value={s.patientId} />
          <textarea
            name="feedback"
            required
            minLength={10}
            rows={8}
            defaultValue={s.draft}
            className="mt-4 w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm leading-relaxed outline-none focus:border-brand"
          />
          <p className="mt-1 text-xs text-muted">
            Pensez à ajuster le programme avant de valider si besoin. Ensuite, les échanges du mois sont inclus.
          </p>
          {!s.connectActive && (
            <p className="mt-2 rounded-xl bg-warn-soft px-3 py-2 text-xs text-warn">
              Vos paiements ne sont pas encore activés : activez-les dans Suivi &amp; facturation avant de valider.
            </p>
          )}
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={() => dialog.current?.close()} className="rounded-xl border border-line px-4 py-2 text-sm font-medium text-ink hover:bg-app-bg">
              Annuler
            </button>
            <SubmitButton
              pendingText="Validation…"
              disabled={!s.connectActive}
              className="rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-dark"
            >
              Valider le bilan
            </SubmitButton>
          </div>
        </form>
      </dialog>
    </div>
  );
}
