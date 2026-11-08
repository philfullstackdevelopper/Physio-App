"use client";

import { useMemo, useState, Fragment } from "react";
import { useRouter } from "next/navigation";
import { useAppHref } from "@/components/DemoContext";
import Link from "next/link";
import { ChevronRight, Info, MessageCircle, RotateCcw, Search, SlidersHorizontal, UserPlus } from "lucide-react";
import type { PatientRow } from "@/lib/dashboard/patientRows";
import { STAGE_LABELS, stageLabel, stageShort, type InjuryStage } from "@/lib/exercise/prescription";
import { PHASE_NUMBER } from "@/lib/exercise/phasePlan";
import { useTranslations } from "next-intl";
import PatientMessagesModal from "@/components/PatientMessagesModal";
import PatientActionsMenu from "@/components/PatientActionsMenu";
import type { ThreadMessage } from "@/components/MessageThread";

export type Segment = "tous" | "surveiller" | "jour";

const SIGNAL_TEXT = { pain: "text-danger", inactive: "text-warn", ok: "text-ok" } as const;

// Libellés : dashboard.patientsTable.onboarding.<stade>.

/** Patient qui n'a encore rien démarré : inscription non terminée, ou aucune
 *  séance prévue ni faite — séparé des patients suivis dans la liste mobile. */
function notStarted(row: PatientRow) {
  return row.onboardingStage !== null || (row.adherence.expected === 0 && !row.lastSessionAt);
}

function SignalCell({ row, compact = false }: { row: PatientRow; compact?: boolean }) {
  const size = compact ? "text-xs" : "text-sm";
  const t = useTranslations("dashboard.patientsTable");
  if (row.onboardingStage) {
    return (
      <span className={`inline-flex items-center gap-1.5 ${size} font-medium text-muted`}>
        <span className="h-1.5 w-1.5 rounded-full bg-warn" />
        {t(`onboarding.${row.onboardingStage}`)}
      </span>
    );
  }
  const s = row.signal;
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
      <span className={`inline-flex items-center gap-1.5 ${size} font-medium ${SIGNAL_TEXT[s.kind]}`}>
        {s.kind === "ok" && <span className="h-1.5 w-1.5 rounded-full bg-ok" />}
        {s.kind === "pain" && s.severe && <span className="h-1.5 w-1.5 rounded-full bg-danger animate-[gentlePulse_2.4s_ease-in-out_infinite]" />}
        {s.label}
      </span>
    </span>
  );
}

// « Séances » (Philippe, 2026-11-08, option 2) : les séances faites cette
// semaine en clair — « 1 / 3 cette sem. » — plutôt qu'un pourcentage rouge
// avec une barre, qui alarmait pour presque tout le monde.
function SessionsCell({ row, compact = false }: { row: PatientRow; compact?: boolean }) {
  const t = useTranslations("dashboard.patientsTable");
  const { done, target } = row.thisWeek;
  if (target === null && done === 0) return <span className={`${compact ? "text-xs" : "text-base"} text-muted`}>—</span>;
  return (
    <span
      title={target !== null ? t("weekDoneTitle", { done, target }) : undefined}
      className={`inline-flex items-baseline gap-1 whitespace-nowrap tabular-nums ${compact ? "text-xs" : ""}`}
    >
      <span className={`font-semibold text-ink ${compact ? "" : "text-lg leading-none"}`}>{done}</span>
      <span className={`text-muted ${compact ? "" : "text-xs"}`}>{target !== null ? t("weekDoneOf", { target }) : t("weekDoneNoTarget")}</span>
    </span>
  );
}

/** « 2 nouveaux retours » : séances faites depuis la dernière visite de la
 *  fiche (Philippe, 2026-11-02, inspiré de Fullphysio). */
function NewSessionsBadge({ row }: { row: PatientRow }) {
  const t = useTranslations("dashboard.patientsTable");
  if (!row.newSessions) return null;
  const n = row.newSessions;
  return (
    <span
      title={t("newSessionsTitle", { count: n })}
      className="shrink-0 rounded-full bg-brand px-2 py-0.5 text-[11px] font-semibold text-white"
    >
      {t("newSessions", { count: n })}
    </span>
  );
}

// Phase : de petits segments (un par phase, remplis jusqu'à la phase en
// cours) + « Phase 1 » en petit, sur une seule ligne — la pastille passait
// sur deux lignes (Philippe, 2026-11-08 : on garde le mot « Phase »).
const PHASE_COUNT = Object.keys(PHASE_NUMBER).length;
function PhaseSegments({ row, compact = false }: { row: PatientRow; compact?: boolean }) {
  if (!row.stage || !row.stageShort) return compact ? null : <span className="text-sm text-muted">—</span>;
  const n = PHASE_NUMBER[row.stage];
  return (
    <span title={row.stageLabel ?? undefined} className="inline-flex items-center gap-2 whitespace-nowrap">
      <span aria-hidden className="flex items-center gap-0.5">
        {Array.from({ length: PHASE_COUNT }, (_, i) => (
          <span key={i} className={`h-1.5 rounded-full ${compact ? "w-3" : "w-4"} ${i < n ? "bg-brand" : "bg-line"}`} />
        ))}
      </span>
      <span className={`${compact ? "sr-only" : "text-xs font-medium text-ink"}`}>{row.stageShort}</span>
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
  deletePatient: (formData: FormData) => Promise<void>;
}) {
  const router = useRouter();
  const t = useTranslations("dashboard.patientsTable");
  const tStage = useTranslations("exercise.stage");
  const tStageShort = useTranslations("exercise.stageShort");
  // Démo publique : la fiche s'ouvre dans la démo (components/DemoContext.tsx).
  const appHref = useAppHref();
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
    setTimeout(() => setReactivating((m) => Object.fromEntries(Object.entries(m).filter(([id]) => id !== r.id))), 4000);
  }

  const counts = useMemo(
    () => ({
      tous: rows.length,
      // Une inscription en attente n'a pas encore de signal clinique réel —
      // elle ne doit apparaître ni « à surveiller » ni « à jour ».
      surveiller: rows.filter((r) => !r.onboardingStage && r.signal.kind !== "ok").length,
      jour: rows.filter((r) => !r.onboardingStage && r.signal.kind === "ok").length,
    }),
    [rows],
  );

  const visible = useMemo(() => {
    const query = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (segment === "surveiller" && (r.onboardingStage || r.signal.kind === "ok")) return false;
      if (segment === "jour" && (r.onboardingStage || r.signal.kind !== "ok")) return false;
      if (conditionId && r.conditionId !== conditionId) return false;
      if (stage && r.stage !== stage) return false;
      if (query && !r.name.toLowerCase().includes(query)) return false;
      return true;
    });
  }, [rows, q, segment, conditionId, stage]);

  // Liste mobile : les patients suivis d'abord, puis ceux qui n'ont rien
  // démarré — l'ordre d'origine est conservé à l'intérieur de chaque groupe.
  const mobileOrdered = useMemo(
    () => [...visible.filter((r) => !notStarted(r)), ...visible.filter(notStarted)],
    [visible],
  );
  const followedCount = mobileOrdered.filter((r) => !notStarted(r)).length;
  const notStartedCount = mobileOrdered.length - followedCount;

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-line bg-surface p-10 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-soft text-brand">
          <UserPlus className="h-5 w-5" strokeWidth={1.75} />
        </span>
        <p className="mt-4 font-semibold text-ink">{t("emptyTitle")}</p>
        <p className="mt-1 text-sm text-muted">{t("emptyBody")}</p>
        <Link href="/dashboard/patients/new" className="mt-5 inline-flex rounded-full bg-brand px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-dark">
          {t("add")}
        </Link>
      </div>
    );
  }

  const segBtn = (key: Segment, label: string) => (
    <button
      type="button"
      onClick={() => setSegment(key)}
      className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors max-sm:shrink-0 max-sm:whitespace-nowrap ${
        segment === key
          ? "bg-surface text-ink shadow-sm max-sm:bg-brand max-sm:text-white max-sm:shadow-none"
          : "text-muted hover:text-ink max-sm:bg-surface max-sm:shadow-soft"
      }`}
    >
      {label} <span className={`tabular-nums text-muted ${segment === key ? "max-sm:text-white/80" : ""}`}>({counts[key]})</span>
    </button>
  );

  return (
    // Téléphone : recherche + Filtres sur une ligne, segments dessous, puis la
    // liste qui remplit le reste de l'écran et défile seule (PatientsPageView).
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-col gap-3 max-sm:grid max-sm:grid-cols-[1fr_auto] max-sm:gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <label className="relative min-w-[12rem] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" strokeWidth={1.75} />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("search")}
            className="w-full rounded-lg border border-line bg-surface py-2 pl-9 pr-3 text-sm text-ink placeholder:text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-soft max-sm:h-10 max-sm:rounded-xl max-sm:border-0 max-sm:text-base max-sm:shadow-soft"
          />
        </label>
        <div className="flex items-center gap-1 rounded-full border border-line bg-app-bg p-1 max-sm:order-last max-sm:col-span-2 max-sm:-mx-4 max-sm:overflow-x-auto max-sm:rounded-none max-sm:border-0 max-sm:bg-transparent max-sm:px-4 max-sm:py-0.5 max-sm:[scrollbar-width:none]">
          {segBtn("tous", t("segAll"))}
          {segBtn("surveiller", t("segWatch"))}
          {segBtn("jour", t("segOk"))}
        </div>
        <button
          type="button"
          onClick={() => setFiltersOpen((o) => !o)}
          aria-expanded={filtersOpen}
          className={`inline-flex h-9 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-sm font-medium max-sm:h-10 max-sm:rounded-xl max-sm:border-0 max-sm:shadow-soft ${
            filtersOpen || conditionId || stage ? "text-brand" : "text-muted"
          }`}
        >
          <SlidersHorizontal className="h-4 w-4" strokeWidth={1.75} />
          {t("filters")}
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
            <option value="">{t("allConditions")}</option>
            {conditions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={stage} onChange={(e) => setStage(e.target.value as InjuryStage | "")} className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink sm:w-64">
            <option value="">{t("allPhases")}</option>
            {(Object.keys(STAGE_LABELS) as InjuryStage[]).map((s) => <option key={s} value={s}>{stageShort(s, tStageShort)} — {stageLabel(s, tStage)}</option>)}
          </select>
        </div>
      )}

      <div className="mt-4 min-h-0 flex-1 overflow-auto overscroll-contain rounded-xl border border-line bg-surface max-sm:mt-3 max-sm:rounded-2xl max-sm:border-0 max-sm:shadow-soft">
        {visible.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted">{t("noMatch")}</p>
        ) : (
          <>
            {/* Grand écran : tableau, à partir de lg seulement — entre 768 et
                1023 px (iPad en portrait, barre latérale déduite) ses six
                colonnes débordaient ; la liste en cartes prend le relais. */}
            <table className="hidden w-full lg:table">
              <thead className="sticky top-0 z-10 bg-surface">
                <tr className="border-b border-line text-left text-xs font-medium uppercase tracking-wide text-muted">
                  <th scope="col" className="px-4 py-3 font-medium">{t("colPatient")}</th>
                  <th scope="col" className="px-4 py-3 font-medium">{t("colPhase")}</th>
                  <th scope="col" className="px-4 py-3 font-medium">{t("colLastSession")}</th>
                  <th scope="col" className="px-4 py-3 font-medium">{t("colSessions")}</th>
                  <th scope="col" className="px-4 py-3 font-medium">{t("colSignal")}</th>
                  <th scope="col" className="px-2 py-3">
                    <span className="sr-only">{t("colActions")}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {visible.map((r) => (
                  <Fragment key={r.id}>
                  {/* Toute la ligne navigue vers la fiche patient (Philippe,
                  // 2026-09-09 : le survol de toute la ligne laissait croire
                  // qu'elle était cliquable partout, alors que seuls le nom et
                  // la flèche l'étaient — cliquer sur Phase/Adhérence/Signal ne
                  // faisait rien). onClick + cursor-pointer sur <tr> plutôt
                  // qu'un <Link> englobant, invalide en HTML autour de <td>. */}
                  <tr
                    onClick={() => router.push(appHref(`/dashboard/patients/${r.id}`))}
                    className={`group cursor-pointer border-b border-line last:border-b-0 hover:bg-app-bg ${r.onboardingStage ? "bg-app-bg/60" : ""}`}
                  >
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand">{r.initials}</span>
                        <span className="min-w-0">
                          <span className="flex items-center gap-2">
                            <span className="truncate text-sm font-semibold text-ink">{r.name}</span>
                            <NewSessionsBadge row={r} />
                          </span>
                          <span className="block truncate text-xs text-muted">
                            {r.onboardingStage ? t("signingUp") : r.conditionName ?? t("noCondition")}
                          </span>
                        </span>
                      </span>
                    </td>
                    <td className="px-4 py-3"><PhaseSegments row={r} /></td>
                    <td className={`px-4 py-3 text-base tabular-nums ${r.lastSessionAt ? "font-semibold text-ink" : "text-muted"}`}>{r.lastSessionLabel}</td>
                    <td className="px-4 py-3"><SessionsCell row={r} /></td>
                    <td className="px-4 py-3"><SignalCell row={r} /></td>
                    <td className="px-2 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {reactivating[r.id] && reactivating[r.id] !== "loading" && (
                          <span className={`max-w-[9rem] truncate text-xs ${reactivating[r.id] === "done" ? "text-ok" : "text-danger"}`}>
                            {reactivating[r.id] === "done" ? t("resent") : reactivating[r.id]}
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
                            aria-label={t("reactivate", { name: r.name })}
                            title={t("resend")}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-app-bg hover:text-brand disabled:opacity-50"
                          >
                            <RotateCcw className={`h-4 w-4 ${reactivating[r.id] === "loading" ? "animate-spin" : ""}`} strokeWidth={1.75} />
                          </button>
                        ) : r.onboardingStage === "profile" ? (
                          <span
                            onClick={(e) => e.stopPropagation()}
                            title={t("profileHint")}
                            aria-label={t("profilePending", { name: r.name })}
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
                            aria-label={t("messagesWith", { name: r.name })}
                            title={t("messages")}
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
                            deletePatient={deletePatient}
                          />
                        </span>
                        <span aria-label={t("openFile", { name: r.name })} className="flex h-8 w-8 items-center justify-center text-muted">
                          <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={1.75} />
                        </span>
                      </div>
                    </td>
                  </tr>
                  </Fragment>
                ))}
              </tbody>
            </table>

            {/* Mobile : liste. Refaite le 2026-10-10 (Philippe) : le nom en
                entier sur sa propre ligne (le signal le coupait : « Thomas… »),
                et un « saut » net entre les patients suivis et ceux qui n'ont
                encore rien démarré (invitation, profil, aucune séance prévue). */}
            <ul className="divide-y divide-line lg:hidden">
              {mobileOrdered.map((r, i) => (
                <Fragment key={r.id}>
                {i === followedCount && notStartedCount > 0 && (
                  <li className="bg-app-bg px-4 pb-2 pt-5 text-xs font-semibold uppercase tracking-wide text-muted max-sm:bg-phone-bg">
                    {t("notStarted", { count: notStartedCount })}
                  </li>
                )}
                <li className={`flex items-center gap-1 px-4 py-3 transition-colors max-sm:active:bg-app-bg ${notStarted(r) ? "bg-app-bg/60" : ""}`}>
                  <Link href={`/dashboard/patients/${r.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                        notStarted(r) ? "bg-line text-muted" : "bg-brand-soft text-brand"
                      }`}
                    >
                      {r.initials}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-[15px] font-semibold leading-tight text-ink">{r.name}</span>
                        <NewSessionsBadge row={r} />
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-muted">
                        {r.onboardingStage ? t("signingUp") : r.conditionName ?? t("noCondition")}
                        {r.lastSessionAt && ` · ${r.lastSessionLabel}`}
                      </span>
                      <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                        <SignalCell row={r} compact />
                        {/* Même idée que les colonnes Phase / Séances du tableau : segments + « 1 / 3 cette sem. » (2026-11-08). */}
                        {!r.onboardingStage && <PhaseSegments row={r} compact />}
                        {!r.onboardingStage && (r.thisWeek.target !== null || r.thisWeek.done > 0) && <SessionsCell row={r} compact />}
                      </span>
                    </span>
                  </Link>
                  {r.onboardingStage === "invite" ? (
                    <button
                      type="button"
                      onClick={() => handleReactivate(r)}
                      disabled={reactivating[r.id] === "loading"}
                      aria-label={t("reactivate", { name: r.name })}
                      title={t("resend")}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-app-bg hover:text-brand disabled:opacity-50"
                    >
                      <RotateCcw className={`h-4 w-4 ${reactivating[r.id] === "loading" ? "animate-spin" : ""}`} strokeWidth={1.75} />
                    </button>
                  ) : r.onboardingStage === "profile" ? (
                    <span
                      title={t("profileHint")}
                      aria-label={t("profilePending", { name: r.name })}
                      className="flex h-8 w-8 shrink-0 items-center justify-center text-muted"
                    >
                      <Info className="h-4 w-4" strokeWidth={1.75} />
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setMessagesPatient(r)}
                      aria-label={t("messagesWith", { name: r.name })}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-app-bg hover:text-brand"
                    >
                      <MessageCircle className="h-4 w-4" strokeWidth={1.75} />
                    </button>
                  )}
                  <PatientActionsMenu
                    trigger="icon"
                    patientId={r.id}
                    patientName={r.name}
                    deletePatient={deletePatient}
                  />
                </li>
                </Fragment>
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
