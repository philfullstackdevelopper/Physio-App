-- Physio-App — Migration 0023: instructor approval
-- Run once in Supabase: SQL Editor -> New query -> paste -> Run. Safe to re-run.
--
-- Kinés no longer self-activate on signup: they sign up, then Philippe (the
-- platform owner) approves them by hand from /admin. Existing instructors
-- default to 'approved' so nobody already active gets locked out — new
-- self-serve signups explicitly insert 'pending' (see app/signup/actions.ts).

alter table public.instructors
  add column if not exists status text not null default 'approved';

alter table public.instructors
  drop constraint if exists instructors_status_check;
alter table public.instructors
  add constraint instructors_status_check
  check (status in ('pending', 'approved', 'rejected'));
