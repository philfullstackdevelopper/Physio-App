"use client";

// =============================================================================
// PatientMessagesButton — le bouton « Messages » de l'en-tête de la fiche
// patient. Ouvre la conversation en popup (PatientMessagesModal, la même que
// sur la liste « Mes patients ») au lieu de naviguer vers /dashboard/messages :
// Philippe (audit 2026-09-09) veut pouvoir lire/répondre puis revenir au suivi
// du patient « sans être téléporté sur une autre page ».
// =============================================================================

import { useState } from "react";
import { MessageCircle } from "lucide-react";
import PatientMessagesModal, { type MessagesModalPatient } from "@/components/PatientMessagesModal";
import type { ThreadMessage } from "@/components/MessageThread";

export default function PatientMessagesButton({
  patient,
  unreadCount,
  getThread,
  sendMessage,
}: {
  patient: MessagesModalPatient;
  unreadCount: number;
  getThread: (patientId: string) => Promise<{ thread: ThreadMessage[] } | { error: string }>;
  sendMessage: (formData: FormData) => Promise<{ ok: true } | { error: string }>;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-full border border-line px-4 py-2 text-sm font-medium text-ink hover:bg-app-bg"
      >
        <MessageCircle className="h-4 w-4" strokeWidth={1.75} />
        Messages
        {unreadCount > 0 && <span className="rounded-full bg-brand px-1.5 text-[11px] text-white">{unreadCount}</span>}
      </button>
      {open && <PatientMessagesModal patient={patient} onClose={() => setOpen(false)} getThread={getThread} sendMessage={sendMessage} />}
    </>
  );
}
