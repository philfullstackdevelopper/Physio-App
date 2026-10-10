// Fiche patient côté kiné — la mise en page seule (app/dashboard/patients/[id]/page.tsx
// calcule tout et fournit le menu « Gérer » et la frise déjà construits ;
// /prototypes/kine-telephone la rend avec des données fictives).
// Téléphone (Philippe, 2026-10-07 : mêmes règles que l'appli patient) : la
// fiche tient dans l'écran — retour + nom + « Gérer » sur une ligne, les trois
// chiffres en trois cases côte à côte, puis la frise qui prend toute la place
// restante (une semaine par écran, voir KineWeekProgramme).

import Link from "next/link";
import { AlertTriangle, ArrowDown, ArrowLeft, ArrowUp, CheckCircle2, Minus } from "lucide-react";

const TONE_TEXT = { ok: "text-ok", warn: "text-warn", danger: "text-danger", muted: "text-muted" } as const;
const TONE_BG = { ok: "bg-ok-soft text-ok", warn: "bg-warn-soft text-warn", danger: "bg-danger-soft text-danger", muted: "bg-app-bg text-muted" } as const;

function PainDelta({ latest, previous }: { latest: number | null; previous: number | null }) {
  if (latest === null || previous === null) return <span className="text-xs text-muted">—</span>;
  const d = latest - previous;
  if (d === 0) return <span className="flex items-center gap-1 text-xs text-muted"><Minus className="h-3 w-3" strokeWidth={2} />= séance précédente</span>;
  return (
    <span className={`flex items-center gap-1 text-xs ${d > 0 ? "text-danger" : "text-ok"}`}>
      {d > 0 ? <ArrowUp className="h-3 w-3" strokeWidth={2} /> : <ArrowDown className="h-3 w-3" strokeWidth={2} />}
      {Math.abs(d)} depuis la séance précédente
    </span>
  );
}

export interface PatientDetailStats {
  painLatest: number | null;
  painPrevious: number | null;
  adherencePct: number | null;
  adherenceTone: keyof typeof TONE_TEXT;
  adherenceLabel: string | null;
  lastSessionLabel: string;
  /** « 20 min · 5 exercices », ou null. */
  lastSessionDetail: string | null;
}

// Une case de la barre de chiffres : sur ordinateur, libellé + valeur + détail
// sur une ligne ; sur téléphone, libellé au-dessus, valeur dessous, détail masqué.
const STAT_CELL = "flex flex-wrap items-center gap-x-3 gap-y-0.5 px-4 py-2.5 max-sm:flex-col max-sm:items-start max-sm:gap-0 max-sm:px-3 max-sm:py-2";

export default function PatientDetailView({
  name,
  warning,
  paymentLapsed,
  actionsMenu,
  error,
  adjusted,
  stats,
  programme,
}: {
  name: string;
  warning: { label: string; detail: string } | null;
  paymentLapsed: boolean;
  /** Le bouton « Gérer » (PatientActionsMenu), construit par la page. */
  actionsMenu: React.ReactNode;
  error?: string;
  adjusted: boolean;
  stats: PatientDetailStats;
  /** La frise (KineWeekProgramme), construite par la page. */
  programme: React.ReactNode;
}) {
  const s = stats;
  return (
    <main className="min-h-screen max-sm:flex max-sm:h-[calc(100dvh-var(--phone-chrome))] max-sm:min-h-0 max-sm:flex-col">
      {/* max-w-7xl comme la liste patients (Philippe, 2026-09-09 : « prendre
          toute la place ») — la frise a besoin de largeur. */}
      <div className="mx-auto max-w-7xl px-6 py-5 max-sm:flex max-sm:min-h-0 max-sm:w-full max-sm:flex-1 max-sm:flex-col max-sm:px-4 max-sm:pb-3 max-sm:pt-1 sm:px-8 sm:py-6">
        <Link href="/dashboard/patients" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink max-sm:hidden"><ArrowLeft className="h-4 w-4" strokeWidth={1.75} />Retour à la liste</Link>
        {/* En-tête épuré (Philippe, 2026-10-01 : « trop d'information ») :
            le nom, les alertes et « Gérer ». Condition, profil déclaré et
            messages sont dans le menu « Gérer » ; phase et jours d'affilée
            ont été retirés de l'en-tête. */}
        <div className="mt-2 flex flex-wrap items-center justify-between gap-4 max-sm:mt-0 max-sm:flex-nowrap max-sm:gap-2">
          <Link href="/dashboard/patients" aria-label="Retour à la liste" className="-ml-2 hidden h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink max-sm:flex">
            <ArrowLeft className="h-5 w-5" strokeWidth={2} />
          </Link>
          <div className="flex flex-wrap items-center gap-3 max-sm:min-w-0 max-sm:flex-1 max-sm:gap-x-2 max-sm:gap-y-1">
            <h1 className="text-2xl font-semibold text-ink max-sm:w-full max-sm:truncate max-sm:text-xl">{name}</h1>
            {/* Alerte programme à côté du nom (Philippe, 2026-09-29) — le
                texte complet reste au survol. */}
            {warning && (
              <span title={warning.detail} className="inline-flex items-center gap-1.5 rounded-full bg-warn-soft px-3 py-1 text-xs font-medium text-warn max-sm:px-2 max-sm:py-0.5 max-sm:text-[11px]">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
                {warning.label}
              </span>
            )}
            {paymentLapsed && (
              <span className="rounded-full bg-warn-soft px-3 py-1 text-xs font-medium text-warn max-sm:px-2 max-sm:py-0.5 max-sm:text-[11px]">Ancien patient · accès verrouillé</span>
            )}
          </div>
          <div className="max-sm:shrink-0 sm:contents">{actionsMenu}</div>
        </div>

        {error && <p className="mt-4 rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger max-sm:mt-2 max-sm:py-2">{error}</p>}
        {adjusted && <p className="mt-4 flex items-center gap-2 rounded-xl bg-ok-soft px-4 py-3 text-sm text-ok max-sm:mt-2 max-sm:py-2"><CheckCircle2 className="h-4 w-4" strokeWidth={1.75} />Séance ajustée — le patient a été prévenu.</p>}

        {/* Trois stats — une barre fine (valeur + détail sur la même ligne)
            plutôt que trois grandes cases, pour que la frise tienne à l'écran
            sans scroller (Philippe, 2026-09-29). Téléphone : trois cases côte
            à côte. */}
        <div className="mt-4 grid divide-y divide-line rounded-xl border border-line bg-surface max-sm:mt-3 max-sm:shrink-0 max-sm:grid-cols-3 max-sm:divide-x max-sm:divide-y-0 max-sm:rounded-2xl max-sm:border-0 max-sm:shadow-soft sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <div className={STAT_CELL}>
            <p className="text-xs font-medium text-muted">Douleur</p>
            <p className={`text-lg font-semibold tabular-nums ${s.painLatest !== null && s.painLatest >= 6 ? "text-danger" : "text-ink"}`}>{s.painLatest !== null ? `${s.painLatest}/10` : "—"}</p>
            {s.painLatest !== null && <span className="max-sm:hidden"><PainDelta latest={s.painLatest} previous={s.painPrevious} /></span>}
          </div>
          <div className={STAT_CELL}>
            <p className="text-xs font-medium text-muted">Adhérence</p>
            <p className={`text-lg font-semibold tabular-nums ${TONE_TEXT[s.adherenceTone]}`}>{s.adherencePct !== null ? `${s.adherencePct} %` : "—"}</p>
            {s.adherenceLabel && <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium max-sm:hidden ${TONE_BG[s.adherenceTone]}`}>{s.adherenceLabel}</span>}
          </div>
          <div className={STAT_CELL}>
            <p className="text-xs font-medium text-muted"><span className="max-sm:hidden">Dernière séance</span><span className="hidden max-sm:inline">Dernière</span></p>
            <p className="text-lg font-semibold text-ink max-sm:truncate max-sm:max-w-full">{s.lastSessionLabel}</p>
            {s.lastSessionDetail && <p className="text-xs text-muted max-sm:hidden">{s.lastSessionDetail}</p>}
          </div>
        </div>

        {/* Frise semaine par semaine — remplace le calendrier mensuel et le
            graphique « Historique douleur » (audit Philippe, 2026-09-09) : une
            semaine avec douleur élevée ressort en rouge directement ici, et
            c'est depuis chaque semaine que le kiné assigne/ajuste la séance.
            Les illustrations de la séance en cours s'affichent directement
            DANS la carte « Cette semaine » de la frise (Philippe, 2026-09-09,
            deuxième retour : « mets-les sur la frise, qu'elle grossisse ») —
            plus de section séparée à faire défiler pour les voir. */}
        <div className="mt-5 w-full min-w-0 max-sm:mt-4 max-sm:flex max-sm:min-h-0 max-sm:flex-1 max-sm:flex-col">{programme}</div>
      </div>
    </main>
  );
}
