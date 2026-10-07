import Link from "next/link";
import { Activity, ArrowDown, ArrowRight, ArrowUp, CheckCircle2, Lightbulb } from "lucide-react";
import WavingHand from "@/components/WavingHand";
import WeekProgramme, { type SessionDetail } from "@/components/WeekProgramme";
import MountainScene from "@/components/MountainScene";
import type { WeekInfo } from "@/lib/patient/weeks";

// Affichage de l'Accueil patient, séparé du chargement des données
// (app/patient/page.tsx) pour que /prototypes/accueil-patient montre
// EXACTEMENT le même écran avec des données fictives, sans connexion
// (Philippe, 2026-10-06 : rendre l'appli plus chaleureuse, façon Doctolib /
// Strava, en gardant la mise en page). Même contenu que sur ordinateur — seule
// la présentation change, et seulement sur téléphone (max-sm: / sm:hidden).

export interface ProgrammeCard {
  title: string;
  subtitle: string;
  cta: string;
  done: boolean;
}

export interface PatientHomeViewProps {
  firstName: string;
  today: string;
  week: number;
  programmeCard: ProgrammeCard;
  /** Séances faites / prévues cette semaine. */
  weekCount: number;
  target: number | null;
  weekProgress: number;
  decision: { concerning: boolean; held: boolean };
  weeks: WeekInfo[];
  dayDetails: Record<string, SessionDetail[]>;
  currentWeekNumber: number;
  pending: boolean;
  /** Téléphone : bulles Adhérence / Douleur (lib/patient/progressStats). */
  stats?: { adherencePct: number | null; adherenceDelta: number | null; painAvg: number | null; painDelta: number | null };
  /** Téléphone : « Conseil du jour » (lib/patient/tips). */
  tip?: string;
}

export default function PatientHomeView({
  firstName,
  today,
  week,
  programmeCard,
  weekCount,
  target,
  weekProgress,
  decision,
  weeks,
  dayDetails,
  currentWeekNumber,
  pending,
  stats,
  tip,
}: PatientHomeViewProps) {
  const showAdherence = stats?.adherencePct != null;
  const showPain = stats?.painAvg != null;
  return (
    /* Téléphone : la page occupe exactement l'écran au-dessus de la barre
       d'onglets, et la frise prend toute la place restante (Philippe,
       2026-10-04 : « que TOUT l'espace soit utilisé »). */
    <main className="p-4 pt-5 max-sm:flex max-sm:pt-2 max-sm:min-h-[calc(100dvh-var(--phone-chrome))] max-sm:flex-col sm:min-h-screen sm:p-8">
      {/* This cluster (greeting, onboarding notice, clinical banner) is one
          status group — "here's where you stand today" — so its internal
          gap (space-y-4) stays tight and uniform. The jump to the programme
          zone below is a real change of subject, so it gets a bigger gap
          (mt-8, double this group's own rhythm) rather than the same value
          repeated everywhere (Philippe, 2026-09-08 spacing pass). */}
      {/* Téléphone (2026-10-07, maquette) : l'Accueil = aujourd'hui — carte
          « Votre programme » avec la montagne, bulles Adhérence / Douleur,
          Conseil du jour. La frise est passée dans « Mes progrès ». */}
      <div data-hide-when-week-open="" className="mx-auto max-w-5xl space-y-3 max-sm:flex max-sm:w-full max-sm:flex-1 max-sm:flex-col sm:space-y-4">
        {/* Deux cartes symétriques, même largeur et même hauteur (grille,
            étirées) : salutation à gauche, « Mon programme » à droite
            (Philippe, 2026-10-01). */}
        <div className="grid gap-3 max-sm:flex-1 max-sm:grid-rows-[auto_1fr] sm:grid-cols-2 sm:gap-4">
          {/* Téléphone (Philippe, 2026-10-04) : salutation sur une ligne, sans
              carte, et grand bouton « Voir mon programme » pleine largeur — la
              frise doit apparaître dès l'arrivée, sans défiler. Rien ne change
              dès sm (ordinateur, tablette). */}
          <div className="group flex items-center sm:rounded-2xl sm:border sm:border-line sm:bg-surface sm:px-5 sm:py-4 sm:shadow-md">
            <div className="flex min-w-0 items-baseline gap-2 sm:block">
              <h1 className="flex items-center gap-2 text-2xl font-semibold text-ink">
                <span className="truncate">Bonjour {firstName}</span>
                <WavingHand className="h-7 w-7 shrink-0 sm:h-9 sm:w-9" />
              </h1>
              <p className="text-xs capitalize text-muted max-sm:truncate sm:mt-0.5 sm:text-sm">{today}</p>
            </div>
          </div>

          {/* Carte « Mon programme » en haut à droite, à la place de la citation
              du jour (Philippe, 2026-10-01) — elle était en bas de page, sous
              la frise. Dégradé plutôt qu'une carte blanche de plus : c'est
              l'endroit où la page s'autorise un peu d'audace visuelle. La
              montagne garde le randonneur qui marque la progression ; la fine
              barre dit la même chose en clair. Téléphone : coins plus ronds et
              ombre teintée, plus douce qu'une ombre grise. */}
          <section
            className={`group relative w-full overflow-hidden rounded-2xl bg-gradient-to-r px-5 py-4 shadow-md transition duration-200 ease-out hover:-translate-y-0.5 hover:shadow-xl max-sm:flex max-sm:min-h-[15rem] max-sm:flex-col max-sm:rounded-3xl max-sm:pb-5 max-sm:pt-5 max-sm:shadow-lg ${
              programmeCard.done ? "from-ok to-green-700 max-sm:shadow-ok/25" : "from-brand to-brand-dark max-sm:shadow-brand/30"
            }`}
          >
            <MountainScene
              variant="goal"
              progress={weekProgress}
              className="pointer-events-none absolute -bottom-1 left-0 h-20 w-28 text-white/90 max-sm:bottom-[4.5rem] max-sm:left-auto max-sm:right-0 max-sm:h-[58%] max-sm:w-[72%]"
            />
            {/* Téléphone : texte en haut, montagne à droite, bouton en bas
                (mt-auto) — comme la maquette. */}
            <div className="relative pl-24 max-sm:flex max-sm:flex-1 max-sm:flex-col max-sm:pl-0">
              {/* Pas de « Semaine 0 » quand aucun programme n'a commencé. */}
              {week > 0 && (
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-white/75">
                  {programmeCard.done && <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2} />}
                  Semaine {week}
                </p>
              )}
              <p className="mt-0.5 text-base font-semibold text-white">{programmeCard.title}</p>
              <p className="mt-0.5 text-sm text-white/85">{programmeCard.subtitle}</p>
              <div className="mt-3 flex items-center justify-between gap-3 max-sm:mt-auto max-sm:flex-col max-sm:items-stretch">
                {/* Ordinateur : la fine barre, inchangée. */}
                <div
                  className={`h-1.5 w-full max-w-[8rem] overflow-hidden rounded-full bg-white/20 ${
                    target !== null && target > 0 ? "max-sm:hidden" : "max-sm:max-w-none"
                  }`}
                >
                  <div className="h-full rounded-full bg-white transition-[width]" style={{ width: `${Math.round(weekProgress * 100)}%` }} />
                </div>
                {/* Téléphone : la même progression, mais séance par séance —
                    une pastille par séance prévue (objectif de la semaine façon
                    Strava), plus lisible qu'une barre fine. */}
                {target !== null && target > 0 && (
                  <div className="flex items-center gap-2 sm:hidden">
                    <div className="flex flex-1 gap-1.5" aria-hidden>
                      {Array.from({ length: target }, (_, i) => (
                        <span key={i} className={`h-2 flex-1 rounded-full ${i < weekCount ? "bg-white" : "bg-white/25"}`} />
                      ))}
                    </div>
                    <span className="shrink-0 text-xs font-semibold text-white">
                      {Math.min(weekCount, target)}/{target} séance{target > 1 ? "s" : ""}
                    </span>
                  </div>
                )}
                <Link
                  href="/patient/programme"
                  className={`flex shrink-0 items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-sm font-semibold max-sm:justify-center max-sm:whitespace-nowrap max-sm:py-3 max-sm:text-base shadow-sm transition hover:bg-white/90 motion-safe:animate-[ctaPulse_2.4s_ease-out_infinite] motion-safe:group-hover:animate-none ${
                    programmeCard.done ? "text-ok" : "text-brand"
                  }`}
                >
                  {programmeCard.cta}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={2} />
                </Link>
              </div>
            </div>
          </section>
        </div>

        {/* The brake, explained gently. The patient never sees the clinical wording
            of `decision.reason` — that phrasing is written for the practitioner.
            Textes revus (Philippe, 2026-10-07) : ne rien promettre d'automatique
            — rien ne branche decision.stage sur la prescription ; c'est le kiné,
            qui voit ces retours, qui ajuste le programme. */}
        {(decision.concerning || decision.held) &&
          (decision.held && !decision.concerning ? (
            <div className="rounded-2xl border border-line bg-surface p-5 pl-4 shadow-sm border-l-[3px] border-l-brand">
              <p className="font-medium text-ink">Vous allez mieux</p>
              <p className="mt-1 text-sm text-muted">
                Vos retours s&apos;améliorent. Votre kiné les voit et fera évoluer votre programme
                à votre rythme.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-line bg-surface p-5 pl-4 shadow-sm border-l-[3px] border-l-warn">
              <p className="font-medium text-ink">
                Vos derniers retours ont été transmis
              </p>
              <p className="mt-1 text-sm text-muted">
                Votre kiné voit ce que vous ressentez et pourra adapter votre programme. D&apos;ici là,
                allez-y doucement, sans forcer — et parlez-lui si la douleur persiste.
              </p>
            </div>
          ))}

        {/* Téléphone : les deux bulles de la maquette — seulement celles qui ont
            un chiffre (Philippe, 2026-10-06 : pas de « — »). Mènent à Progrès. */}
        {(showAdherence || showPain) && stats && (
          <div className={`grid gap-3 sm:hidden ${showAdherence && showPain ? "grid-cols-2" : "grid-cols-1"}`}>
            {showAdherence && (
              <Link href="/patient/progres" className="rounded-2xl bg-surface p-4 shadow-soft">
                <p className="text-xs font-medium text-muted">Adhérence</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-ink">{stats.adherencePct}%</p>
                {stats.adherenceDelta !== null && (
                  <p className={`mt-1 flex items-center gap-0.5 text-xs font-medium ${stats.adherenceDelta >= 0 ? "text-ok" : "text-danger"}`}>
                    {stats.adherenceDelta >= 0 ? <ArrowUp className="h-3 w-3" strokeWidth={2.5} /> : <ArrowDown className="h-3 w-3" strokeWidth={2.5} />}
                    {stats.adherenceDelta >= 0 ? "+" : ""}
                    {stats.adherenceDelta}% <span className="font-normal text-muted">vs période préc.</span>
                  </p>
                )}
              </Link>
            )}
            {showPain && (
              <Link href="/patient/progres" className="rounded-2xl bg-surface p-4 shadow-soft">
                <p className="flex items-center gap-1.5 text-xs font-medium text-muted">
                  <Activity className="h-3.5 w-3.5 text-brand" strokeWidth={2} />
                  Douleur
                </p>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-ink">
                  {stats.painAvg!.toFixed(1)}
                  <span className="text-sm font-medium text-muted">/10</span>
                </p>
                {stats.painDelta !== null && (
                  <p className={`mt-1 flex items-center gap-0.5 text-xs font-medium ${stats.painDelta <= 0 ? "text-ok" : "text-danger"}`}>
                    {stats.painDelta <= 0 ? <ArrowDown className="h-3 w-3" strokeWidth={2.5} /> : <ArrowUp className="h-3 w-3" strokeWidth={2.5} />}
                    {stats.painDelta > 0 ? "+" : ""}
                    {stats.painDelta.toFixed(1)} <span className="font-normal text-muted">vs 30 j avant</span>
                  </p>
                )}
              </Link>
            )}
          </div>
        )}

        {/* Téléphone : Conseil du jour, comme la maquette. */}
        {tip && (
          <div className="flex items-start gap-3 rounded-2xl bg-surface p-4 shadow-soft sm:hidden">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
              <Lightbulb className="h-4 w-4" strokeWidth={2} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink">Conseil du jour</p>
              <p className="mt-0.5 text-sm text-muted">{tip}</p>
            </div>
          </div>
        )}
      </div>

      {/* Outside the max-w-5xl column on purpose — the timeline uses the whole
          content width (up to the sidebar), not the reading-width column
          everything else on this page uses (Philippe, 2026-09-08). */}
      {/* Téléphone : la frise est dans « Mes progrès » (2026-10-07). */}
      <div className="mt-5 w-full min-w-0 max-sm:hidden sm:mt-8">
        {/* Pas encore de programme : c'est le titre de cette section qui
            l'annonce (pending), plus de bloc séparé au-dessus. */}
        <WeekProgramme
          weeks={weeks}
          dayDetails={dayDetails}
          currentWeekNumber={currentWeekNumber}
          // « En attente » = aucune séance attribuée cette semaine — PAS
          // « pas de condition » : le kiné peut attribuer une séance sans
          // condition, et le patient restait alors bloqué sur « Votre
          // programme arrive bientôt » (Philippe, 2026-10-01, patient Padraig).
          pending={pending}
        />
      </div>
    </main>
  );
}
