-- Physio-App — Migration 0005: patient self-declared situation
-- Run once in Supabase (SQL Editor -> New query -> paste -> Run). Safe to re-run.
--
-- Lets the patient record, in their OWN profile, what they are going through
-- (condition) and which recovery stage they are at. Stored on patient_profiles
-- (not patients) so the existing patient-owned RLS applies unchanged — the
-- patient can read/write only their own situation, and their instructor can read
-- it. This keeps the instructor-assignment flow on `patients` intact.

alter table public.patient_profiles
  add column if not exists condition_id uuid
  references public.conditions (id) on delete set null;

alter table public.patient_profiles
  add column if not exists injury_stage text
  check (injury_stage in ('acute','subacute','recovery','return_to_sport'));
