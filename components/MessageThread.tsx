// =============================================================================
// MessageThread — fil de messages avec séparateurs de jour et accusés de
// lecture. Composant serveur. `mineSender` dit quel côté est « moi » (bulles
// bleues).
// =============================================================================

import { Check, CheckCheck, MessageCircle } from "lucide-react";
import { groupByDay } from "@/lib/dashboard/messageDays";

export interface ThreadMessage {
  id: string;
  body: string;
  created_at: string;
  sender: string;
  read_at: string | null;
}

const TIME = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" });

export default function MessageThread({
  messages,
  mineSender,
  emptyText = "Aucun message pour l'instant. Écrivez le premier !",
  otherInitials,
}: {
  messages: ThreadMessage[];
  mineSender: "instructor" | "patient";
  emptyText?: string;
  /** Style « messagerie » sur téléphone (page Messages du patient, maquette
   *  de Philippe, 2026-10-06) : pastille d'initiales à côté des bulles de
   *  l'autre, date en pastille, heure sous la bulle. Sans effet dès sm. Repris
   *  sur la boîte de réception du kiné au téléphone (2026-10-07). */
  otherInitials?: string;
}) {
  const chat = otherInitials !== undefined;
  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-14 text-center">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-app-bg">
          <MessageCircle className="h-5 w-5 text-muted" strokeWidth={1.5} />
        </span>
        <p className="max-w-[22rem] text-sm text-muted">{emptyText}</p>
      </div>
    );
  }
  const groups = groupByDay(messages);
  return (
    <ol className="flex flex-col gap-3">
      {groups.map((g) => (
        <li key={g.key}>
          <div className="my-2 flex items-center gap-3">
            <span className={`h-px flex-1 bg-line ${chat ? "max-sm:hidden" : ""}`} />
            <span
              className={`text-xs font-medium text-muted ${chat ? "max-sm:mx-auto max-sm:rounded-full max-sm:bg-surface max-sm:px-3 max-sm:py-1 max-sm:shadow-soft" : ""}`}
            >
              {g.label}
            </span>
            <span className={`h-px flex-1 bg-line ${chat ? "max-sm:hidden" : ""}`} />
          </div>
          <ol className="flex flex-col gap-3">
            {g.items.map((m) => {
              const mine = m.sender === mineSender;
              const time = TIME.format(new Date(m.created_at));
              const tick = mine ? (
                m.read_at ? (
                  <CheckCheck className="h-3.5 w-3.5" strokeWidth={2} aria-label="Lu" />
                ) : (
                  <Check className="h-3.5 w-3.5" strokeWidth={2} aria-label="Envoyé" />
                )
              ) : null;
              return (
                <li key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"} ${chat ? "max-sm:items-start max-sm:gap-2" : ""}`}>
                  {chat && !mine && (
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[11px] font-semibold text-brand sm:hidden">
                      {otherInitials}
                    </span>
                  )}
                  <div className={`max-w-[85%] sm:max-w-[70%] ${chat ? "max-sm:max-w-[78%]" : ""}`}>
                    <div
                      className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                        mine ? "rounded-br-md bg-brand text-white" : "rounded-bl-md border border-line bg-app-bg text-ink"
                      } ${chat && !mine ? "max-sm:rounded-tl-md max-sm:rounded-bl-2xl max-sm:border-0 max-sm:bg-surface max-sm:shadow-soft" : ""} ${
                        chat && mine ? "max-sm:shadow-soft" : ""
                      }`}
                    >
                      {m.body && <p className="whitespace-pre-wrap break-words">{m.body}</p>}
                      <p
                        className={`mt-1 flex items-center justify-end gap-1 text-[11px] ${mine ? "text-white/70" : "text-muted"} ${chat ? "max-sm:hidden" : ""}`}
                      >
                        {time}
                        {tick}
                      </p>
                    </div>
                    {chat && (
                      <p className={`mt-1 flex items-center gap-1 px-1 text-[11px] text-muted sm:hidden ${mine ? "justify-end" : ""}`}>
                        {time}
                        {mine && <span className={m.read_at ? "text-brand" : ""}>{tick}</span>}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </li>
      ))}
    </ol>
  );
}
