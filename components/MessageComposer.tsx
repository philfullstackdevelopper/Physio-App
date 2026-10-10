"use client";

// =============================================================================
// MessageComposer — zone de saisie texte partagée par la boîte de réception
// du kiné et la page d'accueil du patient.
// =============================================================================

import { useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { ArrowUp } from "lucide-react";

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
      <ArrowUp className="h-5 w-5" strokeWidth={2.25} />
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
  /** Champs cachés supplémentaires envoyés avec le message (onglet, recherche…). */
  children?: React.ReactNode;
  /** Conservé pour les appelants existants ; la mise en page « une ligne »
   *  est désormais la seule (2026-10-10). */
  chat?: boolean;
}) {
  void chat;
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

  // Une ligne, partout (Philippe, 2026-10-10 : même messagerie sur ordinateur
  // et téléphone) : champ arrondi + bouton rond d'envoi. Avec une souris,
  // Entrée envoie et Maj+Entrée va à la ligne, comme dans une messagerie ;
  // au doigt, Entrée garde son rôle de retour à la ligne.
  return (
    <form ref={formRef} action={send} className="flex items-end gap-2">
      <input type="hidden" name="patient_id" value={patientId} />
      {children}
      <textarea
        name="body"
        rows={1}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={(e) => {
          if (e.key !== "Enter" || !canSend) return;
          const withMouse = window.matchMedia("(pointer: fine)").matches;
          if (e.metaKey || e.ctrlKey || (withMouse && !e.shiftKey)) {
            e.preventDefault();
            formRef.current?.requestSubmit();
          }
        }}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-11 min-w-0 flex-1 resize-none rounded-3xl border border-line bg-surface px-4 py-2.5 text-base leading-6 text-ink placeholder:text-muted [scrollbar-width:none] focus:border-brand focus:outline-none sm:text-sm"
      />
      <SendButton
        canSend={canSend}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand text-white shadow-md shadow-brand/30 transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
      />
    </form>
  );
}
