-- Cabinet/practice details collected right after Clerk signup, before the
-- existing pending-approval gate (see 0023_instructor_approval.sql) lets a
-- kiné into the dashboard. Philippe, 2026-09-10: wants a professional
-- onboarding step (cabinet name/address, RPPS/ADELI, phone, SIRET) so an
-- admin has enough to manually verify a new instructor, and so the RPPS
-- number is on file for the automatic Annuaire Santé check once an API key
-- is available (see lib/instructor/rppsVerification.ts).
--
-- Plain new columns on an existing table: no new RLS policies needed, the
-- table's existing row-level policies (0031_rls_clerk_identity.sql —
-- instructors_select_own / instructors_update_own, both keyed on
-- current_app_user_id()) already cover every column on the row, including
-- these.
alter table instructors
  add column cabinet_name text,
  add column cabinet_address text,
  add column phone text,
  add column rpps_number text,
  add column siret text,
  -- Set only once the Annuaire Santé API confirms the RPPS number resolves to
  -- an active, registered masseur-kinésithérapeute. Null until that check
  -- runs (today: never, until the API key exists) — the admin approval
  -- screen shows the raw rpps_number regardless so manual verification can
  -- happen in the meantime.
  add column rpps_verified_at timestamptz;
