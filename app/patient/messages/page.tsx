import { MailCheck, MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/require-user";
import { markMessageRead, sendPatientMessage } from "../actions";
import MessageThread, { type ThreadMessage } from "@/components/MessageThread";
import MessageComposer from "@/components/MessageComposer";
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
  // Jointure plusieurs-vers-un (patients → instructors) : PostgREST renvoie un
  // OBJET, pas un tableau — lu comme un tableau, le nom du kiné tombait
  // toujours sur « votre kiné » (Philippe, 2026-10-07 ; même lecture que
  // app/patient/layout.tsx).
  const instructorRow = patient?.instructors as unknown as { full_name: string | null } | null;
  const instructorFullName = instructorRow?.full_name ?? null;
  const instructorName = instructorFullName ?? "votre kiné";

  const { data: messages } = await supabase
    .from("patient_messages")
    .select("id, body, created_at, read_at, read_by_instructor_at, sender")
    .eq("patient_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);
  const rows = [...(messages ?? [])].reverse();
  // Pour mes messages (patient), « lu » = ouvert par le kiné.
  const thread: ThreadMessage[] = rows.map((m) => ({
    id: m.id as string,
    body: m.body as string,
    created_at: m.created_at as string,
    sender: m.sender as string,
    read_at: (m.read_by_instructor_at as string | null) ?? null,
  }));
  const unreadFromKine = rows.filter((m) => m.sender === "instructor" && !m.read_at).length;

  return (
    // Téléphone (maquette de Philippe, 2026-10-06) : la page EST la conversation
    // — en-tête du kiné, fil, saisie en bas — sans titre au-dessus ; pas de
    // liste de conversations (un patient n'a qu'un kiné) ni de pièces jointes
    // (retirées du produit, migration 0056).
    <main className="min-h-screen p-6 max-sm:min-h-0 max-sm:p-0 sm:p-8">
      <div className="mx-auto max-w-4xl">
        <h1 className="flex items-center gap-2 text-2xl font-semibold text-ink max-sm:hidden">
          <MessageCircle className="h-5 w-5 text-brand max-sm:hidden" strokeWidth={1.75} />
          Messages
        </h1>
        <p className="mt-1 text-sm text-muted max-sm:hidden">Échangez avec {instructorName}.</p>

        {error && <p className="mt-4 rounded-xl bg-danger-soft p-3 text-sm text-danger max-sm:m-3">{error}</p>}

        <section className="mt-6 flex h-[32rem] max-h-[70vh] flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-sm max-sm:mt-0 max-sm:h-[calc(100dvh-var(--phone-chrome))] max-sm:max-h-none max-sm:rounded-none max-sm:border-0 max-sm:bg-transparent max-sm:shadow-none">
          <header className="flex items-center gap-3 border-b border-line px-5 py-4 max-sm:bg-surface max-sm:px-4 max-sm:py-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-sm font-semibold text-brand max-sm:h-11 max-sm:w-11">
              {initials(instructorFullName)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink max-sm:text-base">{instructorName}</p>
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

          {/* Téléphone : colonne inversée = le fil s'ouvre sur le dernier message, comme une messagerie. */}
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 max-sm:flex max-sm:flex-col-reverse max-sm:px-4">
            <MessageThread
              messages={thread}
              mineSender="patient"
              emptyText={`Vous n'avez pas encore échangé de messages avec ${instructorName}. Écrivez-lui pour poser une question sur votre programme.`}
              otherInitials={initials(instructorFullName)}
            />
          </div>

          <div className="border-t border-line px-5 py-4 max-sm:bg-surface max-sm:px-3 max-sm:py-2.5">
            <MessageComposer patientId={user.id} action={sendPatientMessage} placeholder={`Écrire à ${instructorName}…`} chat />
          </div>
        </section>
      </div>
    </main>
  );
}
