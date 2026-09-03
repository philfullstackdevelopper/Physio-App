-- Physio-App — Migration 0041: merge exercises with byte-identical instructions
-- Run once in Supabase: SQL Editor -> New query -> paste -> Run. Safe to re-run
-- (each step is a no-op once the duplicates are gone).
--
-- Follow-up to 0040. That migration fixed exact-duplicate rows (same name,
-- same instructions). This one covers a subtler case found in the same
-- audit: several exercises have DIFFERENT names (usually a condition tag,
-- e.g. "(genou arthrose)" or "(sciatique)") but IDENTICAL instructions text
-- — meaning the patient is told to do the exact same movement either way.
-- 7 such groups exist (15 rows total), confirmed by grouping on the
-- `instructions` column itself, not name similarity — an objective signal,
-- not a judgment call about which variants are "close enough."
--
-- Same safe pattern as 0040: for each group, keep the earliest-created row,
-- repoint every séance reference to it, then remove the redundant rows.
-- No séance's exercise list changes content.

-- ---------------------------------------------------------------------------
-- 1. Where a séance already lists both the kept row and a redundant row,
--    just drop the redundant row.
-- ---------------------------------------------------------------------------
with dupes as (
  select instructions, array_agg(id order by created_at) as ids
  from public.exercises
  where created_at < '2026-08-29'
  group by instructions
  having count(*) > 1
),
pair as (
  select ids[1] as keep_id, unnest(ids[2:array_length(ids, 1)]) as drop_id
  from dupes
)
delete from public.workout_exercises we
using pair p
where we.exercise_id = p.drop_id
  and exists (
    select 1 from public.workout_exercises we2
    where we2.workout_id = we.workout_id and we2.exercise_id = p.keep_id
  );

-- ---------------------------------------------------------------------------
-- 2. Any remaining reference to a redundant row gets repointed to the kept
--    row.
-- ---------------------------------------------------------------------------
with dupes as (
  select instructions, array_agg(id order by created_at) as ids
  from public.exercises
  where created_at < '2026-08-29'
  group by instructions
  having count(*) > 1
),
pair as (
  select ids[1] as keep_id, unnest(ids[2:array_length(ids, 1)]) as drop_id
  from dupes
)
update public.workout_exercises we
set exercise_id = p.keep_id
from pair p
where we.exercise_id = p.drop_id;

-- ---------------------------------------------------------------------------
-- 3. Delete the now-unreferenced redundant rows. Cascades to
--    exercise_body_parts — harmless, the kept row already carries the same
--    (or equivalent) body-part tags.
-- ---------------------------------------------------------------------------
with dupes as (
  select instructions, array_agg(id order by created_at) as ids
  from public.exercises
  where created_at < '2026-08-29'
  group by instructions
  having count(*) > 1
),
pair as (
  select ids[1] as keep_id, unnest(ids[2:array_length(ids, 1)]) as drop_id
  from dupes
)
delete from public.exercises e
using pair p
where e.id = p.drop_id;
