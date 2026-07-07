-- Physio-App — Phase 1 initial schema
-- Run this ONCE in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
-- It creates all tables, turns on Row-Level Security (RLS), defines the isolation
-- policies, and seeds a starter set of French conditions + exercises.
--
-- Safe to re-run: tables use "if not exists" and every policy is dropped before
-- being re-created.

-- ---------------------------------------------------------------------------
-- 1. TABLES
-- ---------------------------------------------------------------------------

-- Instructors (physiotherapists). One row per instructor, keyed to their login.
create table if not exists public.instructors (
  id         uuid primary key references auth.users (id) on delete cascade,
  full_name  text,
  email      text,
  created_at timestamptz not null default now()
);

-- Shared exercise library. created_by is null for platform (pre-loaded) exercises.
create table if not exists public.exercises (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  instructions text,
  media_url    text,
  created_by   uuid references public.instructors (id) on delete set null,
  created_at   timestamptz not null default now()
);

-- Conditions / protocols. created_by null = platform (read-only to instructors).
create table if not exists public.conditions (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  created_by  uuid references public.instructors (id) on delete cascade,
  created_at  timestamptz not null default now()
);

-- Which exercises make up a condition (the template), with a default frequency.
create table if not exists public.condition_exercises (
  id           uuid primary key default gen_random_uuid(),
  condition_id uuid not null references public.conditions (id) on delete cascade,
  exercise_id  uuid not null references public.exercises (id) on delete cascade,
  frequency    text,
  created_at   timestamptz not null default now()
);

-- Patients. Each belongs to exactly one instructor; optionally assigned a condition.
create table if not exists public.patients (
  id           uuid primary key references auth.users (id) on delete cascade,
  instructor_id uuid not null references public.instructors (id) on delete cascade,
  condition_id uuid references public.conditions (id) on delete set null,
  full_name    text,
  email        text,
  created_at   timestamptz not null default now()
);

-- A patient's actual program: exercises assigned to them (auto-filled from a
-- condition, then optionally tweaked by the instructor).
create table if not exists public.programs (
  id            uuid primary key default gen_random_uuid(),
  patient_id    uuid not null references public.patients (id) on delete cascade,
  exercise_id   uuid not null references public.exercises (id) on delete cascade,
  frequency     text,
  instructor_id uuid not null references public.instructors (id) on delete cascade,
  created_at    timestamptz not null default now()
);

-- A patient marking an exercise done — the "suivi en ligne".
create table if not exists public.exercise_logs (
  id           uuid primary key default gen_random_uuid(),
  program_id   uuid not null references public.programs (id) on delete cascade,
  patient_id   uuid not null references public.patients (id) on delete cascade,
  completed_at timestamptz not null default now()
);

-- Helpful indexes on the columns we filter by most.
create index if not exists idx_patients_instructor on public.patients (instructor_id);
create index if not exists idx_programs_patient    on public.programs (patient_id);
create index if not exists idx_programs_instructor on public.programs (instructor_id);
create index if not exists idx_logs_patient        on public.exercise_logs (patient_id);
create index if not exists idx_logs_program        on public.exercise_logs (program_id);
create index if not exists idx_cond_ex_condition   on public.condition_exercises (condition_id);

-- ---------------------------------------------------------------------------
-- 2. ENABLE ROW-LEVEL SECURITY (deny-by-default until a policy allows a row)
-- ---------------------------------------------------------------------------

alter table public.instructors        enable row level security;
alter table public.exercises          enable row level security;
alter table public.conditions         enable row level security;
alter table public.condition_exercises enable row level security;
alter table public.patients           enable row level security;
alter table public.programs           enable row level security;
alter table public.exercise_logs      enable row level security;

-- ---------------------------------------------------------------------------
-- 3. POLICIES
-- ---------------------------------------------------------------------------

-- INSTRUCTORS: a user may only see/create/edit their own instructor row.
drop policy if exists instructors_select_own on public.instructors;
create policy instructors_select_own on public.instructors
  for select to authenticated using (id = auth.uid());

drop policy if exists instructors_insert_self on public.instructors;
create policy instructors_insert_self on public.instructors
  for insert to authenticated with check (id = auth.uid());

drop policy if exists instructors_update_own on public.instructors;
create policy instructors_update_own on public.instructors
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- EXERCISES: everyone logged in can read the library. Only instructors can add,
-- and an instructor may edit/delete only the exercises they created (platform
-- exercises, created_by = null, stay read-only).
drop policy if exists exercises_select_all on public.exercises;
create policy exercises_select_all on public.exercises
  for select to authenticated using (true);

drop policy if exists exercises_insert_instructor on public.exercises;
create policy exercises_insert_instructor on public.exercises
  for insert to authenticated
  with check (
    created_by = auth.uid()
    and exists (select 1 from public.instructors i where i.id = auth.uid())
  );

drop policy if exists exercises_update_own on public.exercises;
create policy exercises_update_own on public.exercises
  for update to authenticated using (created_by = auth.uid()) with check (created_by = auth.uid());

drop policy if exists exercises_delete_own on public.exercises;
create policy exercises_delete_own on public.exercises
  for delete to authenticated using (created_by = auth.uid());

-- CONDITIONS: everyone logged in can read. Instructors create their own; platform
-- conditions (created_by = null) are read-only.
drop policy if exists conditions_select_all on public.conditions;
create policy conditions_select_all on public.conditions
  for select to authenticated using (true);

drop policy if exists conditions_insert_instructor on public.conditions;
create policy conditions_insert_instructor on public.conditions
  for insert to authenticated
  with check (
    created_by = auth.uid()
    and exists (select 1 from public.instructors i where i.id = auth.uid())
  );

drop policy if exists conditions_update_own on public.conditions;
create policy conditions_update_own on public.conditions
  for update to authenticated using (created_by = auth.uid()) with check (created_by = auth.uid());

drop policy if exists conditions_delete_own on public.conditions;
create policy conditions_delete_own on public.conditions
  for delete to authenticated using (created_by = auth.uid());

-- CONDITION_EXERCISES: readable by all logged-in users. Writable only by the
-- instructor who owns the parent condition.
drop policy if exists cond_ex_select_all on public.condition_exercises;
create policy cond_ex_select_all on public.condition_exercises
  for select to authenticated using (true);

drop policy if exists cond_ex_write_owner on public.condition_exercises;
create policy cond_ex_write_owner on public.condition_exercises
  for all to authenticated
  using (
    exists (select 1 from public.conditions c
            where c.id = condition_id and c.created_by = auth.uid())
  )
  with check (
    exists (select 1 from public.conditions c
            where c.id = condition_id and c.created_by = auth.uid())
  );

-- PATIENTS: the owning instructor sees/manages their patients; a patient sees
-- only their own row.
drop policy if exists patients_select on public.patients;
create policy patients_select on public.patients
  for select to authenticated
  using (instructor_id = auth.uid() or id = auth.uid());

drop policy if exists patients_insert_by_instructor on public.patients;
create policy patients_insert_by_instructor on public.patients
  for insert to authenticated with check (instructor_id = auth.uid());

drop policy if exists patients_update_by_instructor on public.patients;
create policy patients_update_by_instructor on public.patients
  for update to authenticated
  using (instructor_id = auth.uid()) with check (instructor_id = auth.uid());

drop policy if exists patients_delete_by_instructor on public.patients;
create policy patients_delete_by_instructor on public.patients
  for delete to authenticated using (instructor_id = auth.uid());

-- PROGRAMS: instructor manages programs for their patients; patient reads their own.
drop policy if exists programs_select on public.programs;
create policy programs_select on public.programs
  for select to authenticated
  using (instructor_id = auth.uid() or patient_id = auth.uid());

drop policy if exists programs_insert_instructor on public.programs;
create policy programs_insert_instructor on public.programs
  for insert to authenticated with check (instructor_id = auth.uid());

drop policy if exists programs_update_instructor on public.programs;
create policy programs_update_instructor on public.programs
  for update to authenticated
  using (instructor_id = auth.uid()) with check (instructor_id = auth.uid());

drop policy if exists programs_delete_instructor on public.programs;
create policy programs_delete_instructor on public.programs
  for delete to authenticated using (instructor_id = auth.uid());

-- EXERCISE_LOGS: a patient reads/creates only their own logs; the owning
-- instructor can read the logs of their patients' programs.
drop policy if exists logs_select on public.exercise_logs;
create policy logs_select on public.exercise_logs
  for select to authenticated
  using (
    patient_id = auth.uid()
    or exists (select 1 from public.programs p
               where p.id = program_id and p.instructor_id = auth.uid())
  );

drop policy if exists logs_insert_patient on public.exercise_logs;
create policy logs_insert_patient on public.exercise_logs
  for insert to authenticated
  with check (
    patient_id = auth.uid()
    and exists (select 1 from public.programs p
                where p.id = program_id and p.patient_id = auth.uid())
  );

drop policy if exists logs_delete_patient on public.exercise_logs;
create policy logs_delete_patient on public.exercise_logs
  for delete to authenticated using (patient_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 4. SEED DATA — platform starter set (created_by = null). French content.
-- ---------------------------------------------------------------------------

insert into public.exercises (name, instructions) values
  ('Étirement des ischio-jambiers', 'Assis, jambe tendue, penchez le buste vers l''avant en gardant le dos droit. Maintenez 30 secondes.'),
  ('Gainage abdominal (planche)', 'En appui sur les avant-bras et les pointes de pieds, gardez le corps aligné. Maintenez sans creuser le dos.'),
  ('Pont fessier', 'Allongé sur le dos, genoux pliés, soulevez le bassin en contractant les fessiers, puis redescendez lentement.'),
  ('Rotation du tronc', 'Allongé sur le dos, genoux pliés, laissez tomber les genoux d''un côté puis de l''autre, épaules au sol.'),
  ('Étirement du piriforme', 'Allongé, croisez une cheville sur le genou opposé et ramenez la cuisse vers vous. Maintenez 30 secondes.'),
  ('Flexion dorsale de la cheville', 'Assis, ramenez la pointe du pied vers vous à l''aide d''une bande élastique. Contrôlez le mouvement.'),
  ('Équilibre sur une jambe', 'Tenez-vous sur une jambe, l''autre légèrement fléchie. Gardez l''équilibre 30 secondes.'),
  ('Renforcement des mollets', 'Debout, montez sur la pointe des pieds puis redescendez lentement. Répétez.'),
  ('Étirement des cervicales', 'Assis, inclinez doucement la tête vers une épaule jusqu''à sentir un étirement. Maintenez 20 secondes de chaque côté.'),
  ('Rétraction cervicale (double menton)', 'Reculez la tête pour rentrer le menton, sans baisser le regard. Maintenez quelques secondes, répétez.')
on conflict do nothing;

insert into public.conditions (name, description) values
  ('Lombalgie chronique', 'Programme de renforcement et d''assouplissement pour les douleurs lombaires persistantes.'),
  ('Entorse de la cheville', 'Rééducation progressive de la cheville : mobilité, renforcement et équilibre.'),
  ('Cervicalgie', 'Exercices doux pour soulager les tensions et douleurs du cou.')
on conflict do nothing;

-- Attach exercises to each condition with a sensible default frequency.
insert into public.condition_exercises (condition_id, exercise_id, frequency)
select c.id, e.id, v.frequency
from public.conditions c
join (values
  ('Gainage abdominal (planche)', '3 séries de 30s, tous les jours'),
  ('Pont fessier', '3 séries de 10, tous les jours'),
  ('Étirement des ischio-jambiers', '2 fois par jour'),
  ('Étirement du piriforme', '2 fois par jour'),
  ('Rotation du tronc', '1 fois par jour')
) as v(exercise_name, frequency) on true
join public.exercises e on e.name = v.exercise_name
where c.name = 'Lombalgie chronique'
on conflict do nothing;

insert into public.condition_exercises (condition_id, exercise_id, frequency)
select c.id, e.id, v.frequency
from public.conditions c
join (values
  ('Flexion dorsale de la cheville', '3 séries de 15, 2 fois par jour'),
  ('Renforcement des mollets', '3 séries de 15, tous les jours'),
  ('Équilibre sur une jambe', '3 fois 30s par jour')
) as v(exercise_name, frequency) on true
join public.exercises e on e.name = v.exercise_name
where c.name = 'Entorse de la cheville'
on conflict do nothing;

insert into public.condition_exercises (condition_id, exercise_id, frequency)
select c.id, e.id, v.frequency
from public.conditions c
join (values
  ('Étirement des cervicales', '2 fois par jour'),
  ('Rétraction cervicale (double menton)', '3 séries de 10, tous les jours')
) as v(exercise_name, frequency) on true
join public.exercises e on e.name = v.exercise_name
where c.name = 'Cervicalgie'
on conflict do nothing;
