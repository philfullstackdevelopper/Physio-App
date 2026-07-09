-- Physio-App — Migration 0010: per-exercise prescription overrides
-- Run once in Supabase: SQL Editor -> New query -> paste -> Run. Safe to re-run.
--
-- ADDITIVE — one new table, nothing existing is touched, so the running app keeps
-- working. This is what closes the feedback loop: until now the adaptation engine
-- could only PRINT a suggestion. Here the instructor's decision is stored, and the
-- patient's next session actually reads it.
--
-- `base_reps` records what the standard prescription said AT THE MOMENT the
-- instructor decided. It is what lets the app later drop an increase that has
-- become unsafe: if the patient's condition regresses and their baseline falls
-- below `base_reps`, a "do more reps" override is ignored. A "do fewer" override
-- is always honoured. See lib/exercise/overrides.ts.

create table if not exists public.exercise_overrides (
  id            uuid primary key default gen_random_uuid(),
  patient_id    uuid not null references public.patients (id) on delete cascade,
  exercise_name text not null,
  goal_reps     int  not null check (goal_reps between 1 and 100),
  base_reps     int  not null check (base_reps between 1 and 100),
  set_by        uuid references public.instructors (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  -- One active override per exercise, per patient: re-deciding replaces.
  unique (patient_id, exercise_name)
);

create index if not exists idx_exoverrides_patient on public.exercise_overrides (patient_id);

alter table public.exercise_overrides enable row level security;

-- A patient may READ their own overrides — their session screen needs them to
-- know how many reps to ask for. They may never write one: a prescription is a
-- clinical decision, and letting the browser set it would let a patient lighten
-- (or worsen) their own program.
drop policy if exists exoverrides_patient_read on public.exercise_overrides;
create policy exoverrides_patient_read on public.exercise_overrides
  for select to authenticated
  using (patient_id = auth.uid());

-- The OWNING instructor may read and write overrides for their own patients, and
-- only theirs. `using` covers the rows already there (read / update / delete);
-- `with check` covers the row being written, so an instructor cannot create an
-- override attached to somebody else's patient.
drop policy if exists exoverrides_instructor_write on public.exercise_overrides;
create policy exoverrides_instructor_write on public.exercise_overrides
  for all to authenticated
  using (
    exists (select 1 from public.patients p
            where p.id = exercise_overrides.patient_id and p.instructor_id = auth.uid())
  )
  with check (
    exists (select 1 from public.patients p
            where p.id = exercise_overrides.patient_id and p.instructor_id = auth.uid())
  );
