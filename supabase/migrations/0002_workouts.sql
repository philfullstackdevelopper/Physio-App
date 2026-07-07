-- Physio-App -- Migration 0002: workouts layer
-- Adds a "workout" (session) layer between conditions and exercises.
-- Run once in Supabase: SQL Editor -> New query -> paste -> Run.
-- Safe to re-run.

-- 1. Drop the old flat model (replaced by workouts). Test/seed data only.
drop table if exists public.exercise_logs cascade;
drop table if exists public.programs cascade;
drop table if exists public.condition_exercises cascade;

-- 2. New tables ------------------------------------------------------------

-- A workout = a session alternative for a condition (duration + weekly target).
create table if not exists public.workouts (
  id               uuid primary key default gen_random_uuid(),
  condition_id     uuid not null references public.conditions (id) on delete cascade,
  name             text not null,
  description      text,
  duration_minutes int,
  times_per_week   int,
  created_by       uuid references public.instructors (id) on delete cascade,
  created_at       timestamptz not null default now()
);

-- The exercises that make up a workout.
create table if not exists public.workout_exercises (
  id          uuid primary key default gen_random_uuid(),
  workout_id  uuid not null references public.workouts (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  position    int not null default 0,
  created_at  timestamptz not null default now()
);

-- A patient completing a whole workout session.
create table if not exists public.workout_logs (
  id           uuid primary key default gen_random_uuid(),
  patient_id   uuid not null references public.patients (id) on delete cascade,
  workout_id   uuid not null references public.workouts (id) on delete cascade,
  completed_at timestamptz not null default now()
);

-- 3. Patient gets an optional instructor-recommended workout.
alter table public.patients
  add column if not exists recommended_workout_id uuid
  references public.workouts (id) on delete set null;

-- 4. Indexes ---------------------------------------------------------------
create index if not exists idx_workouts_condition   on public.workouts (condition_id);
create index if not exists idx_workout_ex_workout   on public.workout_exercises (workout_id);
create index if not exists idx_workout_logs_patient on public.workout_logs (patient_id);
create index if not exists idx_workout_logs_workout on public.workout_logs (workout_id);

-- 5. Row-Level Security ----------------------------------------------------
alter table public.workouts          enable row level security;
alter table public.workout_exercises enable row level security;
alter table public.workout_logs      enable row level security;

-- workouts: all authenticated read; instructor manages own; platform read-only
drop policy if exists workouts_select_all on public.workouts;
create policy workouts_select_all on public.workouts
  for select to authenticated using (true);

drop policy if exists workouts_insert_owner on public.workouts;
create policy workouts_insert_owner on public.workouts
  for insert to authenticated
  with check (
    created_by = auth.uid()
    and exists (select 1 from public.instructors i where i.id = auth.uid())
  );

drop policy if exists workouts_update_owner on public.workouts;
create policy workouts_update_owner on public.workouts
  for update to authenticated using (created_by = auth.uid()) with check (created_by = auth.uid());

drop policy if exists workouts_delete_owner on public.workouts;
create policy workouts_delete_owner on public.workouts
  for delete to authenticated using (created_by = auth.uid());

-- workout_exercises: all read; write only by owner of the parent workout
drop policy if exists workout_ex_select_all on public.workout_exercises;
create policy workout_ex_select_all on public.workout_exercises
  for select to authenticated using (true);

drop policy if exists workout_ex_write_owner on public.workout_exercises;
create policy workout_ex_write_owner on public.workout_exercises
  for all to authenticated
  using (exists (select 1 from public.workouts w where w.id = workout_id and w.created_by = auth.uid()))
  with check (exists (select 1 from public.workouts w where w.id = workout_id and w.created_by = auth.uid()));

-- workout_logs: patient manages own; instructor reads their own patients' logs
drop policy if exists workout_logs_select on public.workout_logs;
create policy workout_logs_select on public.workout_logs
  for select to authenticated
  using (
    patient_id = auth.uid()
    or exists (select 1 from public.patients p where p.id = patient_id and p.instructor_id = auth.uid())
  );

drop policy if exists workout_logs_insert_patient on public.workout_logs;
create policy workout_logs_insert_patient on public.workout_logs
  for insert to authenticated with check (patient_id = auth.uid());

drop policy if exists workout_logs_delete_patient on public.workout_logs;
create policy workout_logs_delete_patient on public.workout_logs
  for delete to authenticated using (patient_id = auth.uid());
