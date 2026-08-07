-- Physio-App — Migration 0018: explicit consent for health data processing
-- Run once in Supabase (SQL Editor -> New query -> paste -> Run). Safe to re-run.
--
-- RGPD article 9 requires EXPLICIT consent, separate from general terms
-- acceptance, before processing health data. This adds a timestamp column:
-- null = not yet given, a real timestamp = when the patient consented.
-- Additive only, touches no RLS policy (patient_profiles' existing "self"
-- policy already covers this new column — nothing to change there).

alter table public.patient_profiles
  add column if not exists health_data_consent_at timestamptz;
