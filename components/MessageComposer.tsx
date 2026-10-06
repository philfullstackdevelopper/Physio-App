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
  chat = false,
}: {
  /** Dossier de stockage : l'identifiant du patient concerné par le fil. */
  patientId: string;
  action: (formData: FormData) => void | Promise<void>;
  placeholder?: string;
  /** Actions secondaires affichées à côté du bouton d'envoi (ex. suivi). */
  children?: React.ReactNode;
  /** Téléphone, page Messages du patient (maquette de Philippe, 2026-10-06) :
   *  une ligne — champ arrondi + bouton rond d'envoi à côté. Sans effet dès sm. */
  chat?: boolean;
}) {
  // Classes réservées au téléphone quand `chat` est activé.
  const c = (classes: string) => (chat ? classes : "");
  const formRef = useRef<HTMLFormElement>(null);
  const [body, setBody] = useState("");

  const canSend = body.trim().length > 0;

  return (
    <form
      ref={formRef}
      action={action}
      className={`rounded-xl border border-line bg-surface focus-within:border-brand focus-within:ring-2 focus-within:ring-brand-soft ${c(
        "max-sm:flex max-sm:items-end max-sm:gap-2 max-sm:rounded-none max-sm:border-0 max-sm:bg-transparent max-sm:focus-within:ring-0"
      )}`}
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
        className={`w-full resize-none bg-transparent px-4 pt-3 text-sm text-ink placeholder:text-muted focus:outline-none ${c(
          "max-sm:h-11 max-sm:min-w-0 max-sm:flex-1 max-sm:rounded-3xl max-sm:border max-sm:border-line max-sm:bg-surface max-sm:py-2.5 max-sm:text-base max-sm:[scrollbar-width:none] max-sm:leading-6 max-sm:focus:border-brand"
        )}`}
      />

      <div className={`flex items-center gap-4 px-4 pb-3 pt-2 ${c("max-sm:p-0")}`}>
        {children}
        <button
          type="submit"
          disabled={!canSend}
          aria-label="Envoyer"
          className={`ml-auto flex h-10 w-10 items-center justify-center rounded-full bg-brand text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-40 ${c(
            "max-sm:h-11 max-sm:w-11 max-sm:shadow-md max-sm:shadow-brand/30"
          )}`}
        >
          <SendHorizontal className="h-4 w-4" strokeWidth={2} />
        </button>
      </div>
    </form>
  );
}
