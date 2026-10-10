import { createClient } from "@/lib/supabase/server";
import { buildConversations, type ConversationTab } from "@/lib/dashboard/conversations";
import KineMessagesView from "@/components/KineMessagesView";
import type { ThreadMessage } from "@/components/MessageThread";
import { markConversationRead, sendInboxMessage, toggleFollowUp } from "./actions";
import { requireApprovedInstructor } from "@/lib/dashboard/requireApprovedInstructor";

const TABS: ConversationTab[] = ["all", "unread", "follow_up"];

// Boîte de réception du kiné : une conversation par patient, plein écran,
// liste à gauche (onglets, recherche, nouveau message) et fil à droite
// (séparateurs de jour, accusés de lecture, suivi). Affichage : KineMessagesView.
export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ patient?: string; error?: string; tab?: string; q?: string }>;
}) {
  const { patient: patientParam, error, tab: tabParam, q = "" } = await searchParams;
  const tab: ConversationTab = TABS.includes(tabParam as ConversationTab) ? (tabParam as ConversationTab) : "all";
  const supabase = await createClient();
  // Validation du compte vérifiée ICI aussi (audit du 2026-10-08) : le
  // layout ne se ré-exécute pas à chaque navigation (doc Next.js 16).
  const { user } = await requireApprovedInstructor(supabase);

  const [{ data: patients }, { data: profiles }, { data: conditions }, { data: messages }, { data: unreadMessages }] = await Promise.all([
    supabase.from("patients").select("id, full_name, condition_id, follow_up_at").eq("instructor_id", user.id),
    supabase.from("patient_profiles").select("id, injury_stage"),
    supabase.from("conditions").select("id, name"),
    supabase
      .from("patient_messages")
      .select("id, patient_id, body, created_at, sender, read_by_instructor_at")
      .eq("instructor_id", user.id)
      .order("created_at", { ascending: false })
      .limit(500),
    // Les non-lus à part, sans limite (audit du 2026-10-08) : au-delà des 500
    // derniers messages, une vieille conversation non lue disparaissait de la
    // liste alors que le badge la comptait encore.
    supabase
      .from("patient_messages")
      .select("id, patient_id, body, created_at, sender, read_by_instructor_at")
      .eq("instructor_id", user.id)
      .eq("sender", "patient")
      .is("read_by_instructor_at", null),
  ]);
  const recentIds = new Set((messages ?? []).map((m) => m.id as string));
  const allMessages = [...(messages ?? []), ...(unreadMessages ?? []).filter((m) => !recentIds.has(m.id as string))];

  const conversations = buildConversations({
    patients: patients ?? [],
    profiles: profiles ?? [],
    conditions: conditions ?? [],
    messages: allMessages,
  });

  const selectedId =
    patientParam && conversations.some((c) => c.patientId === patientParam)
      ? patientParam
      : (conversations[0]?.patientId ?? null);
  const selected = conversations.find((c) => c.patientId === selectedId) ?? null;
  // Sans ?patient=, la première conversation s'affiche par défaut, mais le
  // kiné ne l'a pas ouverte lui-même : on ne la marque donc PAS comme lue —
  // sinon ses messages non lus disparaissaient du badge sans avoir été vus
  // (Philippe, 2026-10-07).
  const explicitlyOpened = !!selected && patientParam === selected.patientId;

  let thread: ThreadMessage[] = [];
  if (selectedId) {
    const { data } = await supabase
      .from("patient_messages")
      .select("id, body, created_at, sender, read_at, read_by_instructor_at")
      .eq("instructor_id", user.id)
      .eq("patient_id", selectedId)
      .order("created_at", { ascending: false })
      .limit(50);
    const rows = [...(data ?? [])].reverse();

    thread = rows.map((m) => ({
      id: m.id as string,
      body: m.body as string,
      created_at: m.created_at as string,
      sender: m.sender as string,
      // Pour mes messages, « lu » = lu par le patient (read_at).
      read_at: (m.read_at as string | null) ?? null,
    }));
  }

  return (
    <KineMessagesView
      conversations={conversations}
      selected={selected}
      explicitlyOpened={explicitlyOpened}
      thread={thread}
      tab={tab}
      q={q}
      error={error}
      markConversationRead={markConversationRead}
      sendInboxMessage={sendInboxMessage}
      toggleFollowUp={toggleFollowUp}
    />
  );
}
