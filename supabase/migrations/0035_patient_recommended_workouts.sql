-- Physio-App — Migration 0035: ordered list of recommended workouts
-- Run once in Supabase: SQL Editor -> New query -> paste -> Run. Safe to re-run.
--
-- Replaces the single patients.recommended_workout_id column with an ordered
-- list, so a kiné can recommend several séances and the patient automatically
-- moves to the next one once the current one's weekly target is met.
-- See docs/superpowers/specs/2026-08-29-recommended-workouts-and-calendar-design.md.

create table if not exists public.patient_recommended_workouts (
  id          uuid primary key default gen_random_uuid(),
  patient_id  uuid not null references public.patients (id) on delete cascade,
  workout_id  uuid not null references public.workouts (id) on delete cascade,
  priority    int not null,
  created_at  timestamptz not null default now(),
  unique (patient_id, workout_id)
);

create index if not exists idx_recwk_patient on public.patient_recommended_workouts (patient_id, priority);

alter table public.patient_recommended_workouts enable row level security;

-- The owning instructor manages their own patients' recommendations.
-- Uses public.current_app_user_id() (migration 0031), not the raw
-- Supabase-Auth auth.uid() — this project has been on Clerk since 0031, and
-- a policy written against auth.uid() silently matches zero rows for every
-- Clerk-issued login (see migration 0033 for the same fix elsewhere).
drop policy if exists recwk_instructor_all on public.patient_recommended_workouts;
create policy recwk_instructor_all on public.patient_recommended_workouts
  for all to authenticated
  using (exists (select 1 from public.patients p
                 where p.id = patient_recommended_workouts.patient_id
                   and p.instructor_id = public.current_app_user_id()))
  with check (exists (select 1 from public.patients p
                       where p.id = patient_recommended_workouts.patient_id
                         and p.instructor_id = public.current_app_user_id()));

-- The patient reads (not writes) their own list — lib/patient/home-data.ts
-- queries it, with the patient's own session, to compute their active workout.
drop policy if exists recwk_patient_read on public.patient_recommended_workouts;
create policy recwk_patient_read on public.patient_recommended_workouts
  for select to authenticated
  using (patient_id = public.current_app_user_id());

-- Carry forward any existing single recommendation as priority 1, so no
-- patient silently loses their current recommendation in this switch-over.
insert into public.patient_recommended_workouts (patient_id, workout_id, priority)
select id, recommended_workout_id, 1
from public.patients
where recommended_workout_id is not null
on conflict (patient_id, workout_id) do nothing;

-- Old single-recommendation column retired — one source of truth from now on.
alter table public.patients drop column if exists recommended_workout_id;
