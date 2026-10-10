// Boîte de réception du kiné — l'affichage seul (app/dashboard/messages/page.tsx
// charge les données ; /prototypes/kine-telephone le rend avec des données
// fictives). Ordinateur : liste à gauche, fil à droite. Depuis le 2026-10-10
// (Philippe) la messagerie a le même rendu partout : liste « À répondre »
// d'abord (ConversationList), bulles façon messagerie (MessageThread), saisie
// sur une ligne (MessageComposer).
// Téléphone (Philippe, 2026-10-07 : mêmes règles que l'appli patient) : UN
// écran à la fois, comme une messagerie — la liste des conversations, ou,
// dès qu'un patient est choisi (?patient=…), sa conversation en plein écran
// avec une flèche de retour. Rien ne défile hors de la liste ou du fil.

import Link from "next/link";
import { ArrowLeft, Bookmark, BookmarkCheck, ChevronRight, Search } from "lucide-react";
import type { ConversationRow, ConversationTab } from "@/lib/dashboard/conversations";
import ConversationList from "@/components/ConversationList";
import MessageThread, { type ThreadMessage } from "@/components/MessageThread";
import MessageComposer from "@/components/MessageComposer";
import MarkThreadRead from "@/components/MarkThreadRead";

export default function KineMessagesView({
  conversations,
  selected,
  explicitlyOpened,
  thread,
  tab,
  q,
  error,
  markConversationRead,
  sendInboxMessage,
  toggleFollowUp,
}: {
  conversations: ConversationRow[];
  selected: ConversationRow | null;
  /** Le kiné a lui-même ouvert ce fil (?patient=…) : sur téléphone, on montre le fil plutôt que la liste. */
  explicitlyOpened: boolean;
  thread: ThreadMessage[];
  tab: ConversationTab;
  q: string;
  error?: string;
  markConversationRead: (patientId: string) => Promise<void>;
  sendInboxMessage: (formData: FormData) => void | Promise<void>;
  toggleFollowUp: (formData: FormData) => void | Promise<void>;
}) {
  const selectedId = selected?.patientId ?? null;
  // Téléphone : quel écran montrer.
  const phoneThread = explicitlyOpened && !!selected;
  // En dessous de lg (téléphone, mais aussi iPad en portrait une fois la
  // barre latérale déduite) : UN panneau à la fois — la liste, ou le fil avec
  // sa flèche de retour. Empilés, ils débordaient et faisaient défiler la
  // page (audit des formats d'écran, 2026-10-10).
  const onlyWhenList = phoneThread ? "max-lg:hidden" : "";
  const onlyWhenThread = phoneThread ? "" : "max-lg:hidden";
  const backHref = `/dashboard/messages${tab !== "all" ? `?tab=${tab}` : ""}`;

  return (
    // Téléphone, conversation ouverte : plein écran façon messagerie — la
    // barre EasyPhysio et les onglets du bas s'effacent (app/globals.css,
    // data-hide-phone-*), la flèche de retour ramène à la liste.
    <main
      data-hide-phone-topbar={phoneThread ? "" : undefined}
      data-hide-phone-tabbar={phoneThread ? "" : undefined}
      className={`flex h-dvh flex-col ${phoneThread ? "max-sm:h-dvh" : "max-sm:h-[calc(100dvh-var(--phone-chrome))]"}`}
    >
      <div className={`mx-auto flex w-full max-w-7xl min-h-0 flex-1 flex-col p-6 sm:p-8 short:sm:py-5 ${phoneThread ? "max-sm:p-0" : "max-sm:px-4 max-sm:pb-3 max-sm:pt-2"}`}>
        <div className={`flex flex-wrap items-start justify-between gap-4 max-sm:gap-3 ${onlyWhenList}`}>
          <div>
            <h1 className="text-2xl font-semibold text-ink">Messages</h1>
            <p className="mt-1 text-sm text-muted max-sm:hidden">Vos échanges avec chaque patient.</p>
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
              className="w-full rounded-xl border border-line bg-surface py-2.5 pl-9 pr-3 text-sm text-ink placeholder:text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-soft max-sm:h-10 max-sm:border-0 max-sm:py-2 max-sm:text-base max-sm:shadow-soft"
            />
          </form>
        </div>

        {error && <p className="mt-4 rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger max-sm:m-3 max-sm:mb-0">{error}</p>}

        <div
          // Largeur de la colonne des conversations : proportionnelle à l'écran,
          // bornée (300 px sur un petit portable, 380 px sur un grand écran) —
          // pour que la liste ne paraisse ni énorme ni étriquée, quel que soit
          // le PC (Philippe, 2026-10-10).
          style={{ "--conv-col": "clamp(300px, 26vw, 380px)" } as React.CSSProperties}
          className={`mt-6 grid min-h-0 flex-1 gap-6 max-lg:grid-cols-[minmax(0,1fr)] max-lg:grid-rows-[minmax(0,1fr)] lg:grid-cols-[var(--conv-col)_minmax(0,1fr)] lg:gap-4 short:sm:mt-4 ${phoneThread ? "max-sm:mt-0" : "max-sm:mt-3"}`}>
          <section
            // Téléphone : plus de grande carte blanche autour — chaque
            // conversation est sa propre carte (ConversationList).
            className={`min-h-0 rounded-2xl border border-line bg-surface max-sm:rounded-none max-sm:border-0 max-sm:bg-transparent ${onlyWhenList}`}
            aria-label="Conversations"
          >
            <ConversationList rows={conversations} selectedId={selectedId} query={q} />
          </section>

          <section
            className={`flex min-h-0 flex-col rounded-2xl border border-line bg-surface max-sm:rounded-none max-sm:border-0 max-sm:bg-transparent ${onlyWhenThread}`}
            aria-label="Fil de discussion"
          >
            {!selected ? (
              <p className="m-auto p-6 text-center text-sm text-muted">Aucun patient pour l&apos;instant.</p>
            ) : (
              <>
                {explicitlyOpened && <MarkThreadRead patientId={selected.patientId} action={markConversationRead} />}
                {/* Formulaire frère (pas imbriqué) : les boutons de suivi le ciblent via form="…". */}
                <form id="follow-up-form" action={toggleFollowUp}>
                  <input type="hidden" name="patient_id" value={selected.patientId} />
                  <input type="hidden" name="follow_up" value={selected.followUp ? "0" : "1"} />
                  <input type="hidden" name="tab" value={tab} />
                  <input type="hidden" name="q" value={q} />
                </form>
                <header className="flex items-center gap-3 border-b border-line px-5 py-3 max-sm:gap-2 max-sm:bg-surface max-sm:px-2 max-sm:pb-2.5 max-sm:pt-[calc(0.625rem+env(safe-area-inset-top))]">
                  <Link
                    href={backHref}
                    aria-label="Retour aux conversations"
                    className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink max-lg:flex"
                  >
                    <ArrowLeft className="h-5 w-5" strokeWidth={2} />
                  </Link>
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-soft text-sm font-semibold text-brand max-sm:h-10 max-sm:w-10">
                    {selected.initials}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-semibold text-ink">{selected.name}</p>
                    <p className="truncate text-sm text-muted max-sm:text-xs">{selected.conditionLabel ?? "Condition non assignée"}</p>
                  </div>
                  <button
                    type="submit"
                    form="follow-up-form"
                    aria-label={selected.followUp ? "Retirer le suivi" : "Ajouter un suivi"}
                    aria-pressed={selected.followUp}
                    title={selected.followUp ? "Retirer le suivi" : "Ajouter un suivi"}
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${selected.followUp ? "bg-brand-soft text-brand" : "text-muted hover:bg-app-bg hover:text-ink"}`}
                  >
                    {selected.followUp ? <BookmarkCheck className="h-5 w-5" strokeWidth={1.75} /> : <Bookmark className="h-5 w-5" strokeWidth={1.75} />}
                  </button>
                  <Link
                    href={`/dashboard/patients/${selected.patientId}`}
                    className="shrink-0 text-sm font-medium text-brand hover:underline max-sm:flex max-sm:h-10 max-sm:items-center max-sm:gap-0.5 max-sm:pr-2"
                  >
                    <span className="max-sm:hidden">Voir la fiche</span>
                    <span className="hidden max-sm:inline">Fiche</span>
                    <ChevronRight className="hidden h-4 w-4 max-sm:block" strokeWidth={2} />
                  </Link>
                </header>

                {/* Téléphone : colonne inversée = le fil s'ouvre sur le dernier message, comme une messagerie. */}
                <div className="flex min-h-0 flex-1 flex-col-reverse overflow-y-auto px-5 py-4 max-sm:px-3 sm:bg-app-bg/50">
                  <MessageThread messages={thread} mineSender="instructor" />
                </div>

                <div className="border-t border-line px-4 py-3 max-sm:bg-surface max-sm:px-3 max-sm:pb-[calc(0.625rem+env(safe-area-inset-bottom))] max-sm:pt-2.5 sm:rounded-b-2xl">
                  <MessageComposer patientId={selected.patientId} action={sendInboxMessage} chat>
                    {/* Onglet et recherche gardés après l'envoi (inboxUrl). */}
                    <input type="hidden" name="tab" value={tab} />
                    <input type="hidden" name="q" value={q} />
                    {/* Le suivi se règle par le signet de l'en-tête, partout. */}
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
