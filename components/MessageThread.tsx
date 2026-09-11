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
}: {
  messages: ThreadMessage[];
  mineSender: "instructor" | "patient";
  emptyText?: string;
}) {
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
            <span className="h-px flex-1 bg-line" />
            <span className="text-xs font-medium text-muted">{g.label}</span>
            <span className="h-px flex-1 bg-line" />
          </div>
          <ol className="flex flex-col gap-3">
            {g.items.map((m) => {
              const mine = m.sender === mineSender;
              return (
                <li key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed sm:max-w-[70%] ${
                      mine ? "rounded-br-md bg-brand text-white" : "rounded-bl-md border border-line bg-app-bg text-ink"
                    }`}
                  >
                    {m.body && <p className="whitespace-pre-wrap break-words">{m.body}</p>}
                    <p className={`mt-1 flex items-center justify-end gap-1 text-[11px] ${mine ? "text-white/70" : "text-muted"}`}>
                      {TIME.format(new Date(m.created_at))}
                      {mine &&
                        (m.read_at ? (
                          <CheckCheck className="h-3.5 w-3.5" strokeWidth={2} aria-label="Lu" />
                        ) : (
                          <Check className="h-3.5 w-3.5" strokeWidth={2} aria-label="Envoyé" />
                        ))}
                    </p>
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
