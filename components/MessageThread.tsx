// =============================================================================
// MessageThread — fil de messages façon messagerie (iMessage / WhatsApp),
// partout : ordinateur et téléphone, côté kiné et côté patient (Philippe,
// 2026-10-10, option A). Composant serveur. `mineSender` dit quel côté est
// « moi » (bulles bleues, à droite).
//
// - Bulles compactes ; les messages d'une même personne envoyés à la suite
//   sont regroupés (coin « queue » sur le dernier seulement).
// - L'heure une fois par groupe, au centre, précédée du jour au premier
//   message de la journée.
// - « Lu » / « Envoyé » uniquement sous mon dernier message.
// - Pas de pastille d'initiales à chaque bulle : à deux, on sait qui parle.
// =============================================================================

import { MessageCircle } from "lucide-react";
import { groupByDay } from "@/lib/dashboard/messageDays";

export interface ThreadMessage {
  id: string;
  body: string;
  created_at: string;
  sender: string;
  read_at: string | null;
}

const TIME = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" });
/** Au-delà de ce délai entre deux messages, on rouvre un groupe (et on réaffiche l'heure). */
const RUN_GAP_MS = 30 * 60 * 1000;

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
  const lastMineId = [...messages].reverse().find((m) => m.sender === mineSender)?.id;

  return (
    <ol className="flex flex-col">
      {groups.map((g) =>
        g.items.map((m, i) => {
          const prev = g.items[i - 1];
          const next = g.items[i + 1];
          const at = new Date(m.created_at).getTime();
          const afterPause = !prev || at - new Date(prev.created_at).getTime() > RUN_GAP_MS;
          const newRun = afterPause || prev.sender !== m.sender;
          const endsRun = !next || next.sender !== m.sender || new Date(next.created_at).getTime() - at > RUN_GAP_MS;
          const mine = m.sender === mineSender;
          const time = TIME.format(new Date(m.created_at));
          return (
            <li key={m.id} className={`flex flex-col ${mine ? "items-end" : "items-start"} ${newRun ? "mt-2.5" : "mt-0.5"}`}>
              {afterPause && (
                <p className="mb-2 mt-1.5 w-full text-center text-[11px] font-medium text-muted">
                  {i === 0 ? `${g.label} · ${time}` : time}
                </p>
              )}
              <p
                className={`max-w-[80%] whitespace-pre-wrap break-words rounded-[18px] px-3 py-2 text-[15px] leading-snug sm:max-w-[65%] sm:px-3.5 sm:text-sm sm:leading-relaxed ${
                  mine ? "bg-brand text-white" : "border border-line bg-surface text-ink"
                } ${endsRun ? (mine ? "rounded-br-[5px]" : "rounded-bl-[5px]") : ""}`}
              >
                {m.body}
              </p>
              {m.id === lastMineId && <p className="mt-0.5 pr-1 text-[11px] text-muted">{m.read_at ? "Lu" : "Envoyé"}</p>}
            </li>
          );
        }),
      )}
    </ol>
  );
}
