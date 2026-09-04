-- Physio-App — Migration 0045: message follow-up flag + attachments
-- Run once in Supabase: SQL Editor -> New query -> paste -> Run. Safe to re-run.
--
-- ADDITIVE. Two things the redesigned /dashboard/messages inbox needs:
--   1. patients.follow_up_at — the kiné bookmarks a conversation ("Ajouter un
--      suivi"); null = no follow-up. Only the owning kiné may set it (existing
--      instructor UPDATE policy on patients covers this).
--   2. patient_messages.attachment_path / attachment_name — one optional file
--      per message, stored in a private bucket `message-attachments` under
--      "<patient_id>/<uuid>-<name>" so the first folder segment names the
--      patient, exactly like patient-documents (migration 0006).

alter table public.patients
  add column if not exists follow_up_at timestamptz;

alter table public.patient_messages
  add column if not exists attachment_path text,
  add column if not exists attachment_name text,
  drop constraint if exists patient_messages_body_or_attachment,
  add constraint patient_messages_body_or_attachment
    check (length(trim(body)) > 0 or attachment_path is not null);

-- Re-create the 0039 guard so the new attachment columns are frozen too:
-- only the read markers may ever change on an existing message.
create or replace function public.patient_messages_guard_read_marker_only()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.read_at is distinct from old.read_at
     and old.patient_id is distinct from public.current_app_user_id() then
    raise exception 'only the patient may move read_at';
  end if;
  if new.read_by_instructor_at is distinct from old.read_by_instructor_at
     and old.instructor_id is distinct from public.current_app_user_id() then
    raise exception 'only the instructor may move read_by_instructor_at';
  end if;
  if new.id is distinct from old.id
     or new.patient_id is distinct from old.patient_id
     or new.instructor_id is distinct from old.instructor_id
     or new.sender is distinct from old.sender
     or new.body is distinct from old.body
     or new.created_at is distinct from old.created_at
     or new.attachment_path is distinct from old.attachment_path
     or new.attachment_name is distinct from old.attachment_name then
    raise exception 'patient_messages rows may only have their read marker updated, not their content';
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Private bucket for attachments. Same folder convention as patient-documents.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('message-attachments', 'message-attachments', false)
on conflict (id) do nothing;

-- The patient reads and uploads under their own folder.
drop policy if exists message_attachments_patient_rw on storage.objects;
create policy message_attachments_patient_rw on storage.objects
  for all to authenticated
  using (
    bucket_id = 'message-attachments'
    and (storage.foldername(name))[1] = public.current_app_user_id()::text
  )
  with check (
    bucket_id = 'message-attachments'
    and (storage.foldername(name))[1] = public.current_app_user_id()::text
  );

-- The owning kiné reads and uploads under each of their patients' folders.
drop policy if exists message_attachments_instructor_rw on storage.objects;
create policy message_attachments_instructor_rw on storage.objects
  for all to authenticated
  using (
    bucket_id = 'message-attachments'
    and exists (
      select 1 from public.patients p
      where p.id::text = (storage.foldername(name))[1]
        and p.instructor_id = public.current_app_user_id()
    )
  )
  with check (
    bucket_id = 'message-attachments'
    and exists (
      select 1 from public.patients p
      where p.id::text = (storage.foldername(name))[1]
        and p.instructor_id = public.current_app_user_id()
    )
  );
