"use client";

// =============================================================================
// ExerciseLibraryGrid — browse the whole exercise library (yours + platform)
// by body part. A compact row of category chips (all visible — Philippe,
// 2026-10-02: the page must show exercises without scrolling) filters a
// 2-to-4-per-row card grid. Each card shows
// an honest image placeholder (ExerciseIllustration) until real illustrations
// exist, plus the existing video-upload control.
// =============================================================================

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { MoreVertical, EyeOff, Eye, Info, Search, Globe } from "lucide-react";
import ExerciseInfoModal from "@/components/ExerciseInfoModal";
import ExerciseIllustration from "@/components/ExerciseIllustration";
import BodyPartIllustration from "@/components/BodyPartIllustration";
import ExerciseVideoUpload from "@/components/ExerciseVideoUpload";
import KineVideoUpload from "@/components/KineVideoUpload";
import NewExerciseWizard, { type WizardPatient } from "@/components/NewExerciseWizard";
import { STATUS_PILL, canRequestPublication, statusPillLabel, type PublicationStatus } from "@/lib/exercise/kineExercises";
import ContributorCredit from "@/components/ContributorCredit";

export interface BodyPart {
  id: string;
  slug: string;
  label: string;
  position: number;
}

export interface LibraryExercise {
  id: string;
  name: string;
  instructions: string | null;
  media_url: string | null;
  media_start_seconds: number;
  created_by: string | null;
  bodyPartIds: string[];
  /** Old French names this exercise was renamed or merged away from
   *  (migration 0042/0043) — a kiné who still types "Pont fessier" should
   *  find "Glute Bridge". Searched, never displayed. */
  search_keywords: string[];
  /** Hidden by the CURRENT instructor from their own search — a personal
   *  filter, not a deletion (see migration 0037). */
  hidden: boolean;
  /** Exercices créés par les kinés (migration 0081). */
  equipment: string[];
  publication_status: PublicationStatus;
  patient_id: string | null;
  review_note: string | null;
  author_label: string | null;
  /** Partagé avec le cabinet (migration 0085). */
  cabinetShared?: boolean;
  /** Collègue du cabinet qui l'a partagé (nom), sinon null. */
  sharedBy?: string | null;
}

/** Ce qu'il faut pour créer un exercice (absent dans les maquettes). */
export interface LibraryCreator {
  patients: WizardPatient[];
  publishedCount: number;
  requestPublication: (exerciseId: string) => Promise<{ ok: true } | { error: string }>;
  /** Démo publique : le formulaire fonctionne sans rien enregistrer. */
  demo?: boolean;
  /** Cabinet actif du kiné (migration 0085), sinon null. */
  cabinetName?: string | null;
}

/** Three-dot menu on an exercise card — hide/unhide, the only action for now. */
function ExerciseCardMenu({
  hidden,
  onHide,
  onUnhide,
}: {
  hidden: boolean;
  onHide: () => void;
  onUnhide: () => void;
}) {
  const [open, setOpen] = useState(false);
  const t = useTranslations("exercise.library");
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={t("options")}
        className="rounded p-1 text-muted hover:bg-app-bg hover:text-ink"
      >
        <MoreVertical className="h-4 w-4" strokeWidth={2} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-20 mt-1 w-44 rounded-lg border border-line bg-surface py-1 shadow-sm max-sm:z-[45]">
            {hidden ? (
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onUnhide();
                }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-ink hover:bg-app-bg"
              >
                <Eye className="h-3.5 w-3.5" strokeWidth={2} />
                {t("unhide")}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onHide();
                }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-ink hover:bg-app-bg"
              >
                <EyeOff className="h-3.5 w-3.5" strokeWidth={2} />
                {t("hide")}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default function ExerciseLibraryGrid({
  bodyParts,
  exercises,
  currentUserId,
  isAdmin = false,
  creator,
  hideExercise,
  unhideExercise,
}: {
  bodyParts: BodyPart[];
  exercises: LibraryExercise[];
  currentUserId: string;
  isAdmin?: boolean;
  creator?: LibraryCreator;
  hideExercise: (formData: FormData) => void | Promise<void>;
  unhideExercise: (formData: FormData) => void | Promise<void>;
}) {
  const router = useRouter();
  const t = useTranslations("exercise.library");
  const tStatus = useTranslations("exercise.publicationStatus");
  const [selectedId, setSelectedId] = useState<string | null>(bodyParts[0]?.id ?? null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  // « Créés par moi » : les exercices du kiné, avec leur statut.
  const [mineOnly, setMineOnly] = useState(false);
  // « Mon cabinet » : les exercices partagés par les collègues (migration 0085).
  const [cabinetOnly, setCabinetOnly] = useState(false);
  const cabinetCount = useMemo(() => exercises.filter((ex) => !!ex.sharedBy).length, [exercises]);
  const [publishMsg, setPublishMsg] = useState<string | null>(null);
  const [publishing, startPublishing] = useTransition();
  const patientName = useMemo(() => new Map((creator?.patients ?? []).map((p) => [p.id, p.name])), [creator]);
  const mineCount = useMemo(() => exercises.filter((ex) => ex.created_by === currentUserId).length, [exercises, currentUserId]);
  const [showHidden, setShowHidden] = useState(false);
  // Exercice ouvert par le (i) : vidéo + consignes (Philippe, 2026-11-01).
  const [info, setInfo] = useState<LibraryExercise | null>(null);
  const [query, setQuery] = useState("");

  const runAction = (action: (formData: FormData) => void | Promise<void>, exerciseId: string) => {
    const fd = new FormData();
    fd.set("exercise_id", exerciseId);
    action(fd);
  };

  const hiddenCount = useMemo(() => exercises.filter((ex) => ex.hidden).length, [exercises]);

  function selectBodyPart(id: string) {
    setSelectedId(id);
    setMineOnly(false);
    setCabinetOnly(false);
    setQuery("");
  }

  const countByBodyPart = useMemo(() => {
    const counts = new Map<string, number>();
    for (const ex of exercises) {
      if (ex.hidden) continue;
      for (const bpId of ex.bodyPartIds) {
        counts.set(bpId, (counts.get(bpId) ?? 0) + 1);
      }
    }
    return counts;
  }, [exercises]);

  // A non-empty search searches the whole library regardless of the selected
  // body-part tile — narrowing to a single category first would defeat the
  // point of a search bar. Clearing it falls back to the category filter.
  //
  // Matches name, the old French names an exercise was renamed/merged from
  // (search_keywords — see migration 0043), and instructions text — the
  // whole library is English-named now, but instructions stay French, so a
  // kiné typing a French term like "pont" or "mollet" still finds the
  // matching exercise even with no keyword recorded for it.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (cabinetOnly) {
      return exercises.filter(
        (ex) => !!ex.sharedBy && (!q || ex.name.toLowerCase().includes(q) || ex.instructions?.toLowerCase().includes(q)),
      );
    }
    if (mineOnly) {
      return exercises.filter(
        (ex) => ex.created_by === currentUserId && (!q || ex.name.toLowerCase().includes(q) || ex.instructions?.toLowerCase().includes(q)),
      );
    }
    if (q) {
      return exercises.filter(
        (ex) =>
          !ex.hidden &&
          (ex.name.toLowerCase().includes(q) ||
            ex.instructions?.toLowerCase().includes(q) ||
            ex.search_keywords.some((k) => k.toLowerCase().includes(q))),
      );
    }
    return selectedId
      ? exercises.filter((ex) => ex.bodyPartIds.includes(selectedId) && !ex.hidden)
      : [];
  }, [exercises, selectedId, query, mineOnly, cabinetOnly, currentUserId]);

  // Exercices de la plateforme et publiés : base de la recherche de doublons.
  const wizardLibrary = useMemo(
    () =>
      exercises
        .filter((ex) => ex.created_by === null || ex.publication_status === "published")
        .map((ex) => ({
          id: ex.id,
          name: ex.name,
          instructions: ex.instructions,
          bodyPartIds: ex.bodyPartIds,
          equipment: ex.equipment,
          search_keywords: ex.search_keywords,
          hasVideo: !!ex.media_url,
        })),
    [exercises],
  );

  const requestPublication = (exerciseId: string) => {
    if (!creator) return;
    setPublishMsg(null);
    startPublishing(async () => {
      const res = await creator.requestPublication(exerciseId);
      if ("error" in res) {
        setPublishMsg(res.error);
        return;
      }
      setInfo((cur) => (cur && cur.id === exerciseId ? { ...cur, publication_status: "pending" } : cur));
      setPublishMsg(t("publishSent"));
      router.refresh();
    });
  };

  // Pastille d'un exercice : le statut des siens, l'auteur de ceux des autres kinés.
  const pillFor = (ex: LibraryExercise): { label: string; tone: string } | null => {
    if (ex.created_by === currentUserId) {
      if (ex.patient_id) return { label: t("forPatient", { name: patientName.get(ex.patient_id) ?? t("aPatient") }), tone: "bg-violet-50 text-violet-700" };
      if (ex.cabinetShared && ex.publication_status !== "published") return { label: t("sharedWithCabinet"), tone: "bg-warn-soft text-warn" };
      const status = STATUS_PILL[ex.publication_status] ? ex.publication_status : "private";
      return { label: statusPillLabel(status, tStatus), tone: STATUS_PILL[status].tone };
    }
    return null;
  };

  return (
    <div className="mt-4 flex min-h-0 flex-1 flex-col max-sm:mt-3">
      {/* Recherche + création sur une seule ligne, puis les catégories en
          pastilles compactes : les exercices apparaissent dès l'arrivée sur
          la page (Philippe, 2026-10-02). */}
      <div className="flex flex-wrap items-center gap-3 max-sm:flex-nowrap max-sm:gap-2">
        <div className="relative min-w-[14rem] flex-1 max-sm:min-w-0">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
            strokeWidth={1.5}
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchPlaceholder", { count: exercises.length - hiddenCount })}
            className="w-full rounded-lg border border-line bg-surface py-2 pl-9 pr-3 text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-soft max-sm:h-10 max-sm:rounded-xl max-sm:border-0 max-sm:shadow-soft"
          />
        </div>
        {creator && mineCount > 0 && (
          <button
            type="button"
            onClick={() => {
              setMineOnly((v) => !v);
              setCabinetOnly(false);
            }}
            aria-pressed={mineOnly}
            className={`shrink-0 rounded-lg border px-3 py-2 text-sm font-medium transition max-sm:h-10 max-sm:rounded-xl max-sm:px-3 ${
              mineOnly ? "border-brand bg-brand-soft text-brand" : "border-line bg-surface text-ink hover:bg-app-bg"
            }`}
          >
            <span className="max-sm:hidden">{t("createdByMe")} · </span>
            <span className="sm:hidden">{t("me")} · </span>
            {mineCount}
          </button>
        )}
        {cabinetCount > 0 && (
          <button
            type="button"
            onClick={() => {
              setCabinetOnly((v) => !v);
              setMineOnly(false);
            }}
            aria-pressed={cabinetOnly}
            className={`shrink-0 rounded-lg border px-3 py-2 text-sm font-medium transition max-sm:h-10 max-sm:rounded-xl max-sm:px-3 ${
              cabinetOnly ? "border-warn bg-warn-soft text-warn" : "border-line bg-surface text-ink hover:bg-app-bg"
            }`}
          >
            <span className="max-sm:hidden">{t("fromMyCabinet")} · </span>
            <span className="sm:hidden">{t("cabinetShort")} · </span>
            {cabinetCount}
          </button>
        )}
        {creator && (
          <button
            type="button"
            onClick={() => setShowCreateForm(true)}
            aria-label={t("createExercise")}
            className="shrink-0 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-dark active:scale-95 max-sm:h-10 max-sm:rounded-xl max-sm:px-3.5"
          >
            +<span className="max-sm:hidden"> {t("createExercise")}</span>
          </button>
        )}
      </div>

      {!query.trim() && !mineOnly && !cabinetOnly && (
        // Téléphone : les catégories sur une seule ligne qui glisse au doigt,
        // au lieu de 3-4 lignes de pastilles avant le premier exercice.
        // Ordinateur (Philippe, 2026-10-12) : mêmes tuiles que le sélecteur
        // « Ajouter un exercice » — une seule rangée, dessin au-dessus du nom.
        <div
          style={{ gridTemplateColumns: `repeat(${bodyParts.length}, minmax(0, 7.5rem))` }}
          className="mt-3 flex flex-wrap gap-1.5 max-sm:-mx-4 max-sm:flex-nowrap max-sm:gap-2 max-sm:overflow-x-auto max-sm:px-4 max-sm:py-0.5 max-sm:[scrollbar-width:none] md:grid"
        >
          {bodyParts.map((bp) => {
            const active = bp.id === selectedId;
            const count = countByBodyPart.get(bp.id) ?? 0;
            return (
              <button
                key={bp.id}
                type="button"
                onClick={() => selectBodyPart(bp.id)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors duration-150 max-sm:w-[5.5rem] max-sm:shrink-0 max-sm:flex-col max-sm:justify-start max-sm:gap-1 max-sm:rounded-2xl max-sm:px-1.5 max-sm:py-2 max-sm:text-center max-sm:text-xs max-sm:leading-tight md:min-w-0 md:flex-col md:justify-start md:gap-0.5 md:rounded-xl md:px-1 md:py-1.5 md:text-center md:text-xs md:leading-tight ${
                  active ? "border-brand bg-brand-soft text-brand" : "border-line bg-surface text-ink hover:bg-app-bg max-sm:border-transparent max-sm:shadow-soft"
                }`}
              >
                <BodyPartIllustration slug={bp.slug} className="h-5 w-5 max-sm:h-11 max-sm:w-11 md:h-8 md:w-8" active={active} />
                {/* Téléphone (Philippe, 2026-10-12) : même tuile que dans « Ajuster
                    la séance » — pas de compteur, il allongeait la tuile. */}
                <span className="max-sm:line-clamp-2">{bp.label}</span>
                <span className={`max-sm:hidden ${active ? "text-brand/70" : "text-muted"}`}>{count}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Seule cette zone défile : recherche et catégories restent en place,
          la page ne dépasse jamais l'écran (audit 2026-10-10). */}
      <div className="mt-3 min-h-0 flex-1 overflow-y-auto overscroll-contain max-sm:-mx-1 max-sm:px-1 max-sm:pb-1 sm:-mr-2 sm:pr-2">
      {/* Téléphone (Philippe, 2026-10-12) : même affichage que dans « Ajuster
          la séance » — blocs 2 par rangée, dessin plus grand, nom sur deux
          lignes ; les consignes restent sur ordinateur. */}
      <div className="grid grid-cols-1 gap-3 max-sm:grid-cols-2 max-sm:gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.length === 0 ? (
          <p className="col-span-full rounded-xl border border-line bg-surface p-6 text-center text-sm text-muted">
            {cabinetOnly
              ? t("noneFromCabinet")
              : mineOnly
              ? t("noneCreated")
              : query.trim()
                ? t("noMatch", { query: query.trim() })
                : t("emptyCategory")}
          </p>
        ) : (
          filtered.map((ex) => (
            <div
              key={ex.id}
              className="rounded-xl border border-line bg-surface p-4 max-sm:relative max-sm:rounded-2xl max-sm:border-0 max-sm:p-2.5 max-sm:text-center max-sm:shadow-soft"
            >
              <div className="flex items-start justify-between gap-2">
                <ExerciseIllustration
                  name={ex.name}
                  className="h-24 w-full text-brand max-sm:h-16"
                />
                <span className="flex shrink-0 items-center max-sm:absolute max-sm:right-1 max-sm:top-1">
                  <button
                    type="button"
                    onClick={() => setInfo(ex)}
                    aria-label={t("seeDemoAria", { name: ex.name })}
                    title={t("seeDemo")}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-brand-soft hover:text-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"
                  >
                    <Info className="h-4 w-4" strokeWidth={1.75} />
                  </button>
                  <ExerciseCardMenu
                    hidden={ex.hidden}
                    onHide={() => runAction(hideExercise, ex.id)}
                    onUnhide={() => runAction(unhideExercise, ex.id)}
                  />
                </span>
              </div>
              <div className="sm:contents">
                <p className="mt-2 font-medium text-ink max-sm:mt-1.5 max-sm:line-clamp-2 max-sm:min-h-[2.5em] max-sm:text-[13px] max-sm:leading-tight">{ex.name}</p>
                {ex.created_by && ex.created_by !== currentUserId && ex.publication_status === "published" && (
                  <ContributorCredit label={ex.author_label} className="mt-1 max-sm:mt-0.5 max-sm:justify-center" />
                )}
                {ex.sharedBy && ex.publication_status !== "published" && (
                  <p className="mt-1 truncate text-xs text-muted max-sm:mt-0.5 max-sm:text-[11px]">{t("sharedBy", { name: ex.sharedBy })}</p>
                )}
                {(() => {
                  const pill = pillFor(ex);
                  return pill ? (
                    <span className={`mt-1 inline-block max-w-full truncate rounded-full px-2 py-0.5 text-xs font-medium max-sm:mt-0.5 max-sm:text-[11px] ${pill.tone}`}>
                      {pill.label}
                    </span>
                  ) : null;
                })()}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Fenêtre du (i) : la vidéo (sinon le dessin) et les consignes ; l'envoi
          de vidéo seulement sur les exercices du kiné connecté, et pour
          l'administrateur sur ceux de la plateforme (Philippe, 2026-10-07). */}
      {info && (
        <ExerciseInfoModal
          exercise={info}
          onClose={() => {
            setInfo(null);
            setPublishMsg(null);
          }}
          footer={
            info.created_by === currentUserId ? (
              <div className="flex flex-col gap-3">
                <OwnExerciseStatus
                  ex={info}
                  patientName={info.patient_id ? patientName.get(info.patient_id) ?? t("aPatient") : null}
                  canPublish={!!creator && canRequestPublication(info)}
                  publishing={publishing}
                  message={publishMsg}
                  onPublish={() => requestPublication(info.id)}
                />
                {info.publication_status !== "published" && (
                  <KineVideoUpload exerciseId={info.id} hasVideo={!!info.media_url} onUploaded={() => router.refresh()} />
                )}
              </div>
            ) : isAdmin && info.created_by === null ? (
              <ExerciseVideoUpload exerciseId={info.id} initialUrl={info.media_url} viaAdmin />
            ) : undefined
          }
        />
      )}

      {showCreateForm && creator && (
        <NewExerciseWizard
          bodyParts={bodyParts.map((bp) => ({ id: bp.id, label: bp.label }))}
          library={wizardLibrary}
          patients={creator.patients}
          defaultBodyPartId={selectedId}
          publishedCount={creator.publishedCount}
          cabinetName={creator.cabinetName ?? null}
          onClose={() => setShowCreateForm(false)}
          demo={creator.demo}
        />
      )}

      {hiddenCount > 0 && (
        <div className="mt-6 border-t border-line pt-4">
          <button
            type="button"
            onClick={() => setShowHidden((v) => !v)}
            className="text-sm font-medium text-muted hover:text-ink hover:underline"
          >
            {showHidden ? t("hideList") : t("hiddenCount", { count: hiddenCount })}
          </button>
          {showHidden && (
            <ul className="mt-3 space-y-1.5">
              {exercises
                .filter((ex) => ex.hidden)
                .map((ex) => (
                  <li
                    key={ex.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-line bg-app-bg px-3 py-2"
                  >
                    <span className="text-sm text-muted">{ex.name}</span>
                    <button
                      type="button"
                      onClick={() => runAction(unhideExercise, ex.id)}
                      className="shrink-0 text-xs font-medium text-brand hover:underline"
                    >
                      {t("unhide")}
                    </button>
                  </li>
                ))}
            </ul>
          )}
        </div>
      )}
      </div>
    </div>
  );
}

/** Statut d'un exercice du kiné dans sa fiche : à qui il sert, où en est la
 *  vérification, le message d'EasyPhysio, et « Rendre public ». */
function OwnExerciseStatus({
  ex,
  patientName,
  canPublish,
  publishing,
  message,
  onPublish,
}: {
  ex: LibraryExercise;
  patientName: string | null;
  canPublish: boolean;
  publishing: boolean;
  message: string | null;
  onPublish: () => void;
}) {
  const t = useTranslations("exercise.library");
  const tStatus = useTranslations("exercise.publicationStatus");
  const status = STATUS_PILL[ex.publication_status] ? ex.publication_status : "private";
  const pill = { label: statusPillLabel(status, tStatus), tone: STATUS_PILL[status].tone };
  const text = patientName
    ? t("statusForPatient", { name: patientName })
    : ex.publication_status === "pending"
      ? t("statusPending")
      : ex.publication_status === "published"
        ? t("statusPublished")
        : ex.publication_status === "changes_requested"
          ? t("statusChangesRequested")
          : ex.publication_status === "declined"
            ? t("statusDeclined")
            : t("statusPrivate");
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-line p-3">
      <span className={`self-start rounded-full px-2 py-0.5 text-xs font-medium ${patientName ? "bg-violet-50 text-violet-700" : pill.tone}`}>
        {patientName ? t("forPatient", { name: patientName }) : pill.label}
      </span>
      <p className="text-sm text-ink">{text}</p>
      {ex.review_note && (
        <p className="rounded-lg bg-app-bg p-2 text-sm text-ink">
          <b>{t("reviewNote")}</b> {ex.review_note}
        </p>
      )}
      {canPublish && (
        <button
          type="button"
          disabled={publishing}
          onClick={onPublish}
          className="inline-flex items-center gap-1.5 self-start rounded-lg border border-ok bg-ok-soft px-3 py-1.5 text-sm font-medium text-ok hover:brightness-95 disabled:opacity-60"
        >
          <Globe className="h-4 w-4" strokeWidth={2} />
          {publishing ? t("sending") : ex.publication_status === "changes_requested" ? t("resubmit") : t("makePublic")}
        </button>
      )}
      {message && <p className="text-sm text-muted">{message}</p>}
    </div>
  );
}
