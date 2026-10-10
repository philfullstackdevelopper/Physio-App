"use client";

// =============================================================================
// KineWeekProgramme — la frise chronologique de la fiche patient, côté kiné.
//
// Philippe (audit du 2026-09-09) : « Supprimer le calendrier actuel, il faut
// la frise, comme sur l'interface client. Quand le kiné appuie sur son client,
// il doit avoir la frise pour facilement associer à chaque semaine un
// workout. » Même langage visuel que components/WeekProgramme.tsx (patient) —
// les segments-flèches viennent du module partagé WeekStrip.tsx — avec trois
// différences propres au kiné :
//   1. chaque semaine affiche la séance EFFECTIVE cette semaine-là (résolue
//      avec resolveAssignmentForWeek : une séance assignée à partir d'une
//      semaine reste valable jusqu'à l'assignation suivante) ;
//   2. une semaine où le patient a signalé une douleur élevée passe en rouge
//      sur la frise — ça remplace l'ancien graphique « Historique douleur » ;
//   3. dans la vue d'une semaine, le bouton « Ajuster / Choisir une séance »
//      (AdjustWorkoutModal) assigne À PARTIR DE cette semaine-là.
// Tout (logs, ressentis, assignations) est chargé une fois par la page et
// passé en props : changer de semaine ici ne refait aucune requête.
// =============================================================================

import { useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { AlertTriangle, ArrowLeft, CheckCircle2, ChevronLeft, ChevronRight, Circle, X } from "lucide-react";
import { daysOfWeek, localDateKey, type WeekInfo } from "@/lib/patient/weeks";
import { resolveAssignmentForWeek } from "@/lib/exercise/activeRecommendation";
import { gradeDay, type DayGrade } from "@/lib/exercise/dayGrade";
import { PAIN_HOLD } from "@/lib/exercise/stageProgress";
import { type BodyPart } from "@/lib/exercise/category";
import { SegmentRow, runViewTransition as runSharedViewTransition, type SegmentItem, type SegmentTone, type VTStyle } from "@/components/WeekStrip";
import AdjustWorkoutModal, { type AddableExercise, type AddableWorkout, type ModalExercise } from "@/components/AdjustWorkoutModal";
import ExerciseIllustration from "@/components/ExerciseIllustration";
import { useIsPhone, type SessionDetail } from "@/components/WeekProgramme";

export interface KineAssignment {
  /** patient_recommended_workouts.id */
  id: string;
  workoutId: string;
  /** Lundi ("YYYY-MM-DD") à partir duquel cette séance s'applique. */
  weekStartDate: string;
  /** Nombre de semaines (null = jusqu'à la prochaine séance) — migration 0059. */
  weekCount: number | null;
}

export interface KineWorkoutSummary {
  id: string;
  name: string;
  exercises: ModalExercise[];
}

/** Seuil de douleur à partir duquel une semaine passe en rouge sur la frise.
 *  Même valeur que la stat « Douleur » en haut de la fiche (≥ 6) et que le
 *  palier PAIN_HOLD du frein clinique — une seule règle partout. */
const WEEK_PAIN_ALERT = PAIN_HOLD;

const GRADE_TONE: Record<DayGrade, SegmentTone> = {
  red: "danger",
  yellow: "warn",
  green: "active",
  grey: "default",
};

export default function KineWeekProgramme({
  weeks,
  currentWeekNumber,
  dayDetails,
  assignments,
  workoutsById,
  patientId,
  patientFirstName,
  addableExercises,
  bodyParts,
  addableWorkouts,
  adjustAction,
  assignAction,
  removeAction,
}: {
  weeks: WeekInfo[];
  currentWeekNumber: number;
  /** Séances réalisées, par jour (localDateKey) — avec douleur/difficulté/notes. */
  dayDetails: Record<string, SessionDetail[]>;
  assignments: KineAssignment[];
  workoutsById: Record<string, KineWorkoutSummary>;
  patientId: string;
  patientFirstName: string;
  addableExercises: AddableExercise[];
  bodyParts: BodyPart[];
  addableWorkouts: AddableWorkout[];
  adjustAction: (formData: FormData) => Promise<void>;
  assignAction: (formData: FormData) => void;
  removeAction: (formData: FormData) => void;
}) {
  const loggedDateKeys = useMemo(
    () => new Set(Object.keys(dayDetails).filter((k) => dayDetails[k].length > 0)),
    [dayDetails],
  );
  const todayKey = localDateKey(new Date());

  // Pour chaque semaine : la séance effective + la couleur du pire jour.
  const weekMeta = useMemo(
    () =>
      weeks.map((week) => {
        const assignment = resolveAssignmentForWeek(assignments, week.startDateKey);
        const workout = assignment ? (workoutsById[assignment.workoutId] ?? null) : null;
        const days = daysOfWeek(week, loggedDateKeys);
        const painAlert = days.some((d) =>
          (dayDetails[localDateKey(d.date)] ?? []).some((s) => s.painScore != null && s.painScore >= WEEK_PAIN_ALERT),
        );
        const hasActivity = days.some((d) => d.hasSession);
        return { week, assignment, workout, painAlert, hasActivity };
      }),
    [weeks, assignments, workoutsById, loggedDateKeys, dayDetails],
  );

  // ---- Navigation frise → semaine → jour (même mécanique que côté patient) --
  const [view, setView] = useState<"strip" | "week">("strip");
  const [selectedWeekNumber, setSelectedWeekNumber] = useState(currentWeekNumber);
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);

  const scrollerRef = useRef<HTMLDivElement>(null);
  // Téléphone (même principe que WeekProgramme côté patient) : une semaine
  // par écran, carte aussi haute que la place restante jusqu'à la barre
  // d'onglets — la boîte autour est en flex-1, on la mesure.
  const isPhone = useIsPhone();
  const stripBoxRef = useRef<HTMLDivElement>(null);
  const [phoneCardHeight, setPhoneCardHeight] = useState(248);
  useEffect(() => {
    const box = stripBoxRef.current;
    if (!box || !isPhone) return;
    // SegmentRow perView ajoute pt-10 pb-2 (48 px) autour des cartes.
    const update = () => setPhoneCardHeight(Math.max(200, Math.min(460, box.clientHeight - 48)));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(box);
    return () => ro.disconnect();
  }, [isPhone, view]);
  const currentCardRef = useRef<HTMLButtonElement>(null);
  // Recentrer sur la semaine en cours à l'ouverture de la frise, et une seule
  // fois de plus quand la hauteur des cartes est mesurée sur téléphone — pas
  // à chaque redimensionnement (la barre d'adresse du téléphone qui se
  // replie ramenait la frise sur la semaine en cours en pleine navigation).
  const centeredFor = useRef<string | null>(null);
  useEffect(() => {
    if (view !== "strip") {
      centeredFor.current = null;
      return;
    }
    const key = `${isPhone}|${isPhone && phoneCardHeight !== 248 ? "mesurée" : "initiale"}`;
    if (centeredFor.current === key) return;
    centeredFor.current = key;
    const el = currentCardRef.current;
    const scroller = scrollerRef.current;
    if (!el || !scroller) return;
    // El.scrollIntoView() ne fonctionne pas ici : les cartes de la frise se
    // chevauchent volontairement (marge négative + clip-path pour l'effet
    // flèche dans WeekStrip.tsx), ce qui fausse le calcul de position du
    // navigateur — il ne scrolle jamais (Philippe, 2026-09-09 : « la semaine
    // en cours ne s'affiche pas toute seule »). getBoundingClientRect() n'est
    // pas affecté par ce chevauchement, donc on calcule le scroll nous-mêmes.
    const elRect = el.getBoundingClientRect();
    const scrollerRect = scroller.getBoundingClientRect();
    const elOffsetInScroller = elRect.left - scrollerRect.left + scroller.scrollLeft;
    const target = elOffsetInScroller - scroller.clientWidth / 2 + elRect.width / 2;
    // Téléphone : « instant » — la frise a scroll-smooth, et une animation
    // encore en cours quand la hauteur des cartes change laissait la semaine
    // en cours hors champ (même correctif que WeekProgramme). Ordinateur inchangé.
    scroller.scrollTo({ left: Math.max(0, target), behavior: isPhone ? "instant" : undefined });
  }, [view, isPhone, phoneCardHeight]);

  useEffect(() => {
    if (!selectedDayKey) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedDayKey(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedDayKey]);

  const runViewTransition = (update: () => void) => runSharedViewTransition(update, flushSync);
  const openWeek = (n: number) => {
    if (n < 1 || n > weeks.length) return;
    runViewTransition(() => {
      setSelectedWeekNumber(n);
      setSelectedDayKey(null);
      setView("week");
    });
  };
  const closeWeek = () => runViewTransition(() => setView("strip"));
  const goToWeek = (n: number) => {
    if (n < 1 || n > weeks.length) return;
    setSelectedWeekNumber(n);
    setSelectedDayKey(null);
  };
  // Une semaine par clic : largeur d'une carte moins le chevauchement (16 px).
  const scrollStrip = (dir: 1 | -1) => {
    const scroller = scrollerRef.current;
    const card = scroller?.firstElementChild as HTMLElement | null;
    scroller?.scrollBy({ left: dir * ((card?.offsetWidth ?? 276) - 16), behavior: "smooth" });
  };

  // ---- Vue 1 : la frise des semaines -----------------------------------------
  if (view === "strip") {
    const weekItems: SegmentItem[] = weekMeta.map(({ week, workout, painAlert, hasActivity }) => {
      const isCurrent = week.weekNumber === currentWeekNumber;
      // Le rouge (douleur) prime sur tout : c'est l'info que le kiné doit voir
      // en premier. Sinon même logique que côté patient.
      const tone: SegmentTone = painAlert ? "danger" : hasActivity ? "active" : isCurrent ? "current" : "default";
      const workoutLabel = workout ? workout.name : "Aucune séance";
      return {
        key: String(week.weekNumber),
        tone,
        badge: isCurrent ? "Cette semaine" : undefined,
        viewTransitionName: `kine-week-${week.weekNumber}`,
        buttonRef: isCurrent ? currentCardRef : undefined,
        onClick: () => openWeek(week.weekNumber),
        ariaLabel: `Semaine ${week.weekNumber}, ${week.rangeLabel}, ${workoutLabel}${painAlert ? ", douleur élevée signalée" : ""}${
          hasActivity ? ", séances réalisées" : ""
        }${isCurrent ? " — semaine actuelle" : ""}`,
        content: (
          // Haut de la carte = semaine + dates (compact) ; bas de la carte
          // réservé aux illustrations (Philippe, 2026-09-09, 3e retour :
          // « réserve le bas pour les illustrations + le nom des exos, comme
          // ça les exos peuvent figurer un peu plus gros, et avoir leurs
          // noms qui vont avec »). justify-between étire ce bloc sur toute
          // la hauteur de la carte (h-full) pour séparer les deux zones.
          <div className="flex h-full w-full flex-col items-center justify-between gap-1">
            <div className="flex flex-col items-center">
              {/* « Semaine N » plutôt qu'un numéro seul, dates entre
                  parenthèses (Philippe, 2026-10-01). */}
              <span className="flex items-center gap-1.5 text-xl font-semibold">
                Semaine {week.weekNumber}
                {painAlert ? (
                  <AlertTriangle className="h-5 w-5" strokeWidth={2} />
                ) : (
                  hasActivity && <CheckCircle2 className="h-5 w-5" strokeWidth={2} />
                )}
              </span>
              <span className="text-xs font-medium opacity-90">({week.rangeLabel})</span>
              {/* Téléphone : la carte est haute — le nom de la séance et les 7
                  jours en pastilles (même couleur que la vue semaine : rouge
                  douleur, jaune à surveiller, vert fait), comme côté patient. */}
              {workout && <span className="mt-3 line-clamp-1 px-2 text-sm font-semibold sm:hidden">{workout.name}</span>}
              <span className="mt-3 flex gap-1.5 sm:hidden" aria-hidden>
                {daysOfWeek(week, loggedDateKeys).map((d) => {
                  const sessions = dayDetails[localDateKey(d.date)] ?? [];
                  const g = gradeDay(d.hasSession, sessions.map((s) => ({ painScore: s.painScore, difficulty: s.difficulty })));
                  const cls =
                    g === "red" ? "bg-danger text-white" : g === "yellow" ? "bg-warn text-white" : d.hasSession ? "bg-ok text-white" : "border border-current/25 bg-white/50";
                  return (
                    <span key={d.dayLabel} className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold ${cls}`}>
                      {d.dayLabel.charAt(0)}
                    </span>
                  );
                })}
              </span>
            </div>
            {workout && workout.exercises.length > 0 ? (
              <span className="flex w-full flex-wrap items-start justify-center gap-x-2 gap-y-2 px-1 pb-1 max-sm:gap-x-3 max-sm:gap-y-3">
                {workout.exercises.map((e) => (
                  <span key={e.id} className="flex w-[3.75rem] flex-col items-center gap-1 max-sm:w-[5rem]">
                    <ExerciseIllustration name={e.name} animate={false} className="h-14 w-14 shrink-0 max-sm:h-[4.5rem] max-sm:w-[4.5rem]" />
                    <span className="line-clamp-2 text-center text-[11px] font-medium leading-tight max-sm:text-xs">{e.name}</span>
                  </span>
                ))}
              </span>
            ) : (
              <span className={`line-clamp-2 px-1 pb-1 text-xs leading-tight ${workout ? "font-semibold" : "italic opacity-75"}`}>
                {workoutLabel}
              </span>
            )}
          </div>
        ),
      };
    });

    return (
      <div className="flex w-full min-w-0 flex-col max-sm:min-h-0 max-sm:flex-1">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink max-sm:text-base" title="Cliquez sur une semaine pour voir le détail jour par jour et changer la séance.">
            Programme<span className="max-sm:hidden">, semaine par semaine</span>
          </h2>
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Semaines précédentes"
              onClick={() => scrollStrip(-1)}
              className="rounded-full border border-line p-2 text-muted hover:bg-app-bg focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"
            >
              <ChevronLeft className="h-5 w-5" strokeWidth={2} />
            </button>
            <button
              type="button"
              aria-label="Semaines suivantes"
              onClick={() => scrollStrip(1)}
              className="rounded-full border border-line p-2 text-muted hover:bg-app-bg focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"
            >
              <ChevronRight className="h-5 w-5" strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* Même espacement que la démo de la landing (Philippe, 2026-10-02) :
            3 semaines visibles qui se partagent la largeur, la semaine en
            cours au centre ; hauteur réduite pour que toute la frise tienne
            à l'écran en arrivant sur la fiche. */}
        <div ref={stripBoxRef} className="max-sm:-mt-6 max-sm:min-h-0 max-sm:flex-1 sm:contents">
          {/* Téléphone (Philippe, 2026-10-10 : « plusieurs semaines à la fois,
              comme la frise du client ») : la semaine en cours au centre, la
              précédente et la suivante dépassent de chaque côté (1,5 carte
              par écran). Dès md : 3 semaines, inchangé. */}
          <SegmentRow
            items={weekItems}
            height={isPhone ? phoneCardHeight : 248}
            scrollable
            perView
            perViewClass="[--per:1.5] md:[--per:3]"
            snapCenter={isPhone}
            compact
            scrollerRef={scrollerRef}
          />
        </div>
      </div>
    );
  }

  // ---- Vue 2 : une semaine, jour par jour + assignation -----------------------
  const selectedMeta = weekMeta.find((m) => m.week.weekNumber === selectedWeekNumber) ?? weekMeta[weekMeta.length - 1];
  const selectedWeek = selectedMeta.week;
  const days = daysOfWeek(selectedWeek, loggedDateKeys);
  const selectedDaySessions = selectedDayKey ? (dayDetails[selectedDayKey] ?? []) : [];

  const dayItems: SegmentItem[] = days.map((d) => {
    const key = localDateKey(d.date);
    const sessions = dayDetails[key] ?? [];
    const isToday = key === todayKey;
    // Pastille colorée = pire ressenti du jour (lib/exercise/dayGrade.ts),
    // exactement ce que l'ancien calendrier affichait.
    const grade = gradeDay(d.hasSession, sessions.map((s) => ({ painScore: s.painScore, difficulty: s.difficulty })));
    const tone: SegmentTone = grade === "grey" && isToday ? "current" : GRADE_TONE[grade];
    const statusLabel = grade === "red" ? "Douleur élevée" : grade === "yellow" ? "À surveiller" : d.hasSession ? "Réalisée" : "Non fait";
    return {
      key,
      tone,
      badge: isToday ? "Aujourd'hui" : undefined,
      disabled: sessions.length === 0,
      ringSelected: selectedDayKey === key,
      onClick: () => setSelectedDayKey(selectedDayKey === key ? null : key),
      ariaLabel: `${d.dayLabel} ${d.dateLabel}, ${statusLabel.toLowerCase()}${isToday ? " — aujourd'hui" : ""}`,
      content: (
        <>
          <span className="text-sm font-semibold">{d.dayLabel}</span>
          <span className="text-[11px] opacity-80">{d.dateLabel}</span>
          {grade === "red" || grade === "yellow" ? (
            <AlertTriangle className="h-4 w-4" strokeWidth={2} />
          ) : d.hasSession ? (
            <CheckCircle2 className="h-4 w-4" strokeWidth={2} />
          ) : (
            <Circle className="h-4 w-4" strokeWidth={1.5} />
          )}
          <span className="text-[11px]">{statusLabel}</span>
        </>
      ),
    };
  });

  const closeDayDetail = () => setSelectedDayKey(null);
  const startedEarlier = selectedMeta.assignment && selectedMeta.assignment.weekStartDate < selectedWeek.startDateKey;
  const startedWeekNumber = startedEarlier
    ? weeks.find((w) => w.startDateKey === selectedMeta.assignment!.weekStartDate)?.weekNumber
    : undefined;
  // N° de la semaine où l'attribution commence (pour « semaines X à Y »).
  const assignmentStartWeek = startedWeekNumber ?? selectedWeek.weekNumber;

  return (
    <div className="w-full max-sm:flex max-sm:min-h-0 max-sm:flex-1 max-sm:flex-col">
      <section
        style={{ viewTransitionName: `kine-week-${selectedWeek.weekNumber}` } as VTStyle}
        className="rounded-2xl border border-line bg-surface p-5 shadow-sm max-sm:flex max-sm:min-h-0 max-sm:flex-1 max-sm:flex-col max-sm:border-0 max-sm:p-4 max-sm:shadow-soft"
      >
        <button type="button" onClick={closeWeek} className="flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
          <ArrowLeft className="h-4 w-4" strokeWidth={2} />
          Toutes les semaines
        </button>

        <div className="mt-3 flex flex-wrap items-start justify-between gap-4 max-sm:mt-2 max-sm:gap-2">
          <div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Semaine précédente"
                onClick={() => goToWeek(selectedWeek.weekNumber - 1)}
                disabled={selectedWeek.weekNumber <= 1}
                className="rounded-full p-1 text-muted hover:bg-app-bg disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" strokeWidth={2} />
              </button>
              <h2 className="text-lg font-semibold text-ink">{selectedWeek.label}</h2>
              <button
                type="button"
                aria-label="Semaine suivante"
                onClick={() => goToWeek(selectedWeek.weekNumber + 1)}
                disabled={selectedWeek.weekNumber >= weeks.length}
                className="rounded-full p-1 text-muted hover:bg-app-bg disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>
            <p className="text-sm text-muted">{selectedWeek.rangeLabel}</p>
          </div>

          {/* Séance effective cette semaine + le bouton pour la changer À
              PARTIR de cette semaine. « Ajuster » / « Retirer » agissent sur
              l'assignation effective, même si elle a commencé plus tôt —
              retirer cette ligne fait revenir la précédente (voulu). */}
          <div className="flex flex-wrap items-center gap-3 max-sm:w-full max-sm:flex-nowrap max-sm:justify-between max-sm:rounded-xl max-sm:bg-app-bg max-sm:px-3 max-sm:py-2">
            <div className="text-right max-sm:min-w-0 max-sm:text-left">
              <p className="text-xs font-medium text-muted">Séance cette semaine</p>
              <p className={`text-sm ${selectedMeta.workout ? "font-semibold text-ink" : "italic text-muted"}`}>
                {selectedMeta.workout ? selectedMeta.workout.name : "Aucune séance"}
                {selectedMeta.workout && selectedMeta.assignment?.weekCount ? (
                  <span className="ml-1 text-xs font-normal text-muted">
                    ({selectedMeta.assignment.weekCount === 1
                      ? "cette semaine seulement"
                      : `semaines ${assignmentStartWeek} à ${assignmentStartWeek + selectedMeta.assignment.weekCount - 1}`})
                  </span>
                ) : (
                  selectedMeta.workout &&
                  startedWeekNumber && <span className="ml-1 text-xs font-normal text-muted">(depuis la semaine {startedWeekNumber})</span>
                )}
              </p>
            </div>
            <AdjustWorkoutModal
              // Key sur la semaine : la modale repart de zéro (vue, filtres)
              // quand le kiné change de semaine sans la fermer.
              key={selectedWeek.startDateKey}
              patientId={patientId}
              patientFirstName={patientFirstName}
              workout={selectedMeta.workout}
              recId={selectedMeta.assignment?.id ?? null}
              addableExercises={addableExercises}
              bodyParts={bodyParts}
              addableWorkouts={addableWorkouts.filter((w) => w.id !== selectedMeta.workout?.id)}
              adjustAction={adjustAction}
              assignAction={assignAction}
              removeAction={removeAction}
              weekStartDate={selectedWeek.startDateKey}
              weekLabel={`${selectedWeek.label} · ${selectedWeek.rangeLabel}`}
            />
          </div>
        </div>

        <div className="max-sm:hidden sm:contents">
          <SegmentRow items={dayItems} height={172} scrollable={false} />
        </div>

        {/* Téléphone : les 7 jours en frise verticale, comme côté patient
            (WeekProgramme) — même couleur que la flèche du jour sur
            ordinateur (pire ressenti : rouge douleur, jaune à surveiller,
            vert fait). Les 7 lignes se partagent la hauteur restante. */}
        <ol className="relative mt-3 flex min-h-0 flex-1 flex-col sm:hidden">
          <span aria-hidden className="absolute bottom-5 left-[15px] top-5 w-0.5 bg-line" />
          {days.map((d) => {
            const key = localDateKey(d.date);
            const sessions = dayDetails[key] ?? [];
            const isToday = key === todayKey;
            const grade = gradeDay(d.hasSession, sessions.map((s) => ({ painScore: s.painScore, difficulty: s.difficulty })));
            const statusLabel = grade === "red" ? "Douleur élevée" : grade === "yellow" ? "À surveiller" : d.hasSession ? "Réalisée" : "Non fait";
            const dot =
              grade === "red"
                ? "border-danger bg-danger text-white"
                : grade === "yellow"
                  ? "border-warn bg-warn text-white"
                  : d.hasSession
                    ? "border-ok bg-ok text-white"
                    : isToday
                      ? "border-brand bg-surface text-brand"
                      : "border-line bg-surface text-muted";
            const row =
              grade === "red"
                ? "border-danger-soft bg-danger-soft text-danger"
                : grade === "yellow"
                  ? "border-warn-soft bg-warn-soft text-warn"
                  : d.hasSession
                    ? "border-ok-soft bg-ok-soft text-ok"
                    : isToday
                      ? "border-brand bg-brand/10 text-brand"
                      : "border-line bg-surface text-muted";
            const worstPain = sessions.reduce<number | null>((m, s) => (s.painScore != null && (m === null || s.painScore > m) ? s.painScore : m), null);
            return (
              <li key={key} className="relative flex min-h-0 flex-1 items-center">
                <button
                  type="button"
                  disabled={sessions.length === 0}
                  onClick={() => setSelectedDayKey(selectedDayKey === key ? null : key)}
                  aria-label={`${d.dayLabel} ${d.dateLabel}, ${statusLabel.toLowerCase()}${isToday ? " — aujourd'hui" : ""}`}
                  className="flex w-full items-center gap-3 py-0.5 text-left"
                >
                  <span className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 ${dot}`}>
                    {grade === "red" || grade === "yellow" ? (
                      <AlertTriangle className="h-4 w-4" strokeWidth={2.25} />
                    ) : d.hasSession ? (
                      <CheckCircle2 className="h-4 w-4" strokeWidth={2.25} />
                    ) : (
                      <Circle className="h-2.5 w-2.5 fill-current" strokeWidth={0} />
                    )}
                  </span>
                  <span className={`flex min-w-0 flex-1 items-center justify-between gap-2 rounded-xl border px-3 py-2.5 ${row}`}>
                    <span className="flex min-w-0 items-baseline gap-2">
                      <span className="text-base font-semibold capitalize">{d.dayLabel}</span>
                      <span className="truncate text-sm opacity-80">{d.dateLabel}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1.5 text-xs font-medium">
                      {isToday && <span className="rounded-full bg-brand px-2 py-0.5 text-[11px] font-semibold text-white">Aujourd&apos;hui</span>}
                      {statusLabel}
                      {worstPain !== null && <span className="tabular-nums">· {worstPain}/10</span>}
                      {sessions.length > 0 && <ChevronRight className="h-3.5 w-3.5" strokeWidth={2} />}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </section>

      {/* Détail du jour cliqué : nom de la séance, heure, douleur, difficulté,
          notes — l'info que le calendrier mensuel affichait « sous » la grille. */}
      {selectedDayKey && selectedDaySessions.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 p-4" onClick={closeDayDetail}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Détail de la journée"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl bg-surface p-5 shadow-xl [animation:popIn_0.35s_ease-out_both]"
          >
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-base font-semibold text-ink">Détail de la journée</h2>
              <button type="button" aria-label="Fermer" onClick={closeDayDetail} className="rounded-full p-1 text-muted hover:bg-app-bg hover:text-ink">
                <X className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>
            <div className="mt-3 flex flex-col gap-4">
              {selectedDaySessions.map((s) => {
                const painHigh = s.painScore != null && s.painScore >= WEEK_PAIN_ALERT;
                return (
                  <div key={s.logId}>
                    <p className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                      {painHigh ? (
                        <AlertTriangle className="h-4 w-4 shrink-0 text-danger" strokeWidth={1.75} />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-ok" strokeWidth={1.75} />
                      )}
                      {s.workoutName ?? "Séance"}
                    </p>
                    <p className="mt-1 text-xs text-muted">Terminée à {s.time}</p>
                    <ul className="mt-2 space-y-1 text-xs text-muted">
                      {s.durationMinutes != null && <li>{s.durationMinutes} min</li>}
                      {s.painScore != null && <li className={painHigh ? "font-semibold text-danger" : ""}>Douleur {s.painScore}/10</li>}
                      {s.difficulty != null && <li>Difficulté {s.difficulty}/10</li>}
                      {s.notes && <li>« {s.notes} »</li>}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
