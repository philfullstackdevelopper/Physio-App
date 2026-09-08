import { MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import { markMessageRead, sendPatientMessage } from "../actions";
import MessageThread, { type ThreadMessage } from "@/components/MessageThread";
import MessageComposer from "@/components/MessageComposer";
import { ATTACHMENT_BUCKET } from "@/lib/messages/attachment";

// Full-page version of the thread that used to live inline on the home page
// (moved here, 2026-09-05, as its own nav destination — same data, same
// actions, just given room to breathe).
export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const user = await requireUser(supabase);

  const { data: patient } = await supabase.from("patients").select("instructors ( full_name )").eq("id", user.id).maybeSingle();
  const instructorRow = patient?.instructors as { full_name: string | null }[] | null;
  const instructorName = instructorRow?.[0]?.full_name ?? "votre kiné";

  const { data: messages } = await supabase
    .from("patient_messages")
    .select("id, body, created_at, read_at, read_by_instructor_at, sender, attachment_path, attachment_name")
    .eq("patient_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);
  const rows = [...(messages ?? [])].reverse();
  const paths = rows.map((m) => m.attachment_path as string | null).filter((p): p is string => !!p);
  const signed = new Map<string, string>();
  if (paths.length > 0) {
    const { data: urls } = await supabase.storage.from(ATTACHMENT_BUCKET).createSignedUrls(paths, 3600);
    for (const u of urls ?? []) if (u.path && u.signedUrl) signed.set(u.path, u.signedUrl);
  }
  // Pour mes messages (patient), « lu » = ouvert par le kiné.
  const thread: ThreadMessage[] = rows.map((m) => ({
    id: m.id as string,
    body: m.body as string,
    created_at: m.created_at as string,
    sender: m.sender as string,
    read_at: (m.read_by_instructor_at as string | null) ?? null,
    attachment_name: (m.attachment_name as string | null) ?? null,
    attachmentUrl: m.attachment_path ? (signed.get(m.attachment_path as string) ?? null) : null,
  }));
  const unreadFromKine = rows.filter((m) => m.sender === "instructor" && !m.read_at).length;

  return (
    <main className="min-h-screen p-6 sm:p-8">
      <div className="mx-auto max-w-2xl">
        <h1 className="flex items-center gap-2 text-2xl font-semibold text-ink">
          <MessageCircle className="h-5 w-5 text-brand" strokeWidth={1.75} />
          Messages
        </h1>
        <p className="mt-1 text-sm text-muted">Échangez avec {instructorName}.</p>

        {error && <p className="mt-4 rounded-xl bg-danger-soft p-3 text-sm text-danger">{error}</p>}

        <section className="mt-6 rounded-2xl border border-line bg-surface p-5 shadow-sm">
          <div className="max-h-[32rem] overflow-y-auto">
            <MessageThread messages={thread} mineSender="patient" emptyText="Aucun message pour l'instant." />
          </div>
          {unreadFromKine > 0 && (
            <form action={markMessageRead} className="mt-2 text-right">
              <button type="submit" className="text-xs font-medium text-brand hover:underline">
                Marquer comme lu
              </button>
            </form>
          )}
          <div className="mt-3">
            <MessageComposer patientId={user.id} action={sendPatientMessage} />
          </div>
        </section>
      </div>
    </main>
  );
}
