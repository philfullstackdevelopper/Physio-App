-- Physio-App — Migration 0015: kiné → patient messages
-- Run once in Supabase: SQL Editor -> New query -> paste -> Run. Safe to re-run.
--
-- ADDITIVE — creates one new table, touches nothing existing. Lets the kiné
-- send a short message to a patient (e.g. reacting to a recent session), and
-- the patient read it on their dashboard.

create table if not exists public.patient_messages (
  id            uuid primary key default gen_random_uuid(),
  patient_id    uuid not null references public.patients (id) on delete cascade,
  instructor_id uuid not null references public.instructors (id) on delete cascade,
  body          text not null,
  created_at    timestamptz not null default now(),
  read_at       timestamptz
);

create index if not exists idx_patient_messages_patient on public.patient_messages (patient_id, created_at desc);

alter table public.patient_messages enable row level security;

-- The patient reads their own messages and may mark them read (read_at).
drop policy if exists patient_messages_patient_read on public.patient_messages;
create policy patient_messages_patient_read on public.patient_messages
  for select to authenticated
  using (patient_id = auth.uid());

drop policy if exists patient_messages_patient_mark_read on public.patient_messages;
create policy patient_messages_patient_mark_read on public.patient_messages
  for update to authenticated
  using (patient_id = auth.uid())
  with check (patient_id = auth.uid());

-- The OWNING instructor sends messages to their own patients only, and reads
-- what they've sent.
drop policy if exists patient_messages_instructor_write on public.patient_messages;
create policy patient_messages_instructor_write on public.patient_messages
  for insert to authenticated
  with check (
    instructor_id = auth.uid()
    and exists (select 1 from public.patients p
                where p.id = patient_messages.patient_id and p.instructor_id = auth.uid())
  );

drop policy if exists patient_messages_instructor_read on public.patient_messages;
create policy patient_messages_instructor_read on public.patient_messages
  for select to authenticated
  using (instructor_id = auth.uid());
