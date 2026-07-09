-- Physio-App — Migration 0008: per-exercise feeling
-- Run once in Supabase: SQL Editor -> New query -> paste -> Run. Safe to re-run.
--
-- ADDITIVE — creates one new table, touches nothing existing, so the running
-- app keeps working. It records an OPTIONAL "ressenti" the patient can leave
-- after each individual exercise (difficulty 1-5 and/or a free note), giving
-- the instructor finer signal than the once-per-session patient_feedback row.

create table if not exists public.exercise_feedback (
  id            uuid primary key default gen_random_uuid(),
  patient_id    uuid not null references public.patients (id) on delete cascade,
  workout_id    uuid references public.workouts (id) on delete set null,
  exercise_name text not null,
  difficulty    int  check (difficulty between 1 and 10), -- optional 1=very easy … 10=very hard
  notes         text,
  created_at    timestamptz not null default now()
);

create index if not exists idx_exfeedback_patient on public.exercise_feedback (patient_id, created_at);
create index if not exists idx_exfeedback_workout on public.exercise_feedback (workout_id);

alter table public.exercise_feedback enable row level security;

-- A patient reads/creates/updates only their OWN feedback rows.
--   using  (row already in the table) → patient_id must be the logged-in user
--   with check (row being inserted/updated) → same, so nobody can write a row
--   attributed to another patient.
drop policy if exists exfeedback_self on public.exercise_feedback;
create policy exfeedback_self on public.exercise_feedback
  for all to authenticated
  using (patient_id = auth.uid())
  with check (patient_id = auth.uid());

-- The OWNING instructor may READ (not write) their own patients' feedback.
--   Allowed only when a patients row links this feedback's patient to the
--   logged-in instructor — so an instructor sees their roster and no one else's.
drop policy if exists exfeedback_instructor_read on public.exercise_feedback;
create policy exfeedback_instructor_read on public.exercise_feedback
  for select to authenticated
  using (
    exists (select 1 from public.patients p
            where p.id = exercise_feedback.patient_id and p.instructor_id = auth.uid())
  );
