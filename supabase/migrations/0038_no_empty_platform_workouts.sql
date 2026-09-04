-- Physio-App — Migration 0038: platform template workouts must have exercises
--
-- Rule: a platform template workout (created_by is null) with zero exercises
-- is not a usable séance — it offers an instructor nothing to duplicate. This
-- deliberately does NOT apply to instructor-owned workouts ("mine"): those
-- are created empty on purpose by the "Créer et composer" flow (create the
-- workout row, then redirect the instructor to add exercises to it), so an
-- instructor's own in-progress séance must be allowed to sit at 0 exercises
-- indefinitely.
--
-- 1. One-time cleanup, written as a live query rather than a hardcoded id
--    list: this file was originally authored against a specific snapshot
--    (196 empty platform templates at the time), but was never actually
--    applied, and the id list had since drifted from the live count.
--    Re-verified against the current database (196 safe to delete, 2
--    excluded for real patient history — the same split the original
--    authoring found), so this now computes the set live instead of
--    trusting a stale snapshot:
--      - Platform templates (created_by is null) with real workout_logs
--        rows attached (patients who completed a session before its
--        exercises got orphaned by an earlier cleanup) are excluded —
--        deleting the workout would cascade-delete that patient history,
--        which nobody asked for. Left alone; needs a human decision
--        (re-populate exercises, or decide the log/workout can go), not an
--        automatic delete.
--
-- 2. Going forward: a trigger enforces the same rule automatically whenever
--    a workout_exercises row is deleted (e.g. an exercise gets dropped
--    upstream and cascades) — if that leaves a platform template at 0
--    exercises AND it still has no workout_logs, the now-empty template is
--    removed. Same collateral-damage guard as the one-time cleanup: a
--    platform template with real patient history is never auto-deleted.

-- ---------------------------------------------------------------------------
-- 1. One-time cleanup — delete empty, log-free platform templates (live).
-- ---------------------------------------------------------------------------

-- 2026-09-04 correction: also excludes templates with an active patient
-- recommendation (patient_recommended_workouts) — the first run of this
-- migration did not, and cascaded away one test patient's recommendation
-- for a template that had no completed session yet but was actively
-- assigned. See the trigger function below for the same fix, applied there
-- too since it's the one that runs going forward.
delete from public.workouts w
where w.created_by is null
  and not exists (select 1 from public.workout_exercises we where we.workout_id = w.id)
  and not exists (select 1 from public.workout_logs wl where wl.workout_id = w.id)
  and not exists (select 1 from public.patient_recommended_workouts prw where prw.workout_id = w.id);

-- ---------------------------------------------------------------------------
-- 2. Going forward: enforce it automatically.
-- ---------------------------------------------------------------------------

create or replace function public.cleanup_empty_platform_workout()
returns trigger
language plpgsql
as $$
begin
  -- Only platform templates (created_by is null) are auto-removed when
  -- empty. Instructor-owned workouts intentionally start empty during the
  -- "créer et composer" flow and must never be touched here. A platform
  -- template with real patient history (workout_logs) OR an active patient
  -- recommendation (patient_recommended_workouts) is left alone — both need
  -- a human decision, not a silent delete. (2026-09-04: the original version
  -- of this function only checked workout_logs, and a template that was
  -- actively recommended to a patient but had no completed session yet got
  -- deleted, cascading away that patient's recommendation. Fixed.)
  delete from public.workouts w
  where w.id = old.workout_id
    and w.created_by is null
    and not exists (select 1 from public.workout_exercises we where we.workout_id = w.id)
    and not exists (select 1 from public.workout_logs wl where wl.workout_id = w.id)
    and not exists (select 1 from public.patient_recommended_workouts prw where prw.workout_id = w.id);
  return old;
end;
$$;

drop trigger if exists trg_cleanup_empty_platform_workout on public.workout_exercises;
create trigger trg_cleanup_empty_platform_workout
after delete on public.workout_exercises
for each row
execute function public.cleanup_empty_platform_workout();
