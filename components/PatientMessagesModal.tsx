"use client";

// =============================================================================
// PatientMessagesModal — pop-up ouverte depuis « Mes patients » (PatientsTable)
// pour lire et répondre à la conversation d'un patient sans quitter la liste.
// Réutilise MessageThread/MessageComposer (mêmes composants que la boîte de
// réception complète) ; les actions serveur sont injectées en props depuis
// app/dashboard/patients/page.tsx (voir ./actions.ts), sans redirection.
// =============================================================================

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, X } from "lucide-react";
import MessageThread, { type ThreadMessage } from "@/components/MessageThread";
import MessageComposer from "@/components/MessageComposer";

export interface MessagesModalPatient {
  id: string;
  name: string;
  initials: string;
}

export default function PatientMessagesModal({
  patient,
  onClose,
  getThread,
  sendMessage,
}: {
  patient: MessagesModalPatient;
  onClose: () => void;
  getThread: (patientId: string) => Promise<{ thread: ThreadMessage[] } | { error: string }>;
  sendMessage: (formData: FormData) => Promise<{ ok: true } | { error: string }>;
}) {
  const [loading, setLoading] = useState(true);
  const [thread, setThread] = useState<ThreadMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [composerKey, setComposerKey] = useState(0);

  // Pas de setLoading(true) synchrone ici : le spinner initial vient de l'état
  // par défaut (loading=true à l'ouverture) ; un rechargement après l'envoi
  // d'un message met juste le fil à jour sans le refaire clignoter.
  const load = useCallback(async () => {
    const result = await getThread(patient.id);
    if ("error" in result) setError(result.error);
    else {
      setThread(result.thread);
      setError(null);
    }
    setLoading(false);
  }, [getThread, patient.id]);

  useEffect(() => {
    // Chargement du fil à l'ouverture : tous les setState arrivent après le
    // `await` de load(), jamais de façon synchrone dans l'effet lui-même.
    load(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [load]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const handleSend = async (formData: FormData) => {
    const result = await sendMessage(formData);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    setComposerKey((k) => k + 1);
    await load();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Messages avec ${patient.name}`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
      onClick={onClose}
    >
      <div
        className="flex h-[85vh] w-full max-w-3xl flex-col rounded-2xl bg-surface shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center gap-3 border-b border-line px-5 py-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-sm font-semibold text-brand">
            {patient.initials}
          </span>
          <p className="min-w-0 flex-1 truncate text-base font-semibold text-ink">{patient.name}</p>
          <Link
            href={`/dashboard/messages?patient=${patient.id}`}
            className="shrink-0 text-sm font-medium text-brand hover:underline"
          >
            Ouvrir en plein écran
          </Link>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="shrink-0 rounded-lg p-1.5 text-muted hover:bg-app-bg hover:text-ink"
          >
            <X className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </header>

        <div className="min-h-[16rem] flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="flex h-full items-center justify-center text-muted">
              <Loader2 className="h-5 w-5 animate-spin" strokeWidth={1.75} />
            </div>
          ) : (
            <MessageThread messages={thread} mineSender="instructor" />
          )}
        </div>

        {error && <p className="mx-5 mb-3 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}

        <div className="px-5 pb-5">
          <MessageComposer key={composerKey} patientId={patient.id} action={handleSend} />
        </div>
      </div>
    </div>
  );
}
