# Séances recommandées (liste ordonnée) + simplification calendrier kiné

Date: 2026-08-29
Status: approved, not yet implemented

## Context

The kiné's patient detail page (`app/dashboard/patients/[id]/page.tsx`) already
has a month calendar (colors from post-session pain/difficulty — see the
2026-08-28 work that added `lib/exercise/dayGrade.ts` and
`components/PatientCalendar.tsx`). This spec covers the next round of changes,
requested together but decomposed here because they differ a lot in size:

1. Support several recommended workouts per patient, in priority order, with
   automatic hand-off to the next one once the current one's weekly target is
   met.
2. Simplify the kiné's page: the left side shows only that recommended list
   (not the whole condition's workout library) plus a simple add/remove UI.
3. Calendar interaction: hover a day for a quick peek at the post-session
   feeling, click for the full detail (already-built calendar, small addition).
4. Remove the per-exercise feedback system product-wide (patient-side capture,
   auto-easing, adaptation suggestions, manual overrides) — replaced by
   "the only feedback we keep is the one post-session rating."

Pieces 1 and 4 are real product changes (schema, patient-facing behavior,
deleting a working feature), which is why this is written down before coding
rather than built inline.

## Goals

- A patient always has at most one "active" workout to do, decided
  automatically from the kiné's ordered recommendation list and this week's
  completions.
- The kiné can see and edit that ordered list with a minimal UI (add, remove,
  reorder).
- The kiné's page stops showing per-exercise granularity entirely.
- Nothing on the patient side asks for more than one feeling rating per
  session.

## Non-goals

- No change to the pain/difficulty *values* captured post-session, or to the
  calendar's color rule (`lib/exercise/dayGrade.ts` is untouched).
- No UI for the patient to browse/pick among workouts themselves — the choice
  stays entirely the kiné's, expressed through priority order.
- No drag-and-drop reordering — simple ▲▼ buttons are enough.

## Data model — migration `0035`

```sql
-- 0035_patient_recommended_workouts.sql

create table public.patient_recommended_workouts (
  id          uuid primary key default gen_random_uuid(),
  patient_id  uuid not null references public.patients (id) on delete cascade,
  workout_id  uuid not null references public.workouts (id) on delete cascade,
  priority    int not null,
  created_at  timestamptz not null default now(),
  unique (patient_id, workout_id)
);

create index idx_recwk_patient on public.patient_recommended_workouts (patient_id, priority);

alter table public.patient_recommended_workouts enable row level security;

-- The owning instructor manages their own patients' recommendations.
create policy recwk_instructor_all on public.patient_recommended_workouts
  for all to authenticated
  using (exists (select 1 from public.patients p
                 where p.id = patient_recommended_workouts.patient_id and p.instructor_id = auth.uid()))
  with check (exists (select 1 from public.patients p
                       where p.id = patient_recommended_workouts.patient_id and p.instructor_id = auth.uid()));

-- The patient reads (not writes) their own list — lib/patient/home-data.ts
-- queries it (server-side, with the patient's own session) to compute their
-- active workout.
create policy recwk_patient_read on public.patient_recommended_workouts
  for select to authenticated
  using (patient_id = auth.uid());

-- Old single-recommendation column retired — one source of truth.
alter table public.patients drop column if exists recommended_workout_id;
```

`assignCondition` (`app/dashboard/patients/[id]/actions.ts`) currently clears
`recommended_workout_id` when the condition changes; it will instead delete
all rows from `patient_recommended_workouts` for that patient.

## Shared logic — `lib/exercise/activeRecommendation.ts`

A pure function, same spirit as `gradeDay`, so the patient app and the kiné
dashboard can never disagree about which workout is "active":

```ts
export interface RecommendedWorkout {
  workoutId: string;
  priority: number;       // lower = higher priority
  timesPerWeek: number | null;
}

// Returns the workoutId of the lowest-priority (i.e. first) recommended
// workout whose weekly target isn't met yet, or null if the list is empty or
// every target is already met this week.
//
// A null timesPerWeek is treated as "met after 1 session" — a workout with no
// declared weekly target shouldn't block the list forever.
export function pickActiveWorkout(
  recommended: RecommendedWorkout[],
  weekCounts: Record<string, number>,
): string | null {
  const ordered = [...recommended].sort((a, b) => a.priority - b.priority);
  for (const r of ordered) {
    const target = r.timesPerWeek ?? 1;
    if ((weekCounts[r.workoutId] ?? 0) < target) return r.workoutId;
  }
  return null;
}
```

## Patient-side change

`lib/patient/home-data.ts`:
- Replace the `patients.recommended_workout_id` read with a
  `patient_recommended_workouts` read (joined to `workouts` for
  name/duration/times_per_week/exercises).
- Replace `ordered` (today: every workout of the current stage, recommended
  one first) with a single active workout from `pickActiveWorkout`.
- `PatientHome.ordered`/`doneWorkouts`/`remainingWorkouts` collapse to at most
  one workout; keep the field shapes where reasonably possible to limit
  changes in `app/patient/page.tsx` and `app/patient/[workoutId]/seance/page.tsx`.
- When `pickActiveWorkout` returns null and the list is non-empty, show a
  "programme de la semaine terminé" state instead of "Programme à venir."

## Kiné dashboard — left column

Replace the current "Séances disponibles" section (every workout of the
condition, one exclusive Recommander/Retirer button) with:

- The recommended list in priority order: name, target, "fait X/Y cette
  semaine," the active one visually highlighted.
- ▲▼ buttons per row to swap priority with the neighbor (simplest possible
  reorder — swaps two `priority` values, no drag-and-drop).
- A "Retirer" button per row (deletes that one row).
- A collapsed "+ Ajouter une séance" control below the list, listing the
  condition's workouts not already recommended, appending at the end
  (`priority = max + 1`) on add.

New server actions in `app/dashboard/patients/[id]/actions.ts`:
`addRecommendedWorkout`, `removeRecommendedWorkout`, `moveRecommendedWorkout`
(swap with previous/next). `recommendWorkout` is deleted.

## Calendar — hover vs. click

`components/PatientCalendar.tsx`: add a `title`/small tooltip on hover for
colored days (short one-line feeling summary), keep the existing click →
detail box behavior unchanged. No data/query changes — `detail` already
carries everything needed.

## Removal — per-exercise feedback system

Deleted entirely:
- Per-exercise inputs and `perExerciseFeedback` state in
  `components/WorkoutSession.tsx`, and the `exercise_feedback` insert in
  `saveFeeling()`.
- `lib/exercise/autoEase.ts`, `lib/exercise/adaptation.ts`,
  `lib/exercise/overrides.ts`.
- `exercise_overrides` and `exercise_feedback` tables (new migration `0036`
  drops both) — removed rather than kept as an unreachable manual tool, since
  the only UI that ever wrote to `exercise_overrides` was the adaptation
  suggestion this spec removes.
- The "Ressenti par exercice" section, `applyAdaptation`/`resetAdaptation`
  actions, and the `candidatesFor`/`exStageRank`/`exCategory` substitution
  plumbing on the kiné page (nothing else uses it once that section is gone).
- `recentDifficulty` computation in `app/patient/[workoutId]/seance/page.tsx`
  and the kiné detail page.

Kept unchanged: `lib/exercise/prescription.ts` (`recommendPrescription`) — the
baseline rep target from the patient's declared profile/stage has nothing to
do with per-exercise feedback.

## Edge cases / decisions

- `times_per_week = null` → treated as target 1 (see `pickActiveWorkout`).
- Deleting a `workouts` row that's currently recommended cascades and removes
  it from the list (existing `on delete cascade` pattern, same as today).
- Changing a patient's condition clears their whole recommended list (extends
  the existing "changing condition clears the recommendation" rule).

## Verification plan

No test runner exists in this project (`package.json` has no test script) —
consistent with the rest of the codebase, this ships without one. Verification
is manual, same as prior changes this session:
1. `npx tsc --noEmit` — zero new errors.
2. Run the two new/changed migrations locally, confirm no error.
3. In the browser (Philippe, logged in as the kiné): add 2 recommended
   workouts to a test patient, reorder them, complete one on the patient side
   enough times to hit its weekly target, confirm the kiné page and the
   patient's home page both switch to the next one.
4. Confirm the "Ressenti par exercice" section and per-exercise inputs are
   gone from both surfaces, and nothing throws where they used to render.
