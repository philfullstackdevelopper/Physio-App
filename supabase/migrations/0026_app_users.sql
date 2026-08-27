-- Physio-App — Clerk identity bridge table.
-- Links a Clerk login (clerk_id) to the same uuid the rest of the database
-- already uses (instructors.id, patients.id, ...). See lib/auth/user-map.ts.
--
-- Seeded from every existing instructor/patient row so people who already
-- have an account here keep it: resolveAppUserId() matches them by email on
-- their first Clerk login and attaches clerk_id to that same row/uuid --
-- no new account, no lost data.

create table if not exists public.app_users (
  app_id     uuid primary key,
  clerk_id   text unique,
  email      text not null unique,
  created_at timestamptz not null default now()
);

alter table public.app_users enable row level security;
-- No policies: this table is only ever touched server-side via the
-- service-role admin client (lib/auth/user-map.ts), same pattern as
-- public.auth_tokens in 0017. RLS with zero policies = always denied to
-- normal "authenticated"/"anon" queries, which is what we want.

insert into public.app_users (app_id, email)
select id, email from public.instructors
on conflict (email) do nothing;

insert into public.app_users (app_id, email)
select id, email from public.patients
on conflict (email) do nothing;
