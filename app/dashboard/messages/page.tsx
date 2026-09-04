import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import { buildConversations } from "@/lib/dashboard/conversations";
import { relativeDay } from "@/lib/format/relativeDay";
import { sendInboxMessage } from "./actions";

// Boîte de réception du kiné : une conversation par patient. Remplace le fil
// de messages qui vivait auparavant sur la fiche patient (Task 14d).
export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ patient?: string; error?: string }>;
}) {
  const { patient: patientParam, error } = await searchParams;
  const supabase = await createClient();
  const user = await requireUser(supabase);

  const [{ data: patients }, { data: messages }] = await Promise.all([
    supabase.from("patients").select("id, full_name").eq("instructor_id", user.id),
    supabase
      .from("patient_messages")
      .select("patient_id, body, created_at, sender, read_by_instructor_at")
      .eq("instructor_id", user.id)
      .order("created_at", { ascending: false })
      .limit(500),
  ]);

  const conversations = buildConversations({
    patients: patients ?? [],
    messages: messages ?? [],
  });

  const selectedId =
    patientParam && conversations.some((c) => c.patientId === patientParam)
      ? patientParam
      : (conversations[0]?.patientId ?? null);
  const selected = conversations.find((c) => c.patientId === selectedId) ?? null;

  let thread: { id: string; body: string; created_at: string; sender: string }[] = [];
  if (selectedId) {
    const { data } = await supabase
      .from("patient_messages")
      .select("id, body, created_at, sender")
      .eq("instructor_id", user.id)
      .eq("patient_id", selectedId)
      .order("created_at", { ascending: false })
      .limit(50);
    thread = [...(data ?? [])].reverse();

    await supabase
      .from("patient_messages")
      .update({ read_by_instructor_at: new Date().toISOString() })
      .eq("instructor_id", user.id)
      .eq("patient_id", selectedId)
      .eq("sender", "patient")
      .is("read_by_instructor_at", null);
  }

  const inputClass =
    "rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-soft";

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-5xl p-6 sm:p-8">
        <h1 className="text-2xl font-semibold text-ink">Messages</h1>
        <p className="mt-1 text-sm text-muted">Vos échanges avec chaque patient.</p>

        {error && <p className="mt-4 rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">{error}</p>}

        <div className="mt-6 grid gap-6 lg:grid-cols-[320px_1fr]">
          <div className="rounded-xl border border-line bg-surface divide-y divide-line">
            {conversations.length === 0 && (
              <p className="p-6 text-center text-sm text-muted">Aucun patient pour l&apos;instant.</p>
            )}
            {conversations.map((c) => {
              const active = c.patientId === selectedId;
              const preview =
                c.lastBody === null
                  ? "Aucun message"
                  : c.lastSender === "instructor"
                    ? `Vous : ${c.lastBody}`
                    : c.lastBody;
              return (
                <Link
                  key={c.patientId}
                  href={`/dashboard/messages?patient=${c.patientId}`}
                  className={`flex items-center gap-3 px-3 py-2.5 ${active ? "bg-app-bg" : "hover:bg-app-bg"}`}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand">
                    {c.initials}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-ink">{c.name}</span>
                    <span className="block truncate text-xs text-muted">{preview}</span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1">
                    <span className="text-xs text-muted">{relativeDay(c.lastAt)}</span>
                    {c.unread > 0 && (
                      <span className="rounded-full bg-brand px-1.5 text-[11px] text-white">{c.unread}</span>
                    )}
                  </span>
                </Link>
              );
            })}
          </div>

          <div className="rounded-xl border border-line bg-surface p-5">
            {!selected ? (
              <p className="text-center text-sm text-muted">Aucun patient pour l&apos;instant.</p>
            ) : (
              <>
                <div className="flex items-center gap-3 border-b border-line pb-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand">
                    {selected.initials}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">{selected.name}</span>
                  <Link
                    href={`/dashboard/patients/${selected.patientId}`}
                    className="shrink-0 text-xs font-medium text-brand hover:underline"
                  >
                    Voir la fiche
                  </Link>
                </div>

                {thread.length > 0 && (
                  <ul className="mt-3 flex max-h-96 flex-col gap-2 overflow-y-auto">
                    {thread.map((m) => {
                      const mine = m.sender === "instructor";
                      return (
                        <li key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                          <div
                            className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                              mine ? "rounded-br-md bg-brand text-white" : "rounded-bl-md bg-app-bg text-ink"
                            }`}
                          >
                            <p>{m.body}</p>
                            <p className={`mt-0.5 text-xs ${mine ? "text-white/70" : "text-muted"}`}>
                              {new Date(m.created_at).toLocaleString("fr-FR")}
                            </p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}

                <form action={sendInboxMessage} className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <input type="hidden" name="patient_id" value={selected.patientId} />
                  <textarea
                    name="body"
                    required
                    rows={2}
                    placeholder="Écrire un message…"
                    className={`flex-1 ${inputClass}`}
                  />
                  <button
                    type="submit"
                    className="self-end rounded-full bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark sm:self-auto"
                  >
                    Envoyer
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
