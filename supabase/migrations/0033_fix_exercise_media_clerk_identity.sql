-- Physio-App — Migration 0033: fix exercise-video uploads broken since Clerk
--
-- Migration 0031 replaced auth.uid() with public.current_app_user_id() in
-- every RLS *policy* after the Clerk migration, but missed two spots that
-- also check identity and live outside a plain policy:
--
--   1. public.set_exercise_media() (0022) — a SECURITY DEFINER function the
--      video-upload button calls to save the URL. Its internal check used
--      auth.uid(), which throws "invalid input syntax for type uuid" for a
--      Clerk-issued JWT (same root cause 0031 fixed) — so every upload
--      attempt has been silently failing ever since. Confirmed by the data:
--      0 exercises currently have a real Supabase-storage media_url.
--
--   2. The "exercise_media_owner_write" storage policy (0014), which gates
--      who may write into the exercise-media bucket — same auth.uid() bug,
--      so even if the RPC above were fixed alone, the file upload itself
--      would still be rejected.
--
-- Both are fixed below by swapping in public.current_app_user_id(), exactly
-- like every other policy already was in 0031.
--
-- Separately: 8 of the 12 exercises that already have a media_url were
-- seeded with a YouTube *search-results* link (e.g. "youtube.com/results?
-- search_query=..."), not a link to any specific video — not a real
-- demonstration, just a search page. Those are cleared back to null so the
-- app shows its normal "Démonstration à venir" placeholder instead of a
-- dead-end link. The other 4 are genuine "youtube.com/watch?v=..." links
-- and are left as-is — those already play correctly.

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
  if not exists (select 1 from public.instructors where id = public.current_app_user_id()) then
    raise exception 'not an instructor';
  end if;

  update public.exercises
  set media_url = p_media_url,
      media_start_seconds = greatest(0, p_start_seconds)
  where id = p_exercise_id;
end;
$$;

drop policy if exists exercise_media_owner_write on storage.objects;
create policy exercise_media_owner_write on storage.objects
  for all to authenticated
  using (
    bucket_id = 'exercise-media'
    and exists (
      select 1 from public.exercises e
      where e.id::text = (storage.foldername(name))[1]
        and e.created_by = public.current_app_user_id()
    )
  )
  with check (
    bucket_id = 'exercise-media'
    and exists (
      select 1 from public.exercises e
      where e.id::text = (storage.foldername(name))[1]
        and e.created_by = public.current_app_user_id()
    )
  );

update public.exercises
set media_url = null,
    media_start_seconds = 0
where media_url like '%results?search_query%';
