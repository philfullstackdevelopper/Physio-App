"use client";

// =============================================================================
// ConversationList — colonne gauche de /dashboard/messages : onglets
// (Tous / Non lus / Avec suivi), recherche par nom, bouton « nouveau message »
// (patients sans échange) et la liste. Tout le filtrage est côté client sur
// les lignes déjà calculées par le serveur (buildConversations).
// =============================================================================

import { useMemo, useState } from "react";
import Link from "next/link";
import { Bookmark, SquarePen } from "lucide-react";
import { filterConversations, type ConversationRow, type ConversationTab } from "@/lib/dashboard/conversations";
import { relativeDay } from "@/lib/format/relativeDay";

const TABS: { key: ConversationTab; label: string }[] = [
  { key: "all", label: "Tous" },
  { key: "unread", label: "Non lus" },
  { key: "follow_up", label: "Avec suivi" },
];

export default function ConversationList({
  rows,
  selectedId,
  initialTab,
  query,
}: {
  rows: ConversationRow[];
  selectedId: string | null;
  initialTab: ConversationTab;
  query: string;
}) {
  const [tab, setTab] = useState<ConversationTab>(initialTab);
  const [showNew, setShowNew] = useState(false);

  const visible = useMemo(() => filterConversations(rows, tab, query), [rows, tab, query]);
  const withoutMessages = useMemo(() => rows.filter((r) => r.lastAt === null), [rows]);

  const href = (patientId: string) => `/dashboard/messages?patient=${patientId}&tab=${tab}`;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-1 border-b border-line p-3">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            aria-pressed={tab === t.key}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
              tab === t.key ? "bg-brand-soft text-brand" : "text-muted hover:text-ink"
            }`}
          >
            {t.label}
          </button>
        ))}
        <div className="relative ml-auto">
          <button
            type="button"
            onClick={() => setShowNew((v) => !v)}
            aria-label="Nouveau message"
            aria-expanded={showNew}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-brand hover:bg-brand-soft"
          >
            <SquarePen className="h-4 w-4" strokeWidth={1.75} />
          </button>
          {showNew && (
            <div className="absolute right-0 z-10 mt-1 w-64 rounded-xl border border-line bg-surface p-1 shadow-lg">
              <p className="px-3 py-2 text-xs font-medium text-muted">Écrire à un patient</p>
              {withoutMessages.length === 0 ? (
                <p className="px-3 pb-2 text-sm text-muted">Vous avez déjà échangé avec tous vos patients.</p>
              ) : (
                <ul className="max-h-64 overflow-y-auto">
                  {withoutMessages.map((r) => (
                    <li key={r.patientId}>
                      <Link
                        href={href(r.patientId)}
                        onClick={() => setShowNew(false)}
                        className="block rounded-lg px-3 py-2 text-sm text-ink hover:bg-app-bg"
                      >
                        {r.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>

      <ul className="min-h-0 flex-1 divide-y divide-line overflow-y-auto">
        {visible.length === 0 && (
          <li className="p-6 text-center text-sm text-muted">
            {rows.length === 0 ? "Aucun patient pour l'instant." : "Aucune conversation ne correspond."}
          </li>
        )}
        {visible.map((c) => {
          const active = c.patientId === selectedId;
          const preview =
            c.lastBody === null ? "Aucun message" : c.lastSender === "instructor" ? `Vous : ${c.lastBody}` : c.lastBody;
          return (
            <li key={c.patientId}>
              <Link
                href={href(c.patientId)}
                aria-current={active ? "true" : undefined}
                className={`flex items-center gap-3 px-4 py-3 transition ${active ? "bg-app-bg" : "hover:bg-app-bg"}`}
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-soft text-sm font-semibold text-brand">
                  {c.initials}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-semibold text-ink">{c.name}</span>
                    {c.followUp && <Bookmark className="h-3.5 w-3.5 shrink-0 text-brand" strokeWidth={2} aria-label="Avec suivi" />}
                  </span>
                  <span className={`block truncate text-sm ${c.unread > 0 ? "font-medium text-ink" : "text-muted"}`}>{preview}</span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-1">
                  <span className="text-xs text-muted">{c.lastAt ? relativeDay(c.lastAt) : ""}</span>
                  {c.unread > 0 && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1.5 text-[11px] font-semibold text-white">
                      {c.unread}
                    </span>
                  )}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
