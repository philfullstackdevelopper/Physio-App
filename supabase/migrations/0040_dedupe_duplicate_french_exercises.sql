-- Physio-App — Migration 0040: dedupe exact-duplicate French exercises
-- Run once in Supabase: SQL Editor -> New query -> paste -> Run. Safe to re-run
-- (each step is a no-op once the duplicates are gone).
--
-- Root cause: an unintentional re-seed on 2026-08-27 re-inserted 33 exercises
-- that already existed (mostly from the 2026-08-15 batch), each under a new
-- id, with identical (or in one case, near-identical wording, same movement)
-- name + instructions. Confirmed via the live data, not a hypothesis:
--   - Exactly 33 exercise names have 2 rows each; none have 3+.
--   - Every one of those 33 pairs is already referenced by at least one
--     platform-template séance (workout_exercises) — and several séances
--     currently list the SAME exercise twice as separate rows, a real
--     visible bug for any kiné/patient looking at that séance today, not
--     just unused database clutter.
--   - Only two tables reference exercises(id): workout_exercises and
--     exercise_body_parts (both ON DELETE CASCADE already).
--
-- This migration keeps the earliest-created row of each duplicate pair and
-- removes the later one, after repointing every reference so no séance's
-- exercise list changes content — only the duplicate entry disappears.

-- ---------------------------------------------------------------------------
-- 1. Where a séance already lists BOTH copies as separate rows, just drop
--    the later (duplicate) row — the earlier one already covers it.
-- ---------------------------------------------------------------------------
with dupes as (
  select name, array_agg(id order by created_at) as ids
  from public.exercises
  where created_at < '2026-08-29'
  group by name
  having count(*) > 1
),
pair as (
  select ids[1] as keep_id, ids[2] as drop_id from dupes
)
delete from public.workout_exercises we
using pair p
where we.exercise_id = p.drop_id
  and exists (
    select 1 from public.workout_exercises we2
    where we2.workout_id = we.workout_id and we2.exercise_id = p.keep_id
  );

-- ---------------------------------------------------------------------------
-- 2. Any remaining reference to the later (duplicate) copy — a séance that
--    has the duplicate but not the original — gets repointed to the kept id.
-- ---------------------------------------------------------------------------
with dupes as (
  select name, array_agg(id order by created_at) as ids
  from public.exercises
  where created_at < '2026-08-29'
  group by name
  having count(*) > 1
),
pair as (
  select ids[1] as keep_id, ids[2] as drop_id from dupes
)
update public.workout_exercises we
set exercise_id = p.keep_id
from pair p
where we.exercise_id = p.drop_id;

-- ---------------------------------------------------------------------------
-- 3. Delete the now-unreferenced duplicate exercise rows. Cascades to
--    exercise_body_parts for that id — harmless, the kept id already carries
--    the same (or equivalent) body-part tags.
-- ---------------------------------------------------------------------------
with dupes as (
  select name, array_agg(id order by created_at) as ids
  from public.exercises
  where created_at < '2026-08-29'
  group by name
  having count(*) > 1
),
pair as (
  select ids[1] as keep_id, ids[2] as drop_id from dupes
)
delete from public.exercises e
using pair p
where e.id = p.drop_id;
