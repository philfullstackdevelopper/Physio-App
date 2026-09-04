// Construit la liste des conversations affichée sur /dashboard/messages, à
// partir des patients du kiné et de ses `patient_messages` (bornées côté
// appelant à 500 lignes). Une ligne par patient, message le plus récent en
// aperçu, compteur de non-lus (messages du patient jamais ouverts).

import { initials } from "../format/initials.ts";

export interface ConversationRow {
  patientId: string;
  name: string;
  initials: string;
  lastBody: string | null;
  lastAt: string | null;
  lastSender: "instructor" | "patient" | null;
  unread: number;
}

export function buildConversations(input: {
  patients: { id: string; full_name: string | null }[];
  messages: { patient_id: string; body: string; created_at: string; sender: string; read_by_instructor_at: string | null }[];
}): ConversationRow[] {
  const rows: ConversationRow[] = input.patients.map((p) => {
    const own = input.messages.filter((m) => m.patient_id === p.id);
    const last = own.reduce<(typeof own)[number] | null>(
      (best, m) => (!best || m.created_at > best.created_at ? m : best),
      null,
    );
    const unread = own.filter((m) => m.sender === "patient" && m.read_by_instructor_at === null).length;
    return {
      patientId: p.id,
      name: p.full_name ?? "Patient",
      initials: initials(p.full_name),
      lastBody: last?.body ?? null,
      lastAt: last?.created_at ?? null,
      lastSender: (last?.sender as "instructor" | "patient" | undefined) ?? null,
      unread,
    };
  });

  return rows.sort((a, b) => {
    if (a.lastAt && b.lastAt) return a.lastAt > b.lastAt ? -1 : 1;
    if (a.lastAt) return -1;
    if (b.lastAt) return 1;
    return a.name.localeCompare(b.name, "fr");
  });
}
