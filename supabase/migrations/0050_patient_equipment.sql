-- Physio-App — Migration 0050: patient home equipment
-- Run once in Supabase (SQL Editor -> New query -> paste -> Run). Safe to re-run.
--
-- What equipment the patient has at home, declared during onboarding — lets
-- the kiné pick/adjust séances he knows the patient can actually perform.
-- No exercise-side tagging yet (see lib/exercise/equipment.ts), so this is
-- informational on the kiné's patient page for now, not an automatic filter.
-- Additive only, no RLS change needed (patient_profiles' existing "self"
-- policy already covers this new column).

alter table public.patient_profiles
  add column if not exists equipment text[] not null default '{}';
