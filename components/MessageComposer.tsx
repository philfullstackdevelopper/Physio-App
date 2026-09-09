"use client";

// =============================================================================
// MessageComposer — zone de saisie partagée par la boîte de réception du kiné
// et la page d'accueil du patient. Le fichier joint part DIRECTEMENT dans le
// bucket privé `message-attachments` (sous le dossier du patient, ce que la
// RLS du stockage impose), puis l'action serveur ne reçoit que son chemin.
// =============================================================================

import { useRef, useState } from "react";
import { Paperclip, SendHorizontal, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ATTACHMENT_BUCKET, ATTACHMENT_MAX_MB, attachmentPath } from "@/lib/messages/attachment";

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
  /** Actions secondaires affichées à côté de « Joindre un fichier » (ex. suivi). */
  children?: React.ReactNode;
}) {
  const supabase = createClient();
  const formRef = useRef<HTMLFormElement>(null);
  const [attachment, setAttachment] = useState<{ path: string; name: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [body, setBody] = useState("");

  const upload = async (file: File) => {
    setError(null);
    if (file.size > ATTACHMENT_MAX_MB * 1024 * 1024) {
      setError(`Fichier trop volumineux (max ${ATTACHMENT_MAX_MB} Mo).`);
      return;
    }
    setBusy(true);
    try {
      const path = attachmentPath(patientId, file.name);
      const { error: upErr } = await supabase.storage.from(ATTACHMENT_BUCKET).upload(path, file);
      if (upErr) throw upErr;
      setAttachment({ path, name: file.name });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Échec de l'envoi du fichier.");
    } finally {
      setBusy(false);
    }
  };

  const removeAttachment = async () => {
    if (!attachment) return;
    const { path } = attachment;
    setAttachment(null);
    await supabase.storage.from(ATTACHMENT_BUCKET).remove([path]);
  };

  const canSend = !busy && (body.trim().length > 0 || attachment !== null);

  return (
    <form
      ref={formRef}
      action={action}
      className="rounded-xl border border-line bg-surface focus-within:border-brand focus-within:ring-2 focus-within:ring-brand-soft"
    >
      <input type="hidden" name="patient_id" value={patientId} />
      <input type="hidden" name="attachment_path" value={attachment?.path ?? ""} />
      <input type="hidden" name="attachment_name" value={attachment?.name ?? ""} />

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

      {attachment && (
        <div className="mx-4 mb-2 inline-flex max-w-full items-center gap-1.5 rounded-lg bg-brand-soft px-2.5 py-1 text-xs font-medium text-brand">
          <Paperclip className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
          <span className="truncate">{attachment.name}</span>
          <button type="button" onClick={removeAttachment} aria-label="Retirer la pièce jointe" className="ml-1 hover:text-brand-dark">
            <X className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        </div>
      )}
      {error && (
        <p role="alert" className="mx-4 mb-2 text-xs text-danger">
          {error}
        </p>
      )}

      <div className="flex items-center gap-4 px-4 pb-3">
        <label className="inline-flex cursor-pointer items-center gap-1.5 text-sm text-muted hover:text-ink">
          <Paperclip className="h-4 w-4" strokeWidth={1.75} />
          {busy ? "Envoi…" : "Joindre un fichier"}
          <input
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            disabled={busy}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) upload(f);
              e.target.value = "";
            }}
          />
        </label>
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
