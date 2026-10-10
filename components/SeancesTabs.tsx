"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { Search, Dumbbell, Trash2, MoreVertical, Pencil, EyeOff, Eye, Plus } from "lucide-react";
import ExerciseIllustration from "@/components/ExerciseIllustration";
import BodyPartIllustration from "@/components/BodyPartIllustration";
import NewSeanceModal from "@/components/NewSeanceModal";
import { type PickerExercise } from "@/components/ExerciseLibraryPicker";
import { type BodyPart } from "@/lib/exercise/category";
import { STAGE_SHORT, STAGE_LABELS, type InjuryStage } from "@/lib/exercise/prescription";

type ListItem = {
  id: string;
  name: string;
  conditionName?: string;
  stage?: InjuryStage | null;
  stageLabel?: string;
  extra?: string;
  leadExerciseName?: string;
  exerciseNames?: string[];
  exerciseCount?: number;
  /** Zones du corps que la séance travaille surtout (déduites de ses
   *  exercices côté serveur) — pour le filtre par zone. */
  bodyPartIds?: string[];
  /** Set (to a human-readable reason) when this séance can't be deleted —
   *  it's recommended to a patient or has logged sessions. Undefined means
   *  deletable. */
  blockedReason?: string;
  /** Templates only — hidden by the CURRENT instructor from their own
   *  "Séances prévues" list (migration 0046). A personal filter, not a
   *  deletion — the shared template is untouched. */
  hidden?: boolean;
};

// Helper matching ExerciseLibraryGrid's runAction — calls a server action
// with a small FormData built from a single field, without needing a real
// <form> submit (used inside the dropdown menu below).
function runAction(action: (formData: FormData) => void, field: string, value: string) {
  const fd = new FormData();
  fd.set(field, value);
  action(fd);
}

// Three-dot menu on a template card — "Modifier" forks the read-only
// template into the instructor's own editable copy (duplicateSeance already
// opens that copy's editor), "Masquer"/"Réafficher" toggles it out of this
// instructor's own list only. Mirrors ExerciseCardMenu's idiom exactly.
function TemplateCardMenu({
  templateId,
  hidden,
  duplicateSeance,
  hideTemplateWorkout,
  unhideTemplateWorkout,
}: {
  templateId: string;
  hidden?: boolean;
  duplicateSeance: (formData: FormData) => void;
  hideTemplateWorkout: (formData: FormData) => void;
  unhideTemplateWorkout: (formData: FormData) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Options"
        className="rounded p-1 text-muted hover:bg-app-bg hover:text-ink"
      >
        <MoreVertical className="h-4 w-4" strokeWidth={2} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-20 mt-1 w-44 rounded-lg border border-line bg-surface py-1 shadow-sm max-sm:z-[45]">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                runAction(duplicateSeance, "template_id", templateId);
              }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-ink hover:bg-app-bg"
            >
              <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
              Modifier
            </button>
            {hidden ? (
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  runAction(unhideTemplateWorkout, "workout_id", templateId);
                }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-ink hover:bg-app-bg"
              >
                <Eye className="h-3.5 w-3.5" strokeWidth={2} />
                Réafficher
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  runAction(hideTemplateWorkout, "workout_id", templateId);
                }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-danger hover:bg-danger-soft"
              >
                <EyeOff className="h-3.5 w-3.5" strokeWidth={2} />
                Supprimer de ma liste
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// Own séance only (templates/platform séances are never deletable here).
// Two-step confirm inline rather than a native confirm() dialog, matching
// the rest of the app's menu/popover idiom (see ExerciseLibraryGrid's
// three-dot menu) instead of a browser-native interruption.
function DeleteSeanceButton({
  seanceId,
  seanceName,
  blockedReason,
  deleteSeance,
}: {
  seanceId: string;
  seanceName: string;
  blockedReason?: string;
  deleteSeance: (formData: FormData) => void;
}) {
  const [confirming, setConfirming] = useState(false);

  if (blockedReason) {
    return (
      <span
        title={`Suppression impossible : ${blockedReason}. Retirez-la des patients concernés d'abord.`}
        className="rounded p-1.5 text-muted"
      >
        <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
      </span>
    );
  }

  if (confirming) {
    return (
      <form action={deleteSeance} className="flex items-center gap-1">
        <input type="hidden" name="workout_id" value={seanceId} />
        <button
          type="submit"
          className="rounded-md bg-danger px-2 py-1 text-xs font-medium text-white transition hover:opacity-90"
        >
          Confirmer
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="rounded-md px-2 py-1 text-xs font-medium text-muted transition-colors duration-150 hover:bg-app-bg"
        >
          Annuler
        </button>
      </form>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      aria-label={`Supprimer ${seanceName}`}
      title="Supprimer cette séance"
      className="rounded p-1.5 text-muted transition-colors duration-150 hover:bg-danger-soft hover:text-danger"
    >
      <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
    </button>
  );
}

type Tab = "mine" | "templates";

// How many cards render before a "Voir plus" reveal is needed — keeps the
// ~430-item template library (and an unfiltered/broad search) out of the DOM
// until the kiné asks for more.
const REVEAL_INITIAL = 12;
const REVEAL_STEP = 12;

// Téléphone (Philippe, 2026-10-07 : mêmes règles que l'appli patient) : les
// cartes deviennent des lignes compactes — vignette à gauche, nom au milieu,
// menu à droite — pour voir plusieurs séances sans faire défiler longtemps.
// Ordinateur / tablette (Philippe, 2026-10-10) : exactement la grille de
// « Mes exercices » — mêmes cartes, 2 / 3 / 4 par ligne selon la largeur.
const CARD_GRID = "grid grid-cols-1 gap-3 max-sm:gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";

// The workout's own lead exercise (position 0) supplies a real illustration
// via the same matching already solved for the exercise library — no
// separate cover-image field or asset needed. Falls back to the plain
// dumbbell placeholder only when the séance has no exercises yet.
function SeanceThumb({
  badge,
  stage,
  leadExerciseName,
  size = "cover",
}: {
  badge?: "mine" | "template";
  stage?: InjuryStage | null;
  leadExerciseName?: string;
  /** "cover" (default): full-bleed, proportional (aspect-[4/3]) — used by the
   *  "Séances prévues" template cards. "inset": fixed h-28, matching
   *  ExerciseIllustration's own sizing on the exercises page exactly, so a
   *  "Mes séances personnalisées" card renders the same size as an exercise
   *  card. */
  size?: "cover" | "inset";
}) {
  const boxClass = `${size === "inset" ? "h-24 w-full rounded-lg" : "aspect-[4/3] rounded-t-xl"} max-sm:aspect-auto max-sm:h-14 max-sm:w-14 max-sm:shrink-0 max-sm:rounded-xl max-sm:bg-app-bg max-sm:p-1`;
  return (
    <div className={`relative ${boxClass} bg-surface`}>
      {leadExerciseName ? (
        <ExerciseIllustration
          name={leadExerciseName}
          className={`h-full w-full text-brand ${size === "inset" ? "" : "p-4 max-sm:p-0"}`}
          animate={false}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <Dumbbell className="h-8 w-8 text-muted" strokeWidth={1.5} />
        </div>
      )}
      {badge === "mine" && (
        <span className="absolute left-2 top-2 rounded-full border border-line bg-surface px-2 py-0.5 text-xs font-medium text-muted max-sm:hidden">
          Personnalisée
        </span>
      )}
      {badge === "template" && (
        <span className="absolute left-2 top-2 rounded-full border border-line bg-surface px-2 py-0.5 text-xs font-medium text-muted max-sm:hidden">
          Plateforme
        </span>
      )}
      {stage && (
        <span
          title={STAGE_LABELS[stage]}
          className="absolute right-2 top-2 rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-medium text-brand max-sm:hidden"
        >
          {STAGE_SHORT[stage]}
        </span>
      )}
    </div>
  );
}

function CardMeta({ s }: { s: ListItem }) {
  return (
    <>
      <p className="mt-0.5 line-clamp-1 text-sm text-muted">
        {s.conditionName ?? "—"}
        {s.stageLabel && <span> · {s.stageLabel}</span>}
        {s.extra && <span className="text-muted"> · {s.extra}</span>}
      </p>
      <ExerciseNamesList names={s.exerciseNames} />
    </>
  );
}

// Clamped to 2 lines (matching the exercises page's own instructions text)
// so a séance with many exercises doesn't stretch its card — and every
// other card in the grid along with it, since CSS Grid stretches every item
// in a row to match the tallest — taller than one with few or none. Full
// list is still one click away on the séance's own page.
function ExerciseNamesList({ names }: { names?: string[] }) {
  if (!names || names.length === 0) return null;
  return <p className="mt-1 line-clamp-2 text-xs text-muted max-sm:mt-0.5 max-sm:line-clamp-1">{names.join(" · ")}</p>;
}

function VoirPlusButton({ onClick }: { onClick: () => void }) {
  return (
    <div className="mt-6 flex justify-center">
      <button
        type="button"
        onClick={onClick}
        className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink transition-colors duration-150 hover:bg-app-bg"
      >
        Voir plus
      </button>
    </div>
  );
}

export default function SeancesTabs({
  error,
  mine,
  templates,
  duplicateSeance,
  deleteSeance,
  hideTemplateWorkout,
  unhideTemplateWorkout,
  createSeance,
  conditions,
  stages,
  openNewSeance = false,
  exercises,
  bodyParts,
  returnTo,
}: {
  exercises: PickerExercise[];
  bodyParts: BodyPart[];
  /** Fiche patient d'où vient le kiné (« Créer une séance »), validée côté serveur. */
  returnTo?: string;
  /** Arrivée via « Créer une séance » (fenêtre Changer de séance de la fiche
   *  patient, /dashboard/seances?nouvelle=1) : formulaire déjà ouvert. */
  openNewSeance?: boolean;
  error?: string;
  mine: ListItem[];
  templates: ListItem[];
  duplicateSeance: (formData: FormData) => void;
  deleteSeance: (formData: FormData) => void;
  hideTemplateWorkout: (formData: FormData) => void;
  unhideTemplateWorkout: (formData: FormData) => void;
  createSeance: (formData: FormData) => void;
  conditions: { id: string; name: string }[];
  stages: [InjuryStage, string][];
}) {
  const [tab, setTab] = useState<Tab>("mine");
  const [mineQuery, setMineQuery] = useState("");
  const [templateQuery, setTemplateQuery] = useState("");
  const [templatesShown, setTemplatesShown] = useState(REVEAL_INITIAL);
  const [showHiddenTemplates, setShowHiddenTemplates] = useState(false);
  const [newSeanceOpen, setNewSeanceOpen] = useState(openNewSeance);
  const closeNewSeance = useCallback(() => setNewSeanceOpen(false), []);
  // Filtre par zone du corps, commun aux deux onglets (Philippe, 2026-10-10 :
  // comme sur « Mes exercices »). null = toutes les zones.
  const [zoneId, setZoneId] = useState<string | null>(null);
  const inZone = useCallback((s: ListItem) => !zoneId || (s.bodyPartIds ?? []).includes(zoneId), [zoneId]);
  // Seules les zones qui ont au moins une séance dans l'onglet ouvert.
  const zoneCounts = useMemo(() => {
    const list = tab === "mine" ? mine : templates.filter((t) => showHiddenTemplates || !t.hidden);
    const counts = new Map<string, number>();
    for (const s of list) for (const id of s.bodyPartIds ?? []) counts.set(id, (counts.get(id) ?? 0) + 1);
    return { counts, total: list.length };
  }, [tab, mine, templates, showHiddenTemplates]);
  const zones = bodyParts.filter((bp) => (zoneCounts.counts.get(bp.id) ?? 0) > 0);

  const filteredMine = useMemo(() => {
    const q = mineQuery.trim().toLowerCase();
    const zoned = mine.filter(inZone);
    if (!q) return zoned;
    return zoned.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.conditionName?.toLowerCase().includes(q) ||
        s.exerciseNames?.some((n) => n.toLowerCase().includes(q)),
    );
  }, [mine, mineQuery, inZone]);

  const hiddenTemplateCount = useMemo(() => templates.filter((t) => t.hidden).length, [templates]);

  const filteredTemplates = useMemo(() => {
    const q = templateQuery.trim().toLowerCase();
    return templates.filter((t) => {
      if (!showHiddenTemplates && t.hidden) return false;
      if (!inZone(t)) return false;
      if (!q) return true;
      return (
        t.name.toLowerCase().includes(q) ||
        t.conditionName?.toLowerCase().includes(q) ||
        t.exerciseNames?.some((n) => n.toLowerCase().includes(q))
      );
    });
  }, [templates, templateQuery, showHiddenTemplates, inZone]);

  const visibleTemplates = filteredTemplates.slice(0, templatesShown);

  const zoneLabel = zoneId ? bodyParts.find((bp) => bp.id === zoneId)?.label : undefined;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="animate-[fadeInUp_0.6s_ease-out_both] flex flex-wrap items-start justify-between gap-4 max-sm:flex-nowrap max-sm:items-center max-sm:gap-2">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Mes séances</h1>
        </div>
        <div className="flex items-center gap-4 max-sm:gap-2">
          <Link href="/dashboard/exercises" className="text-sm font-medium text-brand hover:underline max-sm:rounded-full max-sm:bg-surface max-sm:px-3 max-sm:py-2 max-sm:shadow-soft max-sm:hover:no-underline">
            <span className="max-sm:hidden">Gérer mes exercices →</span>
            <span className="hidden max-sm:inline">Mes exercices</span>
          </Link>
          <button
            type="button"
            onClick={() => {
              setTab("mine");
              setNewSeanceOpen((v) => !v);
            }}
            aria-label="Nouvelle séance"
            className="inline-flex items-center gap-1.5 rounded-full bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-dark max-sm:h-10 max-sm:w-10 max-sm:justify-center max-sm:p-0 max-sm:shadow-soft"
          >
            <Plus className="h-4 w-4 max-sm:h-5 max-sm:w-5" strokeWidth={2} />
            <span className="max-sm:hidden">Nouvelle séance</span>
          </button>
        </div>
      </div>

      {error && (
        <p className="animate-[fadeInUp_0.6s_ease-out_both] mt-4 rounded-lg bg-danger-soft p-3 text-sm text-danger">
          {error}
        </p>
      )}

      {/* Même hauteur d'en-tête que « Mes exercices » (Philippe, 2026-10-10) :
          titre, puis UNE ligne onglets + recherche, puis les zones, puis les
          cartes — plus de sous-titre ni de texte d'aide au-dessus de la liste. */}
      <div className="mt-4 flex min-h-0 flex-1 flex-col max-sm:mt-3">
      <div className="flex shrink-0 flex-wrap items-center gap-3 max-sm:gap-2">
      <div className="inline-flex items-center gap-1 rounded-full border border-line bg-app-bg p-1 max-sm:flex max-sm:w-full max-sm:border-0 max-sm:bg-line/60">
        <button
          type="button"
          onClick={() => setTab("mine")}
          className={
            tab === "mine"
              ? "rounded-full bg-surface px-3 py-1.5 text-sm font-medium text-ink shadow-sm max-sm:flex-1"
              : "rounded-full px-3 py-1.5 text-sm font-medium text-muted hover:text-ink max-sm:flex-1"
          }
        >
          <span className="max-sm:hidden">Mes séances personnalisées</span>
          <span className="hidden max-sm:inline">Personnalisées</span> ({mine.length})
        </button>
        <button
          type="button"
          onClick={() => setTab("templates")}
          className={
            tab === "templates"
              ? "rounded-full bg-surface px-3 py-1.5 text-sm font-medium text-ink shadow-sm max-sm:flex-1"
              : "rounded-full px-3 py-1.5 text-sm font-medium text-muted hover:text-ink max-sm:flex-1"
          }
        >
          <span className="max-sm:hidden">Séances prévues</span>
          <span className="hidden max-sm:inline">Modèles</span> ({templates.length})
        </button>
      </div>
        <div className="relative min-w-[14rem] flex-1 max-sm:min-w-0">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
            strokeWidth={1.5}
          />
          <input
            type="text"
            value={tab === "mine" ? mineQuery : templateQuery}
            onChange={(e) => {
              if (tab === "mine") setMineQuery(e.target.value);
              else {
                setTemplateQuery(e.target.value);
                setTemplatesShown(REVEAL_INITIAL);
              }
            }}
            placeholder={tab === "mine" ? "Rechercher parmi mes séances…" : "Rechercher un modèle…"}
            className="w-full rounded-lg border border-line bg-surface py-2 pl-9 pr-3 text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-soft max-sm:h-10 max-sm:rounded-xl max-sm:border-0 max-sm:shadow-soft"
          />
        </div>
        {tab === "templates" && hiddenTemplateCount > 0 && (
          <button
            type="button"
            onClick={() => setShowHiddenTemplates((v) => !v)}
            className="shrink-0 text-sm font-medium text-brand hover:underline"
          >
            {showHiddenTemplates ? "Masquer les retirés" : `Voir les retirés (${hiddenTemplateCount})`}
          </button>
        )}
      </div>

      {/* Zones du corps — mêmes pastilles que « Mes exercices ». Téléphone :
          une seule ligne qui glisse au doigt. */}
      {zones.length > 0 && (
        <div className="mt-3 flex shrink-0 flex-wrap gap-1.5 max-sm:-mx-4 max-sm:flex-nowrap max-sm:overflow-x-auto max-sm:px-4 max-sm:py-0.5 max-sm:[scrollbar-width:none]">
          <button
            type="button"
            onClick={() => {
              setZoneId(null);
              setTemplatesShown(REVEAL_INITIAL);
            }}
            aria-pressed={zoneId === null}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors duration-150 max-sm:shrink-0 max-sm:whitespace-nowrap ${
              zoneId === null ? "border-brand bg-brand-soft text-brand" : "border-line bg-surface text-ink hover:bg-app-bg max-sm:border-transparent max-sm:shadow-soft"
            }`}
          >
            Toutes
            <span className={zoneId === null ? "text-brand/70" : "text-muted"}>{zoneCounts.total}</span>
          </button>
          {zones.map((bp) => {
            const active = bp.id === zoneId;
            return (
              <button
                key={bp.id}
                type="button"
                onClick={() => {
                  setZoneId(active ? null : bp.id);
                  setTemplatesShown(REVEAL_INITIAL);
                }}
                aria-pressed={active}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors duration-150 max-sm:shrink-0 max-sm:whitespace-nowrap ${
                  active ? "border-brand bg-brand-soft text-brand" : "border-line bg-surface text-ink hover:bg-app-bg max-sm:border-transparent max-sm:shadow-soft"
                }`}
              >
                <BodyPartIllustration slug={bp.slug} className="h-5 w-5" active={active} />
                {bp.label}
                <span className={active ? "text-brand/70" : "text-muted"}>{zoneCounts.counts.get(bp.id)}</span>
              </button>
            );
          })}
        </div>
      )}

      {tab === "mine" && (
        <div className="mt-3 flex min-h-0 flex-1 flex-col">
          {newSeanceOpen && (
            <NewSeanceModal
              onClose={closeNewSeance}
              conditions={conditions}
              stages={stages}
              exercises={exercises}
              bodyParts={bodyParts}
              createSeance={createSeance}
              returnTo={returnTo}
            />
          )}

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain max-sm:-mx-1 max-sm:px-1 max-sm:pb-1 sm:-mr-2 sm:pr-2">
          {mine.length === 0 ? (
            <div className="rounded-xl border border-line bg-surface p-2">
              <p className="p-6 text-center text-sm text-muted">
                Aucune séance personnalisée pour le moment. Créez-en une avec « Nouvelle séance », ou
                dupliquez un modèle dans l&apos;onglet &laquo; Séances prévues &raquo;.
              </p>
            </div>
          ) : filteredMine.length === 0 ? (
            <div className="rounded-xl border border-line bg-surface p-2">
              <p className="p-6 text-center text-sm text-muted">
                {mineQuery.trim()
                  ? `Aucune séance ne correspond à « ${mineQuery.trim()} ».`
                  : `Aucune séance personnalisée pour la zone « ${zoneLabel ?? ""} ».`}
              </p>
            </div>
          ) : (
            <div className={CARD_GRID}>
              {filteredMine.map((s) => (
                <div
                  key={s.id}
                  className="group rounded-xl border border-line bg-surface p-4 hover:border-brand max-sm:grid max-sm:grid-cols-[3.5rem_minmax(0,1fr)_auto] max-sm:items-center max-sm:gap-3 max-sm:rounded-2xl max-sm:border-0 max-sm:p-3 max-sm:shadow-soft"
                >
                  <div className="flex items-start justify-between gap-2 max-sm:contents">
                    <Link href={`/dashboard/seances/${s.id}`} className="min-w-0 flex-1">
                      <SeanceThumb
                        badge="mine"
                        stage={s.stage}
                        leadExerciseName={s.leadExerciseName}
                        size="inset"
                      />
                    </Link>
                    <span className="max-sm:order-1 sm:contents">
                      <DeleteSeanceButton
                        seanceId={s.id}
                        seanceName={s.name}
                        blockedReason={s.blockedReason}
                        deleteSeance={deleteSeance}
                      />
                    </span>
                  </div>
                  <Link href={`/dashboard/seances/${s.id}`} className="block max-sm:min-w-0">
                    <p className="mt-2 font-medium text-ink max-sm:mt-0 max-sm:truncate">{s.name}</p>
                    {s.exerciseCount === 0 && (
                      <span className="mt-1 inline-flex items-center rounded-full bg-warn-soft px-2 py-0.5 text-xs font-medium text-warn">
                        Aucun exercice
                      </span>
                    )}
                    <CardMeta s={s} />
                  </Link>
                </div>
              ))}
            </div>
          )}
          </div>
        </div>
      )}

      {tab === "templates" && (
        <div className="mt-3 flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain max-sm:-mx-1 max-sm:px-1 max-sm:pb-1 sm:-mr-2 sm:pr-2">
          {templates.length === 0 ? (
            <div className="rounded-xl border border-line bg-surface p-2">
              <p className="p-6 text-center text-sm text-muted">Aucun modèle disponible.</p>
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="rounded-xl border border-line bg-surface p-2">
              <p className="p-6 text-center text-sm text-muted">
                {templateQuery.trim()
                  ? `Aucun modèle ne correspond à « ${templateQuery.trim()} ».`
                  : `Aucun modèle pour la zone « ${zoneLabel ?? ""} ».`}
              </p>
            </div>
          ) : (
            <>
              <div className={CARD_GRID}>
                {visibleTemplates.map((t) => (
                  <div
                    key={t.id}
                    className={`rounded-xl border border-line bg-surface p-4 max-sm:flex max-sm:items-center max-sm:gap-3 max-sm:rounded-2xl max-sm:border-0 max-sm:p-3 max-sm:shadow-soft ${t.hidden ? "opacity-60" : ""}`}
                  >
                    <SeanceThumb badge="template" stage={t.stage} leadExerciseName={t.leadExerciseName} size="inset" />
                    <div className="mt-2 flex flex-col gap-1 max-sm:mt-0 max-sm:min-w-0 max-sm:flex-1 max-sm:gap-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium text-ink">{t.conditionName ?? t.name}</p>
                          <p className="text-sm text-muted">{t.stageLabel ?? t.name}</p>
                        </div>
                        <TemplateCardMenu
                          templateId={t.id}
                          hidden={t.hidden}
                          duplicateSeance={duplicateSeance}
                          hideTemplateWorkout={hideTemplateWorkout}
                          unhideTemplateWorkout={unhideTemplateWorkout}
                        />
                      </div>
                      <ExerciseNamesList names={t.exerciseNames} />
                    </div>
                  </div>
                ))}
              </div>
              {templatesShown < filteredTemplates.length && (
                <VoirPlusButton onClick={() => setTemplatesShown((n) => n + REVEAL_STEP)} />
              )}
            </>
          )}
          </div>
        </div>
      )}

      </div>
    </div>
  );
}
