-- =============================================================================
-- 0083 — Appli mobile iPhone / Android (Philippe, 2026-11-07).
--
-- En clair, pour Philippe (CLAUDE.md §3 : chaque règle expliquée avant d'être
-- appliquée) :
--
--  1. TÉLÉPHONES À NOTIFIER (push_tokens). Quand quelqu'un ouvre l'appli et
--     accepte les notifications, son téléphone reçoit un « jeton » (une
--     adresse d'envoi). On le range ici avec la personne connectée, pour lui
--     envoyer « nouveau message » ou « votre séance du jour vous attend ».
--       - Chacun ne voit que SES propres téléphones ; personne d'autre.
--       - Personne n'écrit dans cette table depuis le navigateur : seul le
--         serveur l'enregistre, après avoir vérifié qui est connecté. Si un
--         même téléphone change de compte, il passe au nouveau compte.
--       - À la suppression d'un compte, ses téléphones partent avec lui.
--
--  2. DEMANDES DE SUPPRESSION DE COMPTE KINÉ (account_deletion_requests).
--     Apple exige qu'on puisse demander la suppression de son compte depuis
--     l'appli. Pour un kiné, la suppression touche aussi ses patients : elle
--     n'est donc pas immédiate, la demande arrive dans /admin et Philippe la
--     traite. Chaque kiné ne voit que SA demande ; seul le serveur écrit.
--
--  3. RAPPELS DE SÉANCE. Le serveur (et lui seul, via le « passe »
--     admin_read déjà utilisé pour patients et séances faites) peut lire les
--     séances recommandées. Une fonction serveur liste les patients à qui
--     envoyer « votre séance du jour vous attend » : un programme attribué,
--     aucune séance faite depuis hier, au moins un téléphone enregistré, et un
--     kiné validé. Elle ne renvoie que des jetons, jamais de donnée de santé.
--
-- Aucune autre règle d'accès ne change. Rejouable sans risque. Sur Scalingo,
-- appliquer CE fichier seul (node scripts/migrate.mjs --only).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Téléphones à notifier
-- ---------------------------------------------------------------------------

create table if not exists public.push_tokens (
  token       text primary key,
  app_user_id uuid not null references public.app_users (app_id) on delete cascade,
  platform    text not null check (platform in ('ios', 'android')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists push_tokens_user_idx on public.push_tokens (app_user_id);

alter table public.push_tokens enable row level security;
alter table public.push_tokens force row level security;

drop policy if exists push_tokens_select_own on public.push_tokens;
create policy push_tokens_select_own on public.push_tokens
  for select
  using (app_user_id = public.current_app_user_id());

-- Les fonctions serveur ci-dessous passent par ce seul « passe » nommé.
drop policy if exists push_tokens_server on public.push_tokens;
create policy push_tokens_server on public.push_tokens
  for all
  using (current_setting('app.admin_bypass', true) = 'push')
  with check (current_setting('app.admin_bypass', true) = 'push');

create or replace function internal.register_push_token(p_app_user_id uuid, p_token text, p_platform text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_token is null or length(p_token) < 10 or length(p_token) > 300 then
    raise exception 'jeton invalide';
  end if;
  perform set_config('app.admin_bypass', 'push', true);
  insert into public.push_tokens (token, app_user_id, platform)
  values (p_token, p_app_user_id, p_platform)
  on conflict (token) do update
    set app_user_id = excluded.app_user_id, platform = excluded.platform, updated_at = now();
  perform set_config('app.admin_bypass', '', true);
end;
$$;

-- Déconnexion : on ne retire le jeton que s'il appartient bien à cette personne.
create or replace function internal.unregister_push_token(p_app_user_id uuid, p_token text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform set_config('app.admin_bypass', 'push', true);
  delete from public.push_tokens where token = p_token and app_user_id = p_app_user_id;
  perform set_config('app.admin_bypass', '', true);
end;
$$;

-- Jeton refusé par Expo (appli désinstallée) : on l'oublie.
create or replace function internal.forget_push_tokens(p_tokens text[])
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform set_config('app.admin_bypass', 'push', true);
  delete from public.push_tokens where token = any (p_tokens);
  perform set_config('app.admin_bypass', '', true);
end;
$$;

create or replace function internal.push_tokens_for(p_app_user_ids uuid[])
returns table (app_user_id uuid, token text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform set_config('app.admin_bypass', 'push', true);
  return query select t.app_user_id, t.token from public.push_tokens t where t.app_user_id = any (p_app_user_ids);
  perform set_config('app.admin_bypass', '', true);
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Demandes de suppression de compte kiné
-- ---------------------------------------------------------------------------

create table if not exists public.account_deletion_requests (
  instructor_id uuid primary key references public.instructors (id) on delete cascade,
  requested_at  timestamptz not null default now(),
  reason        text
);

alter table public.account_deletion_requests enable row level security;
alter table public.account_deletion_requests force row level security;

drop policy if exists account_deletion_requests_select_own on public.account_deletion_requests;
create policy account_deletion_requests_select_own on public.account_deletion_requests
  for select
  using (instructor_id = public.current_app_user_id());

drop policy if exists account_deletion_requests_server on public.account_deletion_requests;
create policy account_deletion_requests_server on public.account_deletion_requests
  for all
  using (current_setting('app.admin_bypass', true) in ('account_deletion', 'admin_read'))
  with check (current_setting('app.admin_bypass', true) = 'account_deletion');

create or replace function internal.request_account_deletion(p_instructor_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform set_config('app.admin_bypass', 'account_deletion', true);
  insert into public.account_deletion_requests (instructor_id, reason)
  values (p_instructor_id, nullif(btrim(left(coalesce(p_reason, ''), 1000)), ''))
  on conflict (instructor_id) do update set requested_at = now(), reason = excluded.reason;
  perform set_config('app.admin_bypass', '', true);
end;
$$;

create or replace function internal.cancel_account_deletion(p_instructor_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform set_config('app.admin_bypass', 'account_deletion', true);
  delete from public.account_deletion_requests where instructor_id = p_instructor_id;
  perform set_config('app.admin_bypass', '', true);
end;
$$;

create or replace function internal.admin_list_account_deletions()
returns table (instructor_id uuid, requested_at timestamptz, reason text, full_name text, email text, patient_count integer)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform set_config('app.admin_bypass', 'admin_read', true);
  return query
  select r.instructor_id, r.requested_at, r.reason, i.full_name, i.email,
         (select count(*)::integer from public.patients p where p.instructor_id = r.instructor_id)
  from public.account_deletion_requests r
  join public.instructors i on i.id = r.instructor_id
  order by r.requested_at;
  perform set_config('app.admin_bypass', '', true);
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Rappels de séance
-- ---------------------------------------------------------------------------

-- Lecture serveur des séances recommandées (même « passe » admin_read que
-- patients, instructors et workout_logs) : sans elle, un patient dont le
-- programme n'est que dans cette liste ne recevrait jamais de rappel.
drop policy if exists recwk_admin_read on public.patient_recommended_workouts;
create policy recwk_admin_read on public.patient_recommended_workouts
  for select
  using (current_setting('app.admin_bypass', true) = 'admin_read');

create or replace function internal.push_reminder_targets()
returns table (app_user_id uuid, token text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform set_config('app.admin_bypass', 'admin_read', true);
  create temporary table if not exists _reminder_patients (id uuid) on commit drop;
  truncate _reminder_patients;
  insert into _reminder_patients
  select p.id
  from public.patients p
  join public.instructors i on i.id = p.instructor_id and i.status = 'approved'
  where exists (select 1 from public.patient_recommended_workouts r where r.patient_id = p.id)
    and not exists (
      select 1 from public.workout_logs l
      where l.patient_id = p.id and l.completed_at > now() - interval '20 hours'
    );
  perform set_config('app.admin_bypass', 'push', true);
  return query
  select t.app_user_id, t.token from public.push_tokens t join _reminder_patients rp on rp.id = t.app_user_id;
  perform set_config('app.admin_bypass', '', true);
end;
$$;
