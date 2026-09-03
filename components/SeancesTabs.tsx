"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, Dumbbell, Trash2 } from "lucide-react";
import ExerciseIllustration from "@/components/ExerciseIllustration";
import SubmitButton from "@/components/SubmitButton";
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
  /** Set (to a human-readable reason) when this séance can't be deleted —
   *  it's recommended to a patient or has logged sessions. Undefined means
   *  deletable. */
  blockedReason?: string;
};

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

const CARD_GRID = "grid grid-cols-1 gap-4 sm:grid-cols-3";

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
  const boxClass = size === "inset" ? "h-28 w-full rounded-lg" : "aspect-[4/3] rounded-t-xl";
  return (
    <div className={`relative ${boxClass} bg-app-bg`}>
      {leadExerciseName ? (
        <ExerciseIllustration
          name={leadExerciseName}
          className={`h-full w-full text-brand ${size === "inset" ? "" : "p-4"}`}
          animate={false}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <Dumbbell className="h-8 w-8 text-muted" strokeWidth={1.5} />
        </div>
      )}
      {badge === "mine" && (
        <span className="absolute left-2 top-2 rounded-full bg-app-bg px-2 py-0.5 text-xs font-medium text-muted">
          Personnalisée
        </span>
      )}
      {badge === "template" && (
        <span className="absolute left-2 top-2 rounded-full border border-line bg-surface px-2 py-0.5 text-xs font-medium text-muted">
          Plateforme
        </span>
      )}
      {stage && (
        <span
          title={STAGE_LABELS[stage]}
          className="absolute right-2 top-2 rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-medium text-brand"
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
  return <p className="mt-1 line-clamp-2 text-xs text-muted">{names.join(" · ")}</p>;
}

// Same toggle-button-then-inline-form idiom as ExerciseLibraryGrid's
// "+ Ajouter un nouvel exercice" — a collapsed action by default rather than
// an always-open form taking up space above every tab.
function NewSeanceForm({
  conditions,
  stages,
  createSeance,
}: {
  conditions: { id: string; name: string }[];
  stages: [InjuryStage, string][];
  createSeance: (formData: FormData) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mb-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-full bg-brand px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-dark active:scale-95"
      >
        + Nouvelle séance
      </button>

      {open && (
        <form
          action={createSeance}
          className="mt-3 rounded-xl border border-line bg-surface p-5"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-ink">Nouvelle séance</h3>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-sm text-muted hover:text-ink"
            >
              Annuler
            </button>
          </div>
          <div className="mt-3 flex flex-col gap-3">
            <input
              name="name"
              required
              placeholder="Nom de la séance"
              className="w-full rounded-lg border border-line px-3 py-2 text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-soft"
            />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <select
                name="condition_id"
                required
                defaultValue=""
                className="w-full rounded-lg border border-line px-3 py-2 text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-soft"
              >
                <option value="" disabled>
                  Condition…
                </option>
                {conditions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <select
                name="stage"
                defaultValue=""
                className="w-full rounded-lg border border-line px-3 py-2 text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-soft"
              >
                <option value="">Phase (toutes)</option>
                {stages.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <SubmitButton
            pendingText="Création…"
            className="mt-3 rounded-full bg-brand px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-dark active:scale-95"
          >
            Créer et composer
          </SubmitButton>
        </form>
      )}
    </div>
  );
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
  mine,
  templates,
  duplicateSeance,
  deleteSeance,
  createSeance,
  conditions,
  stages,
}: {
  mine: ListItem[];
  templates: ListItem[];
  duplicateSeance: (formData: FormData) => void;
  deleteSeance: (formData: FormData) => void;
  createSeance: (formData: FormData) => void;
  conditions: { id: string; name: string }[];
  stages: [InjuryStage, string][];
}) {
  const [tab, setTab] = useState<Tab>("mine");
  const [mineQuery, setMineQuery] = useState("");
  const [templateQuery, setTemplateQuery] = useState("");
  const [templatesShown, setTemplatesShown] = useState(REVEAL_INITIAL);

  const filteredMine = useMemo(() => {
    const q = mineQuery.trim().toLowerCase();
    if (!q) return mine;
    return mine.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.conditionName?.toLowerCase().includes(q) ||
        s.exerciseNames?.some((n) => n.toLowerCase().includes(q)),
    );
  }, [mine, mineQuery]);

  const filteredTemplates = useMemo(() => {
    const q = templateQuery.trim().toLowerCase();
    if (!q) return templates;
    return templates.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.conditionName?.toLowerCase().includes(q) ||
        t.exerciseNames?.some((n) => n.toLowerCase().includes(q)),
    );
  }, [templates, templateQuery]);

  const visibleTemplates = filteredTemplates.slice(0, templatesShown);

  return (
    <div className="mt-8">
      <div className="inline-flex items-center gap-1 rounded-full border border-line bg-app-bg p-1">
        <button
          type="button"
          onClick={() => setTab("mine")}
          className={
            tab === "mine"
              ? "rounded-full bg-surface px-3 py-1.5 text-sm font-medium text-ink shadow-sm"
              : "rounded-full px-3 py-1.5 text-sm font-medium text-muted hover:text-ink"
          }
        >
          Mes séances personnalisées ({mine.length})
        </button>
        <button
          type="button"
          onClick={() => setTab("templates")}
          className={
            tab === "templates"
              ? "rounded-full bg-surface px-3 py-1.5 text-sm font-medium text-ink shadow-sm"
              : "rounded-full px-3 py-1.5 text-sm font-medium text-muted hover:text-ink"
          }
        >
          Séances prévues ({templates.length})
        </button>
      </div>

      {tab === "mine" && (
        <div className="mt-3">
          <NewSeanceForm conditions={conditions} stages={stages} createSeance={createSeance} />

          {mine.length > 0 && (
            <div className="relative mb-3">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
                strokeWidth={1.5}
              />
              <input
                type="text"
                value={mineQuery}
                onChange={(e) => setMineQuery(e.target.value)}
                placeholder="Rechercher parmi mes séances…"
                className="w-full rounded-lg border border-line py-2 pl-9 pr-3 text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-soft"
              />
            </div>
          )}
          {mine.length === 0 ? (
            <div className="rounded-xl border border-line bg-surface p-2">
              <p className="p-6 text-center text-sm text-muted">
                Aucune séance personnalisée pour le moment. Créez-en une ci-dessus, ou
                dupliquez un modèle dans l&apos;onglet &laquo; Séances prévues &raquo;.
              </p>
            </div>
          ) : filteredMine.length === 0 ? (
            <div className="rounded-xl border border-line bg-surface p-2">
              <p className="p-6 text-center text-sm text-muted">
                Aucune séance ne correspond à &laquo; {mineQuery.trim()} &raquo;.
              </p>
            </div>
          ) : (
            <div className={CARD_GRID}>
              {filteredMine.map((s) => (
                <div
                  key={s.id}
                  className="group rounded-xl border border-line bg-surface p-4 hover:border-brand"
                >
                  <div className="flex items-start justify-between gap-2">
                    <Link href={`/dashboard/seances/${s.id}`} className="min-w-0 flex-1">
                      <SeanceThumb
                        badge="mine"
                        stage={s.stage}
                        leadExerciseName={s.leadExerciseName}
                        size="inset"
                      />
                    </Link>
                    <DeleteSeanceButton
                      seanceId={s.id}
                      seanceName={s.name}
                      blockedReason={s.blockedReason}
                      deleteSeance={deleteSeance}
                    />
                  </div>
                  <Link href={`/dashboard/seances/${s.id}`} className="block min-h-28">
                    <p className="mt-3 font-medium text-ink">{s.name}</p>
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
      )}

      {tab === "templates" && (
        <div className="mt-3">
          <p className="text-sm text-muted">
            Déjà disponibles pour tous les kinés. Dupliquez-en une pour en faire votre
            propre version modifiable.
          </p>
          {templates.length > 0 && (
            <div className="relative mt-3 mb-3">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
                strokeWidth={1.75}
              />
              <input
                type="search"
                value={templateQuery}
                onChange={(e) => {
                  setTemplateQuery(e.target.value);
                  setTemplatesShown(REVEAL_INITIAL);
                }}
                placeholder="Rechercher un modèle…"
                className="w-full rounded-lg border border-line bg-surface py-2 pl-9 pr-3 text-sm text-ink placeholder:text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-soft"
              />
            </div>
          )}
          {templates.length === 0 ? (
            <div className="mt-3 rounded-xl border border-line bg-surface p-2">
              <p className="p-6 text-center text-sm text-muted">Aucun modèle disponible.</p>
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="rounded-xl border border-line bg-surface p-2">
              <p className="p-6 text-center text-sm text-muted">
                Aucun modèle ne correspond à &laquo; {templateQuery.trim()} &raquo;.
              </p>
            </div>
          ) : (
            <>
              <div className={`mt-3 ${CARD_GRID}`}>
                {visibleTemplates.map((t) => (
                  <div
                    key={t.id}
                    className="overflow-hidden rounded-xl border border-line bg-surface"
                  >
                    <SeanceThumb badge="template" stage={t.stage} leadExerciseName={t.leadExerciseName} />
                    <div className="flex flex-col gap-3 p-4">
                      <div>
                        <p className="font-medium text-ink">{t.conditionName ?? t.name}</p>
                        <p className="text-sm text-muted">{t.stageLabel ?? t.name}</p>
                        <ExerciseNamesList names={t.exerciseNames} />
                      </div>
                      <form action={duplicateSeance}>
                        <input type="hidden" name="template_id" value={t.id} />
                        <SubmitButton
                          pendingText="Duplication…"
                          className="w-full rounded-full border border-brand px-3 py-1.5 text-sm font-medium text-brand transition hover:bg-brand-soft active:scale-95"
                        >
                          Dupliquer
                        </SubmitButton>
                      </form>
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
      )}

    </div>
  );
}
