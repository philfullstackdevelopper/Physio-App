"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Info, MessageCircle, RotateCcw, Search, SlidersHorizontal, UserPlus } from "lucide-react";
import type { PatientRow } from "@/lib/dashboard/patientRows";
import { STAGE_LABELS, STAGE_SHORT, type InjuryStage } from "@/lib/exercise/prescription";
import PatientMessagesModal from "@/components/PatientMessagesModal";
import PatientActionsMenu from "@/components/PatientActionsMenu";
import type { ThreadMessage } from "@/components/MessageThread";

export type Segment = "tous" | "surveiller" | "jour" | "resilies";

const TONE_TEXT = { ok: "text-ok", warn: "text-warn", danger: "text-danger", muted: "text-muted" } as const;
const TONE_BAR = { ok: "bg-ok", warn: "bg-warn", danger: "bg-danger", muted: "bg-line" } as const;
const SIGNAL_TEXT = { pain: "text-danger", inactive: "text-warn", ok: "text-ok" } as const;

const ONBOARDING_LABEL: Record<NonNullable<PatientRow["onboardingStage"]>, string> = {
  invite: "Invitation envoyée",
  profile: "Profil santé à terminer",
};

function SignalCell({ row }: { row: PatientRow }) {
  if (row.onboardingStage) {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-muted">
        <span className="h-1.5 w-1.5 rounded-full bg-warn" />
        {ONBOARDING_LABEL[row.onboardingStage]}
      </span>
    );
  }
  const s = row.signal;
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
      <span className={`inline-flex items-center gap-1.5 text-sm font-medium ${SIGNAL_TEXT[s.kind]}`}>
        {s.kind === "ok" && <span className="h-1.5 w-1.5 rounded-full bg-ok" />}
        {s.kind === "pain" && s.severe && <span className="h-1.5 w-1.5 rounded-full bg-danger animate-[gentlePulse_2.4s_ease-in-out_infinite]" />}
        {s.label}
      </span>
      {row.paymentLapsedAt && (
        <span className="rounded-full bg-warn-soft px-2 py-0.5 text-xs font-medium text-warn">Ne paie plus</span>
      )}
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
  reactivatePatient,
  markPaymentLapsed,
  clearPaymentLapsed,
  deletePatient,
}: {
  rows: PatientRow[];
  conditions: { id: string; name: string }[];
  initialSegment?: Segment;
  /** Charge le fil d'un patient pour la pop-up Messages (voir app/dashboard/patients/actions.ts). */
  getPatientThread: (patientId: string) => Promise<{ thread: ThreadMessage[] } | { error: string }>;
  /** Envoie un message depuis la pop-up, sans redirection. */
  sendPatientMessage: (formData: FormData) => Promise<{ ok: true } | { error: string }>;
  /** Renvoie l'invitation Clerk (patients au stade « invite » seulement). */
  reactivatePatient: (formData: FormData) => Promise<{ ok: true } | { error: string }>;
  /** Statut paiement + suppression (voir app/dashboard/patients/[id]/actions.ts) — même menu que la fiche patient. */
  markPaymentLapsed: (formData: FormData) => Promise<void>;
  clearPaymentLapsed: (formData: FormData) => Promise<void>;
  deletePatient: (formData: FormData) => Promise<void>;
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [segment, setSegment] = useState<Segment>(initialSegment);
  const [conditionId, setConditionId] = useState("");
  const [stage, setStage] = useState<InjuryStage | "">("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [messagesPatient, setMessagesPatient] = useState<PatientRow | null>(null);
  /** Par patient : "loading" pendant l'envoi, "done" ou un message d'erreur une fois terminé (disparaît après quelques secondes). */
  const [reactivating, setReactivating] = useState<Record<string, string>>({});

  async function handleReactivate(r: PatientRow) {
    setReactivating((m) => ({ ...m, [r.id]: "loading" }));
    const fd = new FormData();
    fd.set("patient_id", r.id);
    const res = await reactivatePatient(fd);
    setReactivating((m) => ({ ...m, [r.id]: "error" in res ? res.error : "done" }));
    setTimeout(() => setReactivating((m) => { const { [r.id]: _drop, ...rest } = m; return rest; }), 4000);
  }

  const counts = useMemo(
    () => ({
      tous: rows.length,
      // Une inscription en attente n'a pas encore de signal clinique réel —
      // elle ne doit apparaître ni « à surveiller » ni « à jour ».
      surveiller: rows.filter((r) => !r.onboardingStage && r.signal.kind !== "ok").length,
      jour: rows.filter((r) => !r.onboardingStage && r.signal.kind === "ok").length,
      resilies: rows.filter((r) => r.paymentLapsedAt !== null).length,
    }),
    [rows],
  );

  const visible = useMemo(() => {
    const query = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (segment === "surveiller" && (r.onboardingStage || r.signal.kind === "ok")) return false;
      if (segment === "jour" && (r.onboardingStage || r.signal.kind !== "ok")) return false;
      if (segment === "resilies" && r.paymentLapsedAt === null) return false;
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
          {segBtn("resilies", "Ne paient plus")}
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
                  // Toute la ligne navigue vers la fiche patient (Philippe,
                  // 2026-09-09 : le survol de toute la ligne laissait croire
                  // qu'elle était cliquable partout, alors que seuls le nom et
                  // la flèche l'étaient — cliquer sur Phase/Adhérence/Signal ne
                  // faisait rien). onClick + cursor-pointer sur <tr> plutôt
                  // qu'un <Link> englobant, invalide en HTML autour de <td>.
                  <tr
                    key={r.id}
                    onClick={() => router.push(`/dashboard/patients/${r.id}`)}
                    className={`group cursor-pointer border-b border-line last:border-b-0 hover:bg-app-bg ${r.onboardingStage ? "bg-app-bg/60" : ""}`}
                  >
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand">{r.initials}</span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-ink">{r.name}</span>
                          <span className="block truncate text-xs text-muted">
                            {r.onboardingStage ? "Inscription en cours" : r.conditionName ?? "Condition non assignée"}
                          </span>
                        </span>
                      </span>
                    </td>
                    <td className="px-4 py-3"><PhaseBadge row={r} /></td>
                    <td className="px-4 py-3 text-sm text-ink">{r.lastSessionLabel}</td>
                    <td className="px-4 py-3"><AdherenceCell row={r} /></td>
                    <td className="px-4 py-3"><SignalCell row={r} /></td>
                    <td className="px-2 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {reactivating[r.id] && reactivating[r.id] !== "loading" && (
                          <span className={`max-w-[9rem] truncate text-xs ${reactivating[r.id] === "done" ? "text-ok" : "text-danger"}`}>
                            {reactivating[r.id] === "done" ? "Invitation renvoyée" : reactivating[r.id]}
                          </span>
                        )}
                        {r.onboardingStage === "invite" ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleReactivate(r);
                            }}
                            disabled={reactivating[r.id] === "loading"}
                            aria-label={`Réactiver ${r.name}`}
                            title="Renvoyer l'invitation"
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-app-bg hover:text-brand disabled:opacity-50"
                          >
                            <RotateCcw className={`h-4 w-4 ${reactivating[r.id] === "loading" ? "animate-spin" : ""}`} strokeWidth={1.75} />
                          </button>
                        ) : r.onboardingStage === "profile" ? (
                          <span
                            onClick={(e) => e.stopPropagation()}
                            title="CGU déjà acceptées : le patient a un compte actif, il lui suffit de se reconnecter pour terminer son profil santé."
                            aria-label={`${r.name} : profil santé à terminer`}
                            className="flex h-8 w-8 items-center justify-center text-muted"
                          >
                            <Info className="h-4 w-4" strokeWidth={1.75} />
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setMessagesPatient(r);
                            }}
                            aria-label={`Messages avec ${r.name}`}
                            title="Messages"
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-app-bg hover:text-brand"
                          >
                            <MessageCircle className="h-4 w-4" strokeWidth={1.75} />
                          </button>
                        )}
                        <span onClick={(e) => e.stopPropagation()}>
                          <PatientActionsMenu
                            trigger="icon"
                            patientId={r.id}
                            patientName={r.name}
                            paymentLapsedAt={r.paymentLapsedAt}
                            paymentEligibleForDeletion={r.paymentEligibleForDeletion}
                            redirectTo="/dashboard/patients"
                            markPaymentLapsed={markPaymentLapsed}
                            clearPaymentLapsed={clearPaymentLapsed}
                            deletePatient={deletePatient}
                          />
                        </span>
                        <span aria-label={`Voir la fiche de ${r.name}`} className="flex h-8 w-8 items-center justify-center text-muted">
                          <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={1.75} />
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile : liste */}
            <ul className="divide-y divide-line md:hidden">
              {visible.map((r) => (
                <li key={r.id} className={`flex items-center gap-2 px-4 py-3 ${r.onboardingStage ? "bg-app-bg/60" : ""}`}>
                  <Link href={`/dashboard/patients/${r.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand">{r.initials}</span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-semibold text-ink">{r.name}</span>
                        <SignalCell row={r} />
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-muted">
                        {r.onboardingStage ? "Inscription en cours" : r.conditionName ?? "Condition non assignée"} · {r.lastSessionLabel}
                        {r.adherence.pct !== null && ` · ${r.adherence.pct} %`}
                      </span>
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted" strokeWidth={1.75} />
                  </Link>
                  {r.onboardingStage === "invite" ? (
                    <button
                      type="button"
                      onClick={() => handleReactivate(r)}
                      disabled={reactivating[r.id] === "loading"}
                      aria-label={`Réactiver ${r.name}`}
                      title="Renvoyer l'invitation"
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-app-bg hover:text-brand disabled:opacity-50"
                    >
                      <RotateCcw className={`h-4 w-4 ${reactivating[r.id] === "loading" ? "animate-spin" : ""}`} strokeWidth={1.75} />
                    </button>
                  ) : r.onboardingStage === "profile" ? (
                    <span
                      title="CGU déjà acceptées : le patient a un compte actif, il lui suffit de se reconnecter pour terminer son profil santé."
                      aria-label={`${r.name} : profil santé à terminer`}
                      className="flex h-8 w-8 shrink-0 items-center justify-center text-muted"
                    >
                      <Info className="h-4 w-4" strokeWidth={1.75} />
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setMessagesPatient(r)}
                      aria-label={`Messages avec ${r.name}`}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-app-bg hover:text-brand"
                    >
                      <MessageCircle className="h-4 w-4" strokeWidth={1.75} />
                    </button>
                  )}
                  <PatientActionsMenu
                    trigger="icon"
                    patientId={r.id}
                    patientName={r.name}
                    paymentLapsedAt={r.paymentLapsedAt}
                    paymentEligibleForDeletion={r.paymentEligibleForDeletion}
                    redirectTo="/dashboard/patients"
                    markPaymentLapsed={markPaymentLapsed}
                    clearPaymentLapsed={clearPaymentLapsed}
                    deletePatient={deletePatient}
                  />
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
