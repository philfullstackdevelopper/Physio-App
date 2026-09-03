-- Fix: instructors.id and patients.id still carried their original
-- "references auth.users(id)" foreign key from 0001_initial_schema.sql, back
-- when Supabase Auth was the identity system. 0026_app_users.sql moved
-- identity to Clerk + public.app_users, but never repointed these two FKs.
--
-- auth.users only has the handful of rows left over from the old Supabase
-- Auth accounts (verified: 3). Every brand-new Clerk signup gets a fresh
-- app_users.app_id that has no row in auth.users, so ANY new instructor
-- (app/signup/finalize/page.tsx) or patient (app/dashboard/patients/actions.ts
-- addPatient, and the patient's own onboarding) insert violates this FK and
-- silently redirects to /connection-error. This is the root cause of the
-- signup-after-"créer un compte" and onboarding failures.
--
-- Fix: repoint both FKs at public.app_users(app_id), the table that is
-- actually the current source of truth for identity. Verified beforehand
-- that every existing instructors.id/patients.id row already has a matching
-- app_users row (0026 seeded app_users from both tables at creation), so this
-- is a safe, lossless repoint — no orphans.

alter table public.instructors drop constraint instructors_id_fkey;
alter table public.instructors
  add constraint instructors_id_fkey foreign key (id)
  references public.app_users (app_id) on delete cascade;

alter table public.patients drop constraint patients_id_fkey;
alter table public.patients
  add constraint patients_id_fkey foreign key (id)
  references public.app_users (app_id) on delete cascade;
