-- Physio-App — Migration 0049: patient payment-lapse tracking
-- Run once in Supabase (SQL Editor -> New query -> paste -> Run). Safe to re-run.
--
-- Patients pay their instructor directly via the instructor's own Stripe
-- Connect account (see lib/billing/platformFee.ts) — this app has no
-- automatic visibility into that. So "stopped paying" is recorded manually by
-- the instructor from the patient's page, not detected from a webhook.
-- null = paying normally. A timestamp = when the instructor marked them as
-- no longer paying; the UI uses this + 3 months to suggest — never enforce —
-- when it's reasonable to delete the patient (see app/dashboard/patients/[id]/actions.ts).
-- Additive only, no RLS change needed (patients_update_by_instructor,
-- migration 0001, already covers any column on a row the instructor owns).

alter table public.patients
  add column if not exists payment_lapsed_at timestamptz;
