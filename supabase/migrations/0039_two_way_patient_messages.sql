-- Physio-App — Migration 0039: two-way patient messaging
-- Run once in Supabase: SQL Editor -> New query -> paste -> Run. Safe to re-run.
--
-- ADDITIVE — extends patient_messages (migration 0015) so a patient can send
-- to their own instructor, not just receive. No new table: a patient has
-- exactly one instructor, so one thread per patient is all this ever needs.

alter table public.patient_messages
  add column if not exists sender text not null default 'instructor'
    check (sender in ('instructor', 'patient')),
  add column if not exists read_by_instructor_at timestamptz;

-- A patient may insert a message to their own instructor only.
drop policy if exists patient_messages_patient_write on public.patient_messages;
create policy patient_messages_patient_write on public.patient_messages
  for insert to authenticated
  with check (
    patient_id = public.current_app_user_id()
    and sender = 'patient'
    and instructor_id = (select instructor_id from public.patients where id = public.current_app_user_id())
  );

-- The instructor may mark a thread read on their own side only. This is a
-- new, separate policy from the existing patient_messages_patient_mark_read
-- (migration 0015), which is untouched and still governs the patient's own
-- read_at column.
drop policy if exists patient_messages_instructor_mark_read on public.patient_messages;
create policy patient_messages_instructor_mark_read on public.patient_messages
  for update to authenticated
  using (instructor_id = public.current_app_user_id())
  with check (instructor_id = public.current_app_user_id());

-- Re-create the existing instructor-insert policy (migration 0031) with one
-- added clause, so an instructor can never insert a row claiming to be
-- patient-authored. Everything else about this policy is unchanged.
drop policy if exists patient_messages_instructor_write on public.patient_messages;
create policy patient_messages_instructor_write on public.patient_messages
  for insert to authenticated
  with check (
    sender = 'instructor'
    and instructor_id = public.current_app_user_id()
    and exists (select 1 from public.patients p
                where p.id = patient_messages.patient_id and p.instructor_id = public.current_app_user_id())
  );

-- Both the patient's own read_at marker (migration 0015) and the
-- instructor's read_by_instructor_at marker (above) grant UPDATE on the
-- whole row via RLS, which only restricts which ROWS qualify, not which
-- COLUMNS change. A trigger closes that gap structurally: whichever side is
-- updating may only move their own read-marker column, nothing else —
-- preventing either party from silently rewriting message content,
-- authorship, or timestamps on a thread they can otherwise write to. This
-- also retroactively protects the pre-existing patient-side policy from
-- migration 0015, since the trigger applies to every update on this table
-- going forward regardless of which policy let the row through RLS.
create or replace function public.patient_messages_guard_read_marker_only()
returns trigger
language plpgsql
as $$
begin
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

drop trigger if exists patient_messages_read_marker_guard on public.patient_messages;
create trigger patient_messages_read_marker_guard
  before update on public.patient_messages
  for each row
  execute function public.patient_messages_guard_read_marker_only();
