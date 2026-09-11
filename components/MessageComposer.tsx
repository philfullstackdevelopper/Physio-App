"use client";

// =============================================================================
// MessageComposer — zone de saisie texte partagée par la boîte de réception
// du kiné et la page d'accueil du patient.
// =============================================================================

import { useRef, useState } from "react";
import { SendHorizontal } from "lucide-react";

export default function MessageComposer({
  patientId,
  action,
  placeholder = "Écrire un message…",
  children,
}: {
  /** Dossier de stockage : l'identifiant du patient concerné par le fil. */
  patientId: string;
  action: (formData: FormData) => void | Promise<void>;
  placeholder?: string;
  /** Actions secondaires affichées à côté du bouton d'envoi (ex. suivi). */
  children?: React.ReactNode;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [body, setBody] = useState("");

  const canSend = body.trim().length > 0;

  return (
    <form
      ref={formRef}
      action={action}
      className="rounded-xl border border-line bg-surface focus-within:border-brand focus-within:ring-2 focus-within:ring-brand-soft"
    >
      <input type="hidden" name="patient_id" value={patientId} />

      <textarea
        name="body"
        rows={3}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && canSend) formRef.current?.requestSubmit();
        }}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-full resize-none bg-transparent px-4 pt-3 text-sm text-ink placeholder:text-muted focus:outline-none"
      />

      <div className="flex items-center gap-4 px-4 pb-3 pt-2">
        {children}
        <button
          type="submit"
          disabled={!canSend}
          aria-label="Envoyer"
          className="ml-auto flex h-10 w-10 items-center justify-center rounded-full bg-brand text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-40"
        >
          <SendHorizontal className="h-4 w-4" strokeWidth={2} />
        </button>
      </div>
    </form>
  );
}
