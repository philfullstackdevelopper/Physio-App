"use client";

// « Supprimer mon compte » du kiné (Apple, règle 5.1.1(v)). C'est une demande
// traitée par EasyPhysio : supprimer un compte kiné touche aussi ses patients
// et les documents qu'il doit conserver. Volontairement discret et en bas.

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";

export default function AccountDeletionCard({
  requestedAt,
  requestAction,
  cancelAction,
}: {
  requestedAt: string | null;
  requestAction: (formData: FormData) => Promise<{ ok: true } | { error: string }>;
  cancelAction: () => Promise<{ ok: true } | { error: string }>;
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [sentAt, setSentAt] = useState<string | null>(requestedAt);

  if (sentAt) {
    return (
      <section className="mt-6 rounded-2xl border border-line bg-surface p-4 text-sm">
        <p className="font-medium text-ink">Suppression du compte demandée</p>
        <p className="mt-1 text-muted">
          Demande envoyée le {new Date(sentAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}. EasyPhysio vous recontacte
          sous 30 jours pour la finaliser.
        </p>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await cancelAction();
              if ("error" in res) setError(res.error);
              else setSentAt(null);
            })
          }
          className="mt-3 text-sm font-medium text-brand hover:underline disabled:opacity-60"
        >
          Annuler la demande
        </button>
        {error && <p className="mt-2 text-danger">{error}</p>}
      </section>
    );
  }

  return (
    <section className="mt-6">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-danger"
        >
          <Trash2 className="h-4 w-4" strokeWidth={1.75} />
          Supprimer mon compte
        </button>
      ) : (
        <form
          action={(fd) =>
            start(async () => {
              setError(null);
              const res = await requestAction(fd);
              if ("error" in res) setError(res.error);
              else setSentAt(new Date().toISOString());
            })
          }
          className="rounded-2xl border border-danger/30 bg-danger-soft/40 p-4 text-sm"
        >
          <p className="font-medium text-ink">Supprimer mon compte</p>
          <p className="mt-1 text-muted">
            Votre compte, vos séances et l&apos;accès de vos patients seront supprimés. EasyPhysio vous recontacte sous 30 jours pour
            finaliser, notamment pour vos patients en cours.
          </p>
          <textarea
            name="reason"
            rows={2}
            placeholder="Pourquoi partez-vous ? (facultatif)"
            className="mt-3 w-full rounded-lg border border-line bg-surface px-3 py-2 text-ink focus:border-brand focus:outline-none"
          />
          <label className="mt-2 flex items-start gap-2 text-ink">
            <input type="checkbox" name="confirm" className="mt-0.5 h-4 w-4 accent-danger" />
            Je demande la suppression de mon compte.
          </label>
          <div className="mt-3 flex gap-2">
            <button type="submit" disabled={pending} className="rounded-lg bg-danger px-3 py-2 font-medium text-white disabled:opacity-60">
              {pending ? "Envoi…" : "Envoyer la demande"}
            </button>
            <button type="button" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 text-muted hover:text-ink">
              Annuler
            </button>
          </div>
          {error && <p className="mt-2 text-danger">{error}</p>}
        </form>
      )}
    </section>
  );
}
