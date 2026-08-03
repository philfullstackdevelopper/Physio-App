-- Physio-App — Migration 0014: exercise demonstration videos
-- Run once in Supabase (SQL Editor -> New query -> paste -> Run). Safe to re-run.
--
-- Adds a storage bucket so instructors can upload their own demonstration videos
-- for exercises they created. Files are stored at path "<exercise_id>/<filename>",
-- so the first folder segment identifies which exercise the video belongs to.
--
-- The bucket is PUBLIC (unlike patient-documents): exercise demo videos are
-- generic instructional content, not per-patient health data, and the app
-- already links out to arbitrary external video URLs for the same purpose —
-- this is no more exposed than that. Public read means the app can play the
-- video directly with a plain <video> tag, no signed URLs needed.
--
-- Writes (upload/replace/delete) stay restricted: only the instructor who owns
-- the exercise (exercises.created_by = auth.uid()) may write into its folder.
-- This mirrors the exercises_update_own / exercises_delete_own policies already
-- on the exercises table (0001_initial_schema.sql) — platform exercises
-- (created_by is null) can never receive an instructor-uploaded video.

insert into storage.buckets (id, name, public)
values ('exercise-media', 'exercise-media', true)
on conflict (id) do update set public = true;

drop policy if exists exercise_media_public_read on storage.objects;
create policy exercise_media_public_read on storage.objects
  for select to public
  using (bucket_id = 'exercise-media');

drop policy if exists exercise_media_owner_write on storage.objects;
create policy exercise_media_owner_write on storage.objects
  for all to authenticated
  using (
    bucket_id = 'exercise-media'
    and exists (
      select 1 from public.exercises e
      where e.id::text = (storage.foldername(name))[1]
        and e.created_by = auth.uid()
    )
  )
  with check (
    bucket_id = 'exercise-media'
    and exists (
      select 1 from public.exercises e
      where e.id::text = (storage.foldername(name))[1]
        and e.created_by = auth.uid()
    )
  );
