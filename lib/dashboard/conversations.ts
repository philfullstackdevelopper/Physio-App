// Construit la liste des conversations affichée sur /dashboard/messages, à
// partir des patients du kiné et de ses `patient_messages` (bornées côté
// appelant à 500 lignes). Une ligne par patient, message le plus récent en
// aperçu, compteur de non-lus (messages du patient jamais ouverts).

import { initials } from "../format/initials.ts";
import { STAGE_SHORT, type InjuryStage } from "../exercise/prescription.ts";

export interface ConversationRow {
  patientId: string;
  name: string;
  initials: string;
  /** « Prothèse genou · Phase 1 », ou null si aucune condition. */
  conditionLabel: string | null;
  lastBody: string | null;
  lastAt: string | null;
  lastSender: "instructor" | "patient" | null;
  unread: number;
}

export function buildConversations(input: {
  patients: { id: string; full_name: string | null; condition_id: string | null }[];
  profiles: { id: string; injury_stage: string | null }[];
  conditions: { id: string; name: string }[];
  messages: { patient_id: string; body: string; created_at: string; sender: string; read_by_instructor_at: string | null }[];
}): ConversationRow[] {
  const conditionName = new Map(input.conditions.map((c) => [c.id, c.name]));
  const stageOf = new Map(input.profiles.map((p) => [p.id, p.injury_stage as InjuryStage | null]));

  const rows: ConversationRow[] = input.patients.map((p) => {
    const cond = p.condition_id ? (conditionName.get(p.condition_id) ?? null) : null;
    const stage = stageOf.get(p.id) ?? null;
    const conditionLabel = cond ? (stage ? `${cond} · ${STAGE_SHORT[stage]}` : cond) : null;
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
      conditionLabel,
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

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * Recherche par nom (sans accents ni casse). Ordre conservé. Les onglets
 * Tous / Non lus / Avec suivi et le signet « suivi » ont été retirés
 * (Philippe, 2026-11-06 : audit, on allège) — la colonne
 * patients.follow_up_at reste en base, plus lue.
 */
export function filterConversations(rows: ConversationRow[], query: string): ConversationRow[] {
  const q = fold(query.trim());
  return rows.filter((r) => q === "" || fold(r.name).includes(q));
}
