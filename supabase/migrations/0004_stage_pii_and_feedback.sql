-- Physio-App — Migration 0004: injury stage, PII separation, patient feedback
-- Run once in Supabase: SQL Editor -> New query -> paste -> Run. Safe to re-run.
--
-- This migration is ADDITIVE — it does not alter or drop any existing column,
-- so the running app keeps working. It adds three things the AI-intake +
-- adherence features need:
--   1. An injury "stage" (patient's rehab phase, and which stage a workout suits)
--   2. A separated PII table (`patient_profiles`) for GDPR / HDS readiness:
--      sensitive personal data (DOB, phone, height, weight) lives in its own
--      table with its own RLS, so it can be locked down / encrypted / erased
--      independently of operational and clinical data.
--   3. `patient_feedback` — daily pain (1-10), difficulty (1-10), completion.

-- ---------------------------------------------------------------------------
-- 1. INJURY STAGE
-- ---------------------------------------------------------------------------

-- Where the patient currently is in their recovery.
alter table public.patients
  add column if not exists injury_stage text
  check (injury_stage in ('acute','subacute','recovery','return_to_sport'));

-- Which stage a workout is appropriate for (lets us match by stage). Null = any.
alter table public.workouts
  add column if not exists stage text
  check (stage in ('acute','subacute','recovery','return_to_sport'));

-- ---------------------------------------------------------------------------
-- 2. PII VAULT — patient_profiles (sensitive personal data, separated)
-- ---------------------------------------------------------------------------
create table if not exists public.patient_profiles (
  id             uuid primary key references public.patients (id) on delete cascade,
  date_of_birth  date,
  phone          text,
  height_cm      numeric,
  weight_kg      numeric,
  activity_level text check (activity_level in ('sedentary','moderate','active')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- If patient_profiles already existed from an earlier run, add the new column.
alter table public.patient_profiles
  add column if not exists activity_level text
  check (activity_level in ('sedentary','moderate','active'));

alter table public.patient_profiles enable row level security;

-- A patient reads/writes only their own profile.
drop policy if exists patient_profiles_self on public.patient_profiles;
create policy patient_profiles_self on public.patient_profiles
  for all to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- The owning instructor may read/write their own patients' profiles.
drop policy if exists patient_profiles_by_instructor on public.patient_profiles;
create policy patient_profiles_by_instructor on public.patient_profiles
  for all to authenticated
  using (
    exists (select 1 from public.patients p
            where p.id = patient_profiles.id and p.instructor_id = auth.uid())
  )
  with check (
    exists (select 1 from public.patients p
            where p.id = patient_profiles.id and p.instructor_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- 3. PATIENT FEEDBACK — the daily symptom + adherence signal
-- ---------------------------------------------------------------------------
create table if not exists public.patient_feedback (
  id           uuid primary key default gen_random_uuid(),
  patient_id   uuid not null references public.patients (id) on delete cascade,
  workout_id   uuid references public.workouts (id) on delete set null,
  recorded_for date not null default current_date,
  pain_score   int  not null check (pain_score between 1 and 10),
  difficulty   int  check (difficulty between 1 and 10),
  completed    boolean not null default false,
  notes        text,
  created_at   timestamptz not null default now()
);

create index if not exists idx_feedback_patient on public.patient_feedback (patient_id, recorded_for);
create index if not exists idx_feedback_workout on public.patient_feedback (workout_id);

alter table public.patient_feedback enable row level security;

-- A patient reads/creates/updates only their own feedback.
drop policy if exists feedback_self on public.patient_feedback;
create policy feedback_self on public.patient_feedback
  for all to authenticated
  using (patient_id = auth.uid())
  with check (patient_id = auth.uid());

-- The owning instructor may read (not write) their patients' feedback.
drop policy if exists feedback_instructor_read on public.patient_feedback;
create policy feedback_instructor_read on public.patient_feedback
  for select to authenticated
  using (
    exists (select 1 from public.patients p
            where p.id = patient_feedback.patient_id and p.instructor_id = auth.uid())
  );
