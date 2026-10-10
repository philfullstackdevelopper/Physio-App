"use client";

// =============================================================================
// ConversationList — la liste des conversations du kiné (/dashboard/messages),
// identique sur ordinateur et téléphone (Philippe, 2026-10-10, option 2) :
//  - « À répondre » d'abord : les patients dont un message attend, sur fond
//    bleu clair ;
//  - puis « Conversations » : les autres échanges, du plus récent au plus ancien.
// Plus d'onglets Tous / Non lus / Avec suivi : le premier groupe EST le filtre
// utile ; le suivi reste visible par son signet sur la ligne.
// Les patients sans aucun échange n'encombrent plus la liste : on leur écrit
// par le crayon « Nouveau message ».
// Le filtrage (recherche par nom) se fait côté client sur les lignes déjà
// calculées par le serveur (buildConversations).
// =============================================================================

import { useMemo, useState } from "react";
import Link from "next/link";
import { Bookmark, SquarePen } from "lucide-react";
import { filterConversations, type ConversationRow } from "@/lib/dashboard/conversations";
import { relativeDay } from "@/lib/format/relativeDay";

export default function ConversationList({
  rows,
  selectedId,
  query,
}: {
  rows: ConversationRow[];
  selectedId: string | null;
  query: string;
}) {
  const [showNew, setShowNew] = useState(false);

  const withMessages = useMemo(() => filterConversations(rows, "all", query).filter((c) => c.lastBody !== null), [rows, query]);
  const toReply = withMessages.filter((c) => c.unread > 0);
  const others = withMessages.filter((c) => c.unread === 0);
  const allPatients = useMemo(() => [...rows].sort((a, b) => a.name.localeCompare(b.name, "fr")), [rows]);

  const href = (patientId: string) => `/dashboard/messages?patient=${patientId}${query ? `&q=${encodeURIComponent(query)}` : ""}`;

  const row = (c: ConversationRow, waiting: boolean) => {
    const active = c.patientId === selectedId;
    return (
      <li key={c.patientId}>
        <Link
          href={href(c.patientId)}
          aria-current={active ? "true" : undefined}
          // Une carte par patient, séparée des autres (Philippe, 2026-10-10 :
          // « mieux si les noms étaient séparés ») — plus un seul bloc où les
          // lignes se touchent.
          className={`flex items-center gap-3 rounded-2xl px-3 py-3 transition ${
            waiting
              ? "bg-brand-soft hover:bg-brand/15"
              : "bg-app-bg/70 hover:bg-app-bg max-sm:bg-surface max-sm:shadow-soft max-sm:active:bg-app-bg"
          } ${active ? "sm:ring-2 sm:ring-brand/50" : ""}`}
        >
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-brand ${
              waiting ? "bg-surface" : "bg-brand-soft"
            }`}
          >
            {c.initials}
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5">
              <span className={`truncate text-[15px] leading-tight text-ink ${waiting ? "font-semibold" : "font-medium"}`}>{c.name}</span>
              {c.followUp && <Bookmark className="h-3.5 w-3.5 shrink-0 text-brand" strokeWidth={2} aria-label="Avec suivi" />}
            </span>
            <span className={`mt-0.5 block truncate text-sm ${waiting ? "text-ink" : "text-muted"}`}>
              {c.lastSender === "instructor" ? `Vous : ${c.lastBody}` : c.lastBody}
            </span>
          </span>
          <span className="flex shrink-0 flex-col items-end gap-1">
            <span className={`text-xs ${waiting ? "font-medium text-brand" : "text-muted"}`}>{c.lastAt ? relativeDay(c.lastAt) : ""}</span>
            {c.unread > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1.5 text-[11px] font-semibold text-white">
                {c.unread}
              </span>
            )}
          </span>
        </Link>
      </li>
    );
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="relative flex items-center justify-between px-4 pb-2 pt-3 max-sm:px-1 max-sm:pt-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          {toReply.length > 0 ? `À répondre · ${toReply.length}` : "Conversations"}
        </p>
        <button
          type="button"
          onClick={() => setShowNew((v) => !v)}
          aria-label="Nouveau message"
          aria-expanded={showNew}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-soft text-brand hover:bg-brand/15"
        >
          <SquarePen className="h-4 w-4" strokeWidth={1.75} />
        </button>
        {showNew && (
          <div className="absolute right-3 top-12 z-10 w-64 rounded-xl bg-surface p-1 shadow-lg ring-1 ring-line">
            <p className="px-3 py-2 text-xs font-medium text-muted">Écrire à un patient</p>
            {allPatients.length === 0 ? (
              <p className="px-3 pb-2 text-sm text-muted">Aucun patient pour l&apos;instant.</p>
            ) : (
              <ul className="max-h-64 overflow-y-auto">
                {allPatients.map((r) => (
                  <li key={r.patientId}>
                    <Link
                      href={href(r.patientId)}
                      onClick={() => setShowNew(false)}
                      className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-app-bg"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand">
                        {r.initials}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-ink">{r.name}</span>
                        {r.conditionLabel && <span className="block truncate text-xs text-muted">{r.conditionLabel}</span>}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <ul className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-3 pb-3 max-sm:px-0.5 max-sm:pt-0.5">
        {toReply.map((c) => row(c, true))}
        {toReply.length > 0 && others.length > 0 && (
          <li className="px-1 pb-0.5 pt-3 text-xs font-semibold uppercase tracking-wide text-muted">Conversations</li>
        )}
        {others.map((c) => row(c, false))}
        {toReply.length === 0 && others.length === 0 && (
          <li className="px-6 py-10 text-center text-sm text-muted">
            {query
              ? "Aucune conversation ne correspond."
              : rows.length === 0
                ? "Aucun patient pour l'instant."
                : "Pas encore de conversation. Utilisez le crayon pour écrire à un patient."}
          </li>
        )}
      </ul>
    </div>
  );
}
