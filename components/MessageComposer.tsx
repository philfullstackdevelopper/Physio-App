"use client";

// =============================================================================
// MessageComposer — zone de saisie texte partagée par la boîte de réception
// du kiné et la page d'accueil du patient.
// =============================================================================

import { useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { SendHorizontal } from "lucide-react";

/** Une action serveur qui appelle redirect() fait rejeter sa promesse côté
 *  client avec une erreur « NEXT_REDIRECT;type;url;… » (gérée ensuite par
 *  Next). On lit l'URL cible pour savoir si l'envoi a réussi. */
function redirectTarget(e: unknown): string | null {
  if (typeof e !== "object" || e === null || !("digest" in e)) return null;
  const digest = String((e as { digest: unknown }).digest);
  if (!digest.startsWith("NEXT_REDIRECT")) return null;
  return digest.split(";")[2] ?? "";
}

/** Bouton d'envoi : désactivé pendant l'envoi (useFormStatus doit vivre dans
 *  un enfant du <form>) — un double appui envoyait deux fois le message. */
function SendButton({ canSend, className }: { canSend: boolean; className: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={!canSend || pending} aria-label={pending ? "Envoi en cours" : "Envoyer"} className={className}>
      <SendHorizontal className="h-4 w-4" strokeWidth={2} />
    </button>
  );
}

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

  // Garde contre la ré-entrée (Ctrl+Entrée ou double appui pendant l'envoi).
  const sendingRef = useRef(false);

  const canSend = body.trim().length > 0;

  // Enveloppe l'action pour vider le champ une fois le message parti — le
  // texte restait affiché après l'envoi (Philippe, 2026-10-07). Les actions
  // serveur du patient et du kiné finissent par redirect() : on ne vide que si
  // la redirection ne porte pas d'erreur (?error=…), pour ne pas perdre un
  // message non envoyé. Une action qui se termine sans redirection (la modale
  // du kiné) gère déjà elle-même la remise à zéro (remontage via `key`).
  const send = async (formData: FormData) => {
    if (sendingRef.current) return;
    sendingRef.current = true;
    try {
      await action(formData);
    } catch (e) {
      const target = redirectTarget(e);
      if (target !== null && !/[?&]error=/.test(target)) setBody("");
      throw e;
    } finally {
      sendingRef.current = false;
    }
  };

  return (
    <form
      ref={formRef}
      action={send}
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
        <SendButton
          canSend={canSend}
          className={`ml-auto flex h-10 w-10 items-center justify-center rounded-full bg-brand text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-40 ${c(
            "max-sm:h-11 max-sm:w-11 max-sm:shadow-md max-sm:shadow-brand/30"
          )}`}
        />
      </div>
    </form>
  );
}
