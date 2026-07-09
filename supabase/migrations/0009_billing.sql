-- Physio-App — Migration 0009: subscription / access-tier foundation
-- Run once in Supabase: SQL Editor -> New query -> paste -> Run. Safe to re-run.
--
-- Adds the state the paid tiers need, WITHOUT touching auth or existing data:
--   1. patients.trial_ends_at — the 2-month full-experience trial window.
--   2. subscriptions — one row per paying user (patient €10/mo or kiné €30/mo),
--      kept in sync from Stripe by the SERVER (webhook). Users can READ their own
--      row but never WRITE it, so a paid status can't be forged from the browser.

-- ---------------------------------------------------------------------------
-- 1. TRIAL WINDOW (patient-only concept)
-- ---------------------------------------------------------------------------
alter table public.patients
  add column if not exists trial_ends_at timestamptz;

-- New patients automatically get a fresh 2-month trial at signup.
alter table public.patients
  alter column trial_ends_at set default (now() + interval '60 days');

-- Give every EXISTING patient a fresh 2-month trial (useful for the pilot).
-- Idempotent: only fills rows still empty, so re-running won't reset anyone.
update public.patients
  set trial_ends_at = now() + interval '60 days'
  where trial_ends_at is null;

-- ---------------------------------------------------------------------------
-- 2. SUBSCRIPTIONS (paid tiers, synced from Stripe)
-- ---------------------------------------------------------------------------
create table if not exists public.subscriptions (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null unique references auth.users (id) on delete cascade,
  plan                   text not null check (plan in ('patient_monthly','kine_pro')),
  stripe_customer_id     text,
  stripe_subscription_id text,
  status                 text not null default 'inactive'
    check (status in ('inactive','trialing','active','past_due','canceled',
                      'incomplete','incomplete_expired','unpaid')),
  current_period_end     timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create index if not exists idx_subscriptions_customer
  on public.subscriptions (stripe_customer_id);

alter table public.subscriptions enable row level security;

-- A user may READ only their own subscription row (to see their status/period).
drop policy if exists subscriptions_self_read on public.subscriptions;
create policy subscriptions_self_read on public.subscriptions
  for select to authenticated
  using (user_id = auth.uid());

-- NOTE: there is deliberately NO insert/update/delete policy for authenticated
-- users. The ONLY writer is the server (the Stripe webhook) using the
-- service-role key, which bypasses RLS. This prevents anyone from forging a
-- paid status from the browser.
