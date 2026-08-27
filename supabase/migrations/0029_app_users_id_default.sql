-- Fix: 0026_app_users.sql defined app_id as "uuid primary key" with no
-- default, unlike every other uuid primary key in this schema (which all use
-- "default gen_random_uuid()"). Any insert that doesn't supply app_id
-- explicitly — which is exactly what happens for a brand-new signup in
-- lib/auth/user-map.ts (resolveAppUserId, precreateAppUserId) — hits a
-- not-null constraint violation and the whole signup flow 500s.
--
-- Existing rows already have app_id (seeded from instructors/patients ids in
-- 0026), so this only needs to add the missing default going forward.

alter table public.app_users alter column app_id set default gen_random_uuid();
