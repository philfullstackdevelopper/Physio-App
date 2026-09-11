-- Physio-App — Migration 0056: abandon patient_documents + message attachments
-- Run once in Supabase (SQL Editor -> New query -> paste -> Run). Safe to re-run.
--
-- Decision (Philippe, 2026-09-11): both features touched patient health data
-- and would have required confirming a separate HDS certification for the
-- object-storage backend (Outscale OOS) before the Scalingo migration could
-- go live. Dropping them entirely leaves `exercise-media` (generic exercise
-- demo videos, not patient health data) as the only file-storage use case,
-- so Scalingo's own HDS certification is sufficient for the whole project —
-- no separate storage-provider certification to track. See project memory
-- "project_hds_hosting_requirement" for the full reasoning.

-- NOTE: Postgres blocks direct DELETE on storage.objects/storage.buckets
-- ("use the Storage API instead" — storage.protect_delete()), so the two
-- buckets themselves (patient-documents, message-attachments) are NOT
-- dropped here — delete them manually via the Supabase dashboard's Storage
-- UI once this migration has run. Both are confirmed empty (0 files) as of
-- 2026-09-11, so this is just tidying, not data loss.

-- ---------------------------------------------------------------------------
-- 1. patient_documents — drop table + its policies, and its storage policies.
-- ---------------------------------------------------------------------------
drop policy if exists patient_documents_self on public.patient_documents;
drop policy if exists patient_documents_instructor_read on public.patient_documents;
drop table if exists public.patient_documents;

drop policy if exists patient_docs_owner_all on storage.objects;
drop policy if exists patient_docs_instructor_read on storage.objects;

-- ---------------------------------------------------------------------------
-- 2. Message attachments — drop columns, guard trigger goes back to
--    body-only, storage policies removed.
-- ---------------------------------------------------------------------------
alter table public.patient_messages
  drop constraint if exists patient_messages_body_or_attachment,
  add constraint patient_messages_body_or_attachment check (length(trim(body)) > 0);

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
     or new.created_at is distinct from old.created_at then
    raise exception 'patient_messages rows may only have their read marker updated, not their content';
  end if;
  return new;
end;
$$;

alter table public.patient_messages
  drop column if exists attachment_path,
  drop column if exists attachment_name;

drop policy if exists message_attachments_patient_rw on storage.objects;
drop policy if exists message_attachments_instructor_rw on storage.objects;
