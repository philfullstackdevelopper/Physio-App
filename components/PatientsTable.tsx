"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, MessageCircle, Search, SlidersHorizontal, UserPlus } from "lucide-react";
import type { PatientRow } from "@/lib/dashboard/patientRows";
import { STAGE_LABELS, STAGE_SHORT, type InjuryStage } from "@/lib/exercise/prescription";
import PatientMessagesModal from "@/components/PatientMessagesModal";
import type { ThreadMessage } from "@/components/MessageThread";

export type Segment = "tous" | "surveiller" | "jour";

const TONE_TEXT = { ok: "text-ok", warn: "text-warn", danger: "text-danger", muted: "text-muted" } as const;
const TONE_BAR = { ok: "bg-ok", warn: "bg-warn", danger: "bg-danger", muted: "bg-line" } as const;
const SIGNAL_TEXT = { pain: "text-danger", inactive: "text-warn", ok: "text-ok" } as const;

function SignalCell({ row }: { row: PatientRow }) {
  const s = row.signal;
  return (
    <span className={`inline-flex items-center gap-1.5 text-sm font-medium ${SIGNAL_TEXT[s.kind]}`}>
      {s.kind === "ok" && <span className="h-1.5 w-1.5 rounded-full bg-ok" />}
      {s.kind === "pain" && s.severe && <span className="h-1.5 w-1.5 rounded-full bg-danger animate-[gentlePulse_2.4s_ease-in-out_infinite]" />}
      {s.label}
    </span>
  );
}

function AdherenceCell({ row }: { row: PatientRow }) {
  if (row.adherence.pct === null) return <span className="text-sm text-muted">—</span>;
  return (
    <div className="min-w-[4.5rem]">
      <span className={`text-sm font-semibold tabular-nums ${TONE_TEXT[row.adherenceTone]}`}>{row.adherence.pct} %</span>
      <div className="mt-1 h-1 w-full rounded-full bg-line">
        <div className={`h-1 rounded-full ${TONE_BAR[row.adherenceTone]}`} style={{ width: `${row.adherence.pct}%` }} />
      </div>
    </div>
  );
}

function PhaseBadge({ row }: { row: PatientRow }) {
  if (!row.stageShort) return <span className="text-sm text-muted">—</span>;
  return (
    <span title={row.stageLabel ?? undefined} className="inline-flex rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-medium text-brand">
      {row.stageShort}
    </span>
  );
}

export default function PatientsTable({
  rows,
  conditions,
  initialSegment = "tous",
  getPatientThread,
  sendPatientMessage,
}: {
  rows: PatientRow[];
  conditions: { id: string; name: string }[];
  initialSegment?: Segment;
  /** Charge le fil d'un patient pour la pop-up Messages (voir app/dashboard/patients/actions.ts). */
  getPatientThread: (patientId: string) => Promise<{ thread: ThreadMessage[] } | { error: string }>;
  /** Envoie un message depuis la pop-up, sans redirection. */
  sendPatientMessage: (formData: FormData) => Promise<{ ok: true } | { error: string }>;
}) {
  const [q, setQ] = useState("");
  const [segment, setSegment] = useState<Segment>(initialSegment);
  const [conditionId, setConditionId] = useState("");
  const [stage, setStage] = useState<InjuryStage | "">("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [messagesPatient, setMessagesPatient] = useState<PatientRow | null>(null);

  const counts = useMemo(
    () => ({
      tous: rows.length,
      surveiller: rows.filter((r) => r.signal.kind !== "ok").length,
      jour: rows.filter((r) => r.signal.kind === "ok").length,
    }),
    [rows],
  );

  const visible = useMemo(() => {
    const query = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (segment === "surveiller" && r.signal.kind === "ok") return false;
      if (segment === "jour" && r.signal.kind !== "ok") return false;
      if (conditionId && r.conditionId !== conditionId) return false;
      if (stage && r.stage !== stage) return false;
      if (query && !r.name.toLowerCase().includes(query)) return false;
      return true;
    });
  }, [rows, q, segment, conditionId, stage]);

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-line bg-surface p-10 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-soft text-brand">
          <UserPlus className="h-5 w-5" strokeWidth={1.75} />
        </span>
        <p className="mt-4 font-semibold text-ink">Aucun patient pour le moment</p>
        <p className="mt-1 text-sm text-muted">Ajoutez votre premier patient pour lui assigner une condition et un programme d&apos;exercices.</p>
        <Link href="/dashboard/patients/new" className="mt-5 inline-flex rounded-full bg-brand px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-dark">
          Ajouter un patient
        </Link>
      </div>
    );
  }

  const segBtn = (key: Segment, label: string) => (
    <button
      type="button"
      onClick={() => setSegment(key)}
      className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
        segment === key ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"
      }`}
    >
      {label} <span className="tabular-nums text-muted">({counts[key]})</span>
    </button>
  );

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" strokeWidth={1.75} />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher un patient…"
            className="w-full rounded-lg border border-line bg-surface py-2 pl-9 pr-3 text-sm text-ink placeholder:text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-soft"
          />
        </label>
        <div className="flex items-center gap-1 rounded-full border border-line bg-app-bg p-1">
          {segBtn("tous", "Tous")}
          {segBtn("surveiller", "À surveiller")}
          {segBtn("jour", "À jour")}
        </div>
        <button
          type="button"
          onClick={() => setFiltersOpen((o) => !o)}
          aria-expanded={filtersOpen}
          className={`inline-flex h-9 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-sm font-medium ${
            filtersOpen || conditionId || stage ? "text-brand" : "text-muted"
          }`}
        >
          <SlidersHorizontal className="h-4 w-4" strokeWidth={1.75} />
          Filtres
          {(conditionId || stage) && (
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-brand text-[10px] font-semibold text-white">
              {[conditionId, stage].filter(Boolean).length}
            </span>
          )}
        </button>
      </div>

      {filtersOpen && (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <select value={conditionId} onChange={(e) => setConditionId(e.target.value)} className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink sm:w-56">
            <option value="">Toutes conditions</option>
            {conditions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={stage} onChange={(e) => setStage(e.target.value as InjuryStage | "")} className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink sm:w-64">
            <option value="">Toutes phases</option>
            {(Object.keys(STAGE_LABELS) as InjuryStage[]).map((s) => <option key={s} value={s}>{STAGE_SHORT[s]} — {STAGE_LABELS[s]}</option>)}
          </select>
        </div>
      )}

      <div className="mt-4 overflow-x-auto rounded-xl border border-line bg-surface">
        {visible.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted">Aucun patient ne correspond à ces critères.</p>
        ) : (
          <>
            {/* Desktop : tableau */}
            <table className="hidden w-full md:table">
              <thead>
                <tr className="border-b border-line text-left text-xs font-medium uppercase tracking-wide text-muted">
                  <th scope="col" className="px-4 py-3 font-medium">Patient</th>
                  <th scope="col" className="px-4 py-3 font-medium">Phase</th>
                  <th scope="col" className="px-4 py-3 font-medium">Dernière séance</th>
                  <th scope="col" className="px-4 py-3 font-medium">Adhérence</th>
                  <th scope="col" className="px-4 py-3 font-medium">Signal</th>
                  <th scope="col" className="px-2 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {visible.map((r) => (
                  <tr key={r.id} className="group border-b border-line last:border-b-0 hover:bg-app-bg">
                    <td className="px-4 py-3">
                      <Link href={`/dashboard/patients/${r.id}`} className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand">{r.initials}</span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-ink">{r.name}</span>
                          <span className="block truncate text-xs text-muted">{r.conditionName ?? "Condition non assignée"}</span>
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-3"><PhaseBadge row={r} /></td>
                    <td className="px-4 py-3 text-sm text-ink">{r.lastSessionLabel}</td>
                    <td className="px-4 py-3"><AdherenceCell row={r} /></td>
                    <td className="px-4 py-3"><SignalCell row={r} /></td>
                    <td className="px-2 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setMessagesPatient(r)}
                          aria-label={`Messages avec ${r.name}`}
                          title="Messages"
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-app-bg hover:text-brand"
                        >
                          <MessageCircle className="h-4 w-4" strokeWidth={1.75} />
                        </button>
                        <Link href={`/dashboard/patients/${r.id}`} aria-label={`Voir la fiche de ${r.name}`} className="flex h-8 w-8 items-center justify-center text-muted">
                          <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={1.75} />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile : liste */}
            <ul className="divide-y divide-line md:hidden">
              {visible.map((r) => (
                <li key={r.id} className="flex items-center gap-2 px-4 py-3">
                  <Link href={`/dashboard/patients/${r.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand">{r.initials}</span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-semibold text-ink">{r.name}</span>
                        <SignalCell row={r} />
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-muted">
                        {r.conditionName ?? "Condition non assignée"} · {r.lastSessionLabel}
                        {r.adherence.pct !== null && ` · ${r.adherence.pct} %`}
                      </span>
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted" strokeWidth={1.75} />
                  </Link>
                  <button
                    type="button"
                    onClick={() => setMessagesPatient(r)}
                    aria-label={`Messages avec ${r.name}`}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-app-bg hover:text-brand"
                  >
                    <MessageCircle className="h-4 w-4" strokeWidth={1.75} />
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {messagesPatient && (
        <PatientMessagesModal
          patient={{ id: messagesPatient.id, name: messagesPatient.name, initials: messagesPatient.initials }}
          onClose={() => setMessagesPatient(null)}
          getThread={getPatientThread}
          sendMessage={sendPatientMessage}
        />
      )}
    </div>
  );
}
