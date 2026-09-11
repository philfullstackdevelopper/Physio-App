import Link from "next/link";
import { Bookmark, BookmarkCheck, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import { buildConversations, type ConversationTab } from "@/lib/dashboard/conversations";
import ConversationList from "@/components/ConversationList";
import MessageThread, { type ThreadMessage } from "@/components/MessageThread";
import MessageComposer from "@/components/MessageComposer";
import MarkThreadRead from "@/components/MarkThreadRead";
import { markConversationRead, sendInboxMessage, toggleFollowUp } from "./actions";

const TABS: ConversationTab[] = ["all", "unread", "follow_up"];

// Boîte de réception du kiné : une conversation par patient, plein écran,
// liste à gauche (onglets, recherche, nouveau message) et fil à droite
// (séparateurs de jour, accusés de lecture, pièces jointes, suivi).
export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ patient?: string; error?: string; tab?: string; q?: string }>;
}) {
  const { patient: patientParam, error, tab: tabParam, q = "" } = await searchParams;
  const tab: ConversationTab = TABS.includes(tabParam as ConversationTab) ? (tabParam as ConversationTab) : "all";
  const supabase = await createClient();
  const user = await requireUser(supabase);

  const [{ data: patients }, { data: profiles }, { data: conditions }, { data: messages }] = await Promise.all([
    supabase.from("patients").select("id, full_name, condition_id, follow_up_at").eq("instructor_id", user.id),
    supabase.from("patient_profiles").select("id, injury_stage"),
    supabase.from("conditions").select("id, name"),
    supabase
      .from("patient_messages")
      .select("patient_id, body, created_at, sender, read_by_instructor_at")
      .eq("instructor_id", user.id)
      .order("created_at", { ascending: false })
      .limit(500),
  ]);

  const conversations = buildConversations({
    patients: patients ?? [],
    profiles: profiles ?? [],
    conditions: conditions ?? [],
    messages: messages ?? [],
  });

  const selectedId =
    patientParam && conversations.some((c) => c.patientId === patientParam)
      ? patientParam
      : (conversations[0]?.patientId ?? null);
  const selected = conversations.find((c) => c.patientId === selectedId) ?? null;

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
    <main className="flex h-screen flex-col">
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col p-6 sm:p-8 lg:min-h-0">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-ink">Messages</h1>
            <p className="mt-1 text-sm text-muted">Vos échanges avec chaque patient.</p>
          </div>
          <form method="get" action="/dashboard/messages" className="relative w-full sm:w-80">
            {selectedId && <input type="hidden" name="patient" value={selectedId} />}
            <input type="hidden" name="tab" value={tab} />
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" strokeWidth={1.75} />
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Rechercher un patient…"
              aria-label="Rechercher un patient"
              className="w-full rounded-xl border border-line bg-surface py-2.5 pl-9 pr-3 text-sm text-ink placeholder:text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-soft"
            />
          </form>
        </div>

        {error && <p className="mt-4 rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">{error}</p>}

        <div className="mt-6 grid flex-1 gap-6 lg:min-h-0 lg:grid-cols-[360px_1fr]">
          <section className="min-h-[24rem] rounded-2xl border border-line bg-surface lg:min-h-0" aria-label="Conversations">
            <ConversationList rows={conversations} selectedId={selectedId} initialTab={tab} query={q} />
          </section>

          <section className="flex min-h-[32rem] flex-col rounded-2xl border border-line bg-surface lg:min-h-0" aria-label="Fil de discussion">
            {!selected ? (
              <p className="m-auto p-6 text-center text-sm text-muted">Aucun patient pour l&apos;instant.</p>
            ) : (
              <>
                <MarkThreadRead patientId={selected.patientId} action={markConversationRead} />
                <header className="flex items-center gap-3 border-b border-line px-5 py-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-soft text-sm font-semibold text-brand">
                    {selected.initials}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-semibold text-ink">{selected.name}</p>
                    <p className="truncate text-sm text-muted">{selected.conditionLabel ?? "Condition non assignée"}</p>
                  </div>
                  <Link
                    href={`/dashboard/patients/${selected.patientId}`}
                    className="shrink-0 text-sm font-medium text-brand hover:underline"
                  >
                    Voir la fiche
                  </Link>
                </header>

                <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
                  <MessageThread messages={thread} mineSender="instructor" />
                </div>

                <div className="px-5 pb-5">
                  {/* Formulaire frère (pas imbriqué) : le bouton du composeur le cible via form="…". */}
                  <form id="follow-up-form" action={toggleFollowUp}>
                    <input type="hidden" name="patient_id" value={selected.patientId} />
                    <input type="hidden" name="follow_up" value={selected.followUp ? "0" : "1"} />
                    <input type="hidden" name="tab" value={tab} />
                  </form>
                  <MessageComposer patientId={selected.patientId} action={sendInboxMessage}>
                    <button
                      type="submit"
                      form="follow-up-form"
                      className={`inline-flex items-center gap-1.5 text-sm hover:text-ink ${selected.followUp ? "text-brand" : "text-muted"}`}
                    >
                      {selected.followUp ? (
                        <>
                          <BookmarkCheck className="h-4 w-4" strokeWidth={1.75} />
                          Retirer le suivi
                        </>
                      ) : (
                        <>
                          <Bookmark className="h-4 w-4" strokeWidth={1.75} />
                          Ajouter un suivi
                        </>
                      )}
                    </button>
                  </MessageComposer>
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
