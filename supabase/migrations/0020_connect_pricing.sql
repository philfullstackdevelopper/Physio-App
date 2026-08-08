-- Physio-App — Migration 0020: kiné-set pricing + Stripe Connect foundation
-- Run once in Supabase: SQL Editor -> New query -> paste -> Run. Safe to re-run.
--
-- Replaces the old flat "kine_pro" subscription with a per-patient model:
--   1. instructors.monthly_patient_price_cents — the kiné sets his own price.
--   2. instructor_connect_accounts — Stripe Connect account id + status.
--      Deliberately its OWN table, not a column on instructors: the existing
--      instructors_update_own policy (migration 0001) lets a kiné rewrite ANY
--      column on his own row. If the Connect account id lived directly on
--      instructors, a malicious kiné could self-write someone else's account
--      id and redirect his patients' payments there. This table has no
--      write policy for authenticated users at all — only the server
--      (service-role key) can write it, same protection subscriptions
--      already has.
--   3. subscriptions.plan — additive: allow 'kine_platform_fee' alongside the
--      existing values. Nothing existing changes shape.
--   4. platform_invoices — one row per kiné per billing month, so the
--      monthly billing script can never double-charge on a re-run.

-- ---------------------------------------------------------------------------
-- 1. KINÉ-SET PATIENT PRICE
-- ---------------------------------------------------------------------------
alter table public.instructors
  add column if not exists monthly_patient_price_cents integer;

alter table public.instructors
  drop constraint if exists instructors_price_positive;
alter table public.instructors
  add constraint instructors_price_positive
  check (monthly_patient_price_cents is null or monthly_patient_price_cents > 0);

-- ---------------------------------------------------------------------------
-- 2. STRIPE CONNECT ACCOUNT (server-write-only — see header note)
-- ---------------------------------------------------------------------------
create table if not exists public.instructor_connect_accounts (
  instructor_id              uuid primary key references public.instructors (id) on delete cascade,
  stripe_connect_account_id  text,
  status                     text not null default 'not_started'
    check (status in ('not_started', 'onboarding', 'active', 'restricted')),
  created_at                 timestamptz not null default now(),
  updated_at                 timestamptz not null default now()
);

alter table public.instructor_connect_accounts enable row level security;

-- A kiné may read his own Connect status (to show it in the UI), never write it.
drop policy if exists connect_accounts_self_read on public.instructor_connect_accounts;
create policy connect_accounts_self_read on public.instructor_connect_accounts
  for select to authenticated
  using (instructor_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 3. SUBSCRIPTIONS — additive: allow the new platform-fee plan value
-- ---------------------------------------------------------------------------
alter table public.subscriptions
  drop constraint if exists subscriptions_plan_check;
alter table public.subscriptions
  add constraint subscriptions_plan_check
  check (plan in ('patient_monthly', 'kine_pro', 'kine_platform_fee'));

-- ---------------------------------------------------------------------------
-- 4. MONTHLY PLATFORM-FEE INVOICE LOG (kiné -> Physio-App, Flow B)
-- ---------------------------------------------------------------------------
create table if not exists public.platform_invoices (
  id                uuid primary key default gen_random_uuid(),
  instructor_id     uuid not null references public.instructors (id) on delete cascade,
  period_start      date not null,
  period_end        date not null,
  patient_count     int not null default 0,
  amount_cents      int not null,
  stripe_invoice_id text,
  status            text not null default 'draft'
    check (status in ('draft', 'open', 'paid', 'void', 'uncollectible')),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (instructor_id, period_start)
);

alter table public.platform_invoices enable row level security;

drop policy if exists platform_invoices_self_read on public.platform_invoices;
create policy platform_invoices_self_read on public.platform_invoices
  for select to authenticated
  using (instructor_id = auth.uid());

-- NOTE: as with subscriptions, no write policy for authenticated users on
-- instructor_connect_accounts or platform_invoices — both are written only
-- by server code (the Connect onboarding callback / the monthly billing
-- script), using the service-role key.
