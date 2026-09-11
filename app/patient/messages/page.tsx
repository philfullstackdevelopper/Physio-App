import { MailCheck, MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import { markMessageRead, sendPatientMessage } from "../actions";
import MessageThread, { type ThreadMessage } from "@/components/MessageThread";
import MessageComposer from "@/components/MessageComposer";
import { ATTACHMENT_BUCKET } from "@/lib/messages/attachment";
import { initials } from "@/lib/format/initials";

// Full-page version of the thread that used to live inline on the home page
// (moved here, 2026-09-05, as its own nav destination — same data, same
// actions, just given room to breathe).
//
// UI/UX pass, 2026-09-09 (retour d'audit du kiné) : le fil vit maintenant
// dans une seule carte façon appli de messagerie (en-tête avec l'interlocuteur,
// fil scrollable, saisie fixée en bas) au lieu d'un simple bloc de texte + lien
// discret pour marquer comme lu ; l'état vide et les bulles gagnent en lisibilité
// dans MessageThread (partagé avec le kiné, donc touché avec prudence).
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
  const instructorFullName = instructorRow?.[0]?.full_name ?? null;
  const instructorName = instructorFullName ?? "votre kiné";

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
      <div className="mx-auto max-w-4xl">
        <h1 className="flex items-center gap-2 text-2xl font-semibold text-ink">
          <MessageCircle className="h-5 w-5 text-brand" strokeWidth={1.75} />
          Messages
        </h1>
        <p className="mt-1 text-sm text-muted">Échangez avec {instructorName}.</p>

        {error && <p className="mt-4 rounded-xl bg-danger-soft p-3 text-sm text-danger">{error}</p>}

        <section className="mt-6 flex h-[32rem] max-h-[70vh] flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
          <header className="flex items-center gap-3 border-b border-line px-5 py-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-sm font-semibold text-brand">
              {initials(instructorFullName)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink">{instructorName}</p>
              <p className="text-xs text-muted">Votre kinésithérapeute</p>
            </div>
          </header>

          {unreadFromKine > 0 && (
            <form
              action={markMessageRead}
              className="flex items-center justify-between gap-3 border-b border-line bg-brand-soft px-5 py-2.5"
            >
              <p className="flex items-center gap-2 text-sm text-brand">
                <MailCheck className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                {unreadFromKine} nouveau{unreadFromKine > 1 ? "x" : ""} message{unreadFromKine > 1 ? "s" : ""} de {instructorName}
              </p>
              <button type="submit" className="shrink-0 text-sm font-medium text-brand hover:underline">
                Marquer comme lu
              </button>
            </form>
          )}

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            <MessageThread
              messages={thread}
              mineSender="patient"
              emptyText={`Vous n'avez pas encore échangé de messages avec ${instructorName}. Écrivez-lui pour poser une question sur votre programme.`}
            />
          </div>

          <div className="border-t border-line px-5 py-4">
            <MessageComposer patientId={user.id} action={sendPatientMessage} placeholder={`Écrire à ${instructorName}…`} />
          </div>
        </section>
      </div>
    </main>
  );
}
