-- Physio-App — Migration 0019: general terms (CGU) acceptance
-- Run once in Supabase (SQL Editor -> New query -> paste -> Run). Safe to re-run.
--
-- Separate from health_data_consent_at (migration 0018): RGPD requires the
-- health-data consent to be specific and distinct from general terms
-- acceptance, so this is deliberately its own column, asked at a different
-- moment (account activation, before any health data is even discussed) —
-- not merged into a single "I accept everything" checkbox.
-- Additive only, no RLS change needed (patients' existing "self" policy
-- already covers this new column).

alter table public.patients
  add column if not exists terms_accepted_at timestamptz;
