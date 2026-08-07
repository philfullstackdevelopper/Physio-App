-- Physio-App — Self-hosted auth foundation (auth.users + auth.uid() shim)
-- Part of the move off Supabase (auth.users, Supabase Auth) to a plain,
-- self-hosted Postgres on an HDS-certified host.
--
-- IMPORTANT DESIGN CHOICE — read this before the tables below:
-- Rather than inventing a new table name and rewriting all 53 existing RLS
-- policies to use it, this recreates auth.users AND auth.uid() ourselves,
-- with the exact same name and shape Supabase used. That means migrations
-- 0001 through 0016 apply to this new database completely UNCHANGED — byte
-- for byte identical to what has already been reviewed and running correctly
-- in production for weeks. Nothing about the 53 existing policies needs to
-- be touched, checked, or re-verified; only these ~15 new lines are new
-- surface area to review.
--
-- NOT YET APPLIED ANYWHERE. Written for review first, per project convention
-- of explaining anything touching data isolation before it runs.
--
-- Safe to re-run: tables use "if not exists" and every policy is dropped
-- before being re-created. Must run BEFORE 0001 on a fresh database (0001
-- references auth.users for its foreign keys).

-- ---------------------------------------------------------------------------
-- 1. TABLES
-- ---------------------------------------------------------------------------

create schema if not exists auth;

-- Every existing policy in 0001-0016 says "to authenticated", and the
-- signup/invite policies below say "to anon" — Supabase creates these two
-- roles for every project automatically; a plain Postgres has neither, so
-- 0001 would fail to even create its policies without this. CREATE ROLE has
-- no native "IF NOT EXISTS", hence the existence check.
do $$ begin
  if not exists (select from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
end $$;

-- Our own auth.users, standing in for Supabase's managed one. Same table
-- name/column (id) that 0001's "references auth.users (id)" already expects,
-- so those foreign keys resolve without any change to 0001 itself.
create table if not exists auth.users (
  id                  uuid primary key default gen_random_uuid(),
  email               text not null unique,
  password_hash       text,              -- null until the person sets a password
  role                text not null check (role in ('instructor', 'patient')),
  email_confirmed_at  timestamptz,
  created_at          timestamptz not null default now()
);

-- Our replacement for Supabase's auth.uid(): reads the current request's
-- user id from a session variable the app sets once per request (see
-- lib/db/withUserContext.ts, Phase 1.4 of the plan). Every existing policy
-- in 0001-0016 calls "auth.uid()" — because we define it under this same
-- name, those calls keep working with zero edits to those files.
create or replace function auth.uid() returns uuid
  language sql stable as $$
    select nullif(current_setting('app.current_user_id', true), '')::uuid
  $$;

-- One-time tokens for invite / password-reset / email-confirm links, e.g.
-- /auth/confirm?token_hash=...&type=reset. Only the hash is stored, never the
-- raw token, so a database leak alone can't be used to log in as someone.
create table if not exists public.auth_tokens (
  token_hash text primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  type       text not null check (type in ('invite', 'reset', 'confirm')),
  expires_at timestamptz not null,
  used_at    timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_auth_tokens_user on public.auth_tokens (user_id);

-- ---------------------------------------------------------------------------
-- 2. ENABLE ROW-LEVEL SECURITY
-- ---------------------------------------------------------------------------

alter table auth.users        enable row level security;
alter table public.auth_tokens enable row level security;

-- ---------------------------------------------------------------------------
-- 3. POLICIES
-- ---------------------------------------------------------------------------

-- AUTH.USERS (new policies — everything below is genuinely new logic, unlike
-- 0001-0016 which are unchanged copies of what's already reviewed)
-- A logged-in person can read and update only their own row — same "own row"
-- shape as every other table in this project.
drop policy if exists users_select_own on auth.users;
create policy users_select_own on auth.users
  for select to authenticated using (id = auth.uid());

drop policy if exists users_update_own on auth.users;
create policy users_update_own on auth.users
  for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- Signup (instructor self-registration, app/signup/actions.ts): nobody is
-- logged in yet at this point, so this runs as "anon" rather than
-- "authenticated". Only instructor accounts may be self-created this way —
-- a patient account can only come from the policy below.
drop policy if exists users_insert_signup on auth.users;
create policy users_insert_signup on auth.users
  for insert to anon
  with check (role = 'instructor');

-- Patient invite (app/dashboard/patients/actions.ts): an instructor creates
-- the patient's account on their behalf. This replaces today's use of the
-- Supabase service-role key (which bypasses ALL security) with a precise
-- rule: only a real, registered instructor may create a row, and only with
-- role = 'patient' — they can never use this path to create another
-- instructor account.
drop policy if exists users_insert_patient_by_instructor on auth.users;
create policy users_insert_patient_by_instructor on auth.users
  for insert to authenticated
  with check (
    role = 'patient'
    and exists (select 1 from public.instructors i where i.id = auth.uid())
  );

-- AUTH_TOKENS
-- Deliberately NO policies for "authenticated" or "anon" here — by design,
-- someone using an invite/reset/confirm token is NOT logged in yet, so this
-- table must never be reachable through the normal per-request connection at
-- all (RLS with zero policies = always denied, which is what we want). It
-- will only be read/written by the auth server code itself, over the
-- narrowly-scoped connection below — not the general service-role-style
-- bypass we're removing.

-- ---------------------------------------------------------------------------
-- 4. AUTH_SERVICE ROLE — the login/token-verification exception
-- ---------------------------------------------------------------------------
-- A subtlety the design above glossed over: logging in means looking a user
-- up BY EMAIL before they're authenticated — auth.uid() is still null at
-- that point, so the "own row" policies above correctly refuse that lookup,
-- same as they'd refuse anyone else's. Same problem for reading/writing
-- auth_tokens (invite/reset/confirm), which by definition happens before
-- login too.
--
-- This role is the one narrow, deliberate exception: it can read auth.users
-- by email (to check a password) and fully manage auth_tokens (create an
-- invite/reset link, look one up, mark it used) — nothing else. It is used
-- ONLY by the Auth.js server code in lib/auth/*, over its own connection,
-- never by the app's regular per-request queries (those stay on the
-- "authenticated"/"anon" roles above, fully RLS-scoped as normal). This is
-- deliberately much narrower than the Supabase service-role key it replaces,
-- which could read and write literally everything.
do $$ begin
  if not exists (select from pg_roles where rolname = 'auth_service') then
    create role auth_service nologin;
  end if;
end $$;

drop policy if exists auth_service_read_users on auth.users;
create policy auth_service_read_users on auth.users
  for select to auth_service using (true);

drop policy if exists auth_service_insert_users on auth.users;
create policy auth_service_insert_users on auth.users
  for insert to auth_service with check (true);

drop policy if exists auth_service_all_tokens on public.auth_tokens;
create policy auth_service_all_tokens on public.auth_tokens
  for all to auth_service using (true) with check (true);

-- ---------------------------------------------------------------------------
-- 5. ONE MANUAL STEP LEFT — cannot be scripted in advance
-- ---------------------------------------------------------------------------
-- anon/authenticated/auth_service are NOLOGIN: nothing connects directly as
-- them. The app's single Postgres connection (DATABASE_URL) authenticates as
-- whatever role Scalingo's addon provisions, then switches roles per query
-- via "set role" — same pattern Supabase's own PostgREST layer uses
-- internally. That connecting role's name is only known once the Scalingo
-- Postgres addon actually exists (Phase 0.1), so it can't be hardcoded here.
-- Run this once, filling in the real role name, right after provisioning:
--
--   grant anon, authenticated, auth_service to <scalingo_role_name>;
