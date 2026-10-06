// Prototype surface — la page Messages du patient avec une conversation
// FICTIVE, pour juger l'affichage téléphone sans se connecter (Philippe,
// 2026-10-06). Mêmes composants (MessageThread, MessageComposer, PatientNav)
// et mêmes classes que app/patient/messages/page.tsx ; l'envoi ne fait rien.
// Aucune donnée réelle. Pas lié depuis l'appli.

import PatientNav from "@/components/PatientNav";
import MessageThread, { type ThreadMessage } from "@/components/MessageThread";
import MessageComposer from "@/components/MessageComposer";

export const metadata = { title: "Aperçu Messages patient", robots: { index: false } };
export const dynamic = "force-dynamic";

async function sendNothing() {
  "use server";
}

export default function MessagesPatientPrototype() {
  const at = (daysAgo: number, h: number, m: number) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    d.setHours(h, m, 0, 0);
    return d.toISOString();
  };
  const thread: ThreadMessage[] = [
    { id: "1", sender: "instructor", body: "Bonjour Léa,\n\nVoici le nouveau programme pour cette semaine. N'hésitez pas à me dire si vous avez des questions !", created_at: at(2, 9, 12), read_at: null },
    { id: "2", sender: "patient", body: "Parfait, merci ! Je le regarde tout de suite.", created_at: at(2, 9, 48), read_at: at(2, 10, 0) },
    { id: "3", sender: "instructor", body: "Comment vous sentez-vous après la séance d'hier ?", created_at: at(1, 16, 37), read_at: null },
    { id: "4", sender: "patient", body: "Très bien, un peu de courbatures mais ça va !", created_at: at(1, 17, 5), read_at: at(1, 17, 6) },
    { id: "5", sender: "instructor", body: "Parfait, c'est normal ! On garde le même rythme cette semaine.", created_at: at(1, 17, 6), read_at: null },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-app-bg text-ink max-sm:bg-phone-bg sm:flex-row">
      <PatientNav patientName="Léa Martin" unreadCount={0} pathnameOverride="/patient/messages" />
      <div className="relative min-w-0 flex-1 pb-20 max-sm:pb-[calc(5rem+env(safe-area-inset-bottom))] sm:pb-0">
        <main className="min-h-screen p-6 max-sm:min-h-0 max-sm:p-0 sm:p-8">
          <div className="mx-auto max-w-4xl">
            <h1 className="text-2xl font-semibold text-ink max-sm:hidden">Messages</h1>
            <p className="mt-1 text-sm text-muted max-sm:hidden">Échangez avec Julie Dupont.</p>
            <section className="mt-6 flex h-[32rem] max-h-[70vh] flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-sm max-sm:mt-0 max-sm:h-[calc(100dvh-var(--phone-chrome))] max-sm:max-h-none max-sm:rounded-none max-sm:border-0 max-sm:bg-transparent max-sm:shadow-none">
              <header className="flex items-center gap-3 border-b border-line px-5 py-4 max-sm:bg-surface max-sm:px-4 max-sm:py-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-sm font-semibold text-brand max-sm:h-11 max-sm:w-11">
                  JD
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink max-sm:text-base">Julie Dupont</p>
                  <p className="text-xs text-muted">Votre kinésithérapeute</p>
                </div>
              </header>
              {/* Téléphone : colonne inversée = le fil s'ouvre sur le dernier message, comme une messagerie. */}
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 max-sm:flex max-sm:flex-col-reverse max-sm:px-4">
                <MessageThread messages={thread} mineSender="patient" otherInitials="JD" />
              </div>
              <div className="border-t border-line px-5 py-4 max-sm:bg-surface max-sm:px-3 max-sm:py-2.5">
                <MessageComposer patientId="demo" action={sendNothing} placeholder="Écrire à Julie Dupont…" chat />
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
