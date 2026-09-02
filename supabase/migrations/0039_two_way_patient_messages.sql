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
    patient_id = auth.uid()
    and sender = 'patient'
    and instructor_id = (select instructor_id from public.patients where id = auth.uid())
  );

-- The instructor may mark a thread read on their own side only. This is a
-- new, separate policy from the existing patient_messages_patient_mark_read
-- (migration 0015), which is untouched and still governs the patient's own
-- read_at column.
drop policy if exists patient_messages_instructor_mark_read on public.patient_messages;
create policy patient_messages_instructor_mark_read on public.patient_messages
  for update to authenticated
  using (instructor_id = auth.uid())
  with check (instructor_id = auth.uid());

-- Re-create the existing instructor-insert policy (migration 0015) with one
-- added clause, so an instructor can never insert a row claiming to be
-- patient-authored. Everything else about this policy is unchanged.
drop policy if exists patient_messages_instructor_write on public.patient_messages;
create policy patient_messages_instructor_write on public.patient_messages
  for insert to authenticated
  with check (
    sender = 'instructor'
    and instructor_id = auth.uid()
    and exists (select 1 from public.patients p
                where p.id = patient_messages.patient_id and p.instructor_id = auth.uid())
  );
