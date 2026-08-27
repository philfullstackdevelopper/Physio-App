-- Physio-App — Migration 0022: attach demo videos to the shared exercise library
-- Run once in Supabase (SQL Editor -> New query -> paste -> Run). Idempotent.
--
-- Two things:
-- 1. media_start_seconds — where in the uploaded clip the actual movement
--    starts (skip any intro/setup), so the patient's guided screen can seek
--    straight there and loop that segment instead of replaying the intro.
-- 2. set_exercise_media() — a narrow function letting any authenticated
--    instructor attach a video to ANY exercise, including the shared
--    platform library (created_by is null), which exercises_update_own
--    otherwise keeps read-only to instructors. It only ever touches
--    media_url / media_start_seconds — name, instructions, created_by stay
--    untouchable through this path. Safe while there's a single trusted
--    instructor account; if the platform later hosts multiple independent
--    practices sharing this library, this should narrow to a curator role.

alter table public.exercises
  add column if not exists media_start_seconds integer not null default 0;

create or replace function public.set_exercise_media(
  p_exercise_id uuid,
  p_media_url text,
  p_start_seconds integer default 0
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.instructors where id = auth.uid()) then
    raise exception 'not an instructor';
  end if;

  update public.exercises
  set media_url = p_media_url,
      media_start_seconds = greatest(0, p_start_seconds)
  where id = p_exercise_id;
end;
$$;

grant execute on function public.set_exercise_media(uuid, text, integer) to authenticated;

-- Storage: any instructor may upload a demo video into any exercise's folder
-- in the exercise-media bucket, not just exercises they created (same
-- rationale as set_exercise_media above).
drop policy if exists exercise_media_owner_write on storage.objects;
drop policy if exists exercise_media_instructor_write on storage.objects;
create policy exercise_media_instructor_write on storage.objects
  for all to authenticated
  using (
    bucket_id = 'exercise-media'
    and exists (select 1 from public.instructors i where i.id = auth.uid())
  )
  with check (
    bucket_id = 'exercise-media'
    and exists (select 1 from public.instructors i where i.id = auth.uid())
  );
