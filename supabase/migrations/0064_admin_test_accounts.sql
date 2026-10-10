-- Physio-App — Migration 0064 : comptes de test créés depuis /admin
-- À appliquer avec : node scripts/migrate.mjs --only 0064_admin_test_accounts.sql
-- Rejouable sans risque (if not exists / create or replace / drop policy if exists).
--
-- BUT (Philippe, 2026-10-10) : pouvoir créer depuis /admin un faux kiné et de
-- faux patients pour essayer l'application, sans passer par un e-mail
-- d'invitation ni par une vraie adresse.
--
-- CE QUE ÇA CHANGE POUR L'ISOLATION DES DONNÉES, EN CLAIR :
--
--   1. Une nouvelle table `internal.test_accounts` note quels comptes sont des
--      comptes de test. Elle vit dans le schéma `internal`, que PostgREST
--      n'expose jamais : ni un kiné ni un patient ne peut la lire ou l'écrire
--      depuis son navigateur. Seul le serveur y accède, et seulement à travers
--      les fonctions ci-dessous.
--
--   2. Deux nouvelles règles d'INSERTION, une sur `instructors`, une sur
--      `patients`. Elles ne s'ouvrent que pendant l'exécution des fonctions
--      `internal.admin_create_test_*` (laissez-passer transactionnel
--      `app.admin_bypass = 'test_accounts'`, même mécanisme que 0057/0061/0062).
--      Elles ne permettent NI de lire, NI de modifier, NI de supprimer quoi que
--      ce soit, et un utilisateur connecté ne peut pas poser ce laissez-passer.
--
--   3. Garde-fous dans les fonctions elles-mêmes :
--      - un compte de test ne peut être créé que sur une adresse e-mail que
--        PERSONNE n'utilise déjà (jamais de rattachement à un compte existant) ;
--      - un patient de test ne peut être rattaché qu'à un KINÉ DE TEST — il est
--        impossible d'ajouter un faux patient chez un vrai kiné ;
--      - la suppression ne touche que des comptes inscrits dans
--        `internal.test_accounts` : un vrai compte ne peut pas être supprimé
--        par ce chemin, et un kiné de test qui a encore des patients invités
--        « à la main » (hors comptes de test) n'est pas supprimé.
--
--   Rien d'autre ne change : les règles existantes (un kiné ne voit que ses
--   patients, un patient que sa fiche) sont intactes.

begin;

-- ---------------------------------------------------------------------------
-- 1. Registre des comptes de test
-- ---------------------------------------------------------------------------
create table if not exists internal.test_accounts (
  app_id        uuid primary key references public.app_users (app_id) on delete cascade,
  kind          text not null check (kind in ('kine', 'patient')),
  email         text not null,
  full_name     text not null,
  -- Pour un patient de test : son kiné de test. Supprimer le kiné supprime
  -- aussi cette ligne (et le patient lui-même, voir admin_delete_test_account).
  instructor_id uuid references internal.test_accounts (app_id) on delete cascade,
  created_at    timestamptz not null default now()
);

alter table internal.test_accounts enable row level security;
alter table internal.test_accounts force row level security;

drop policy if exists test_accounts_admin on internal.test_accounts;
create policy test_accounts_admin on internal.test_accounts
  for all to public
  using (current_setting('app.admin_bypass', true) = 'test_accounts')
  with check (current_setting('app.admin_bypass', true) = 'test_accounts');

-- ---------------------------------------------------------------------------
-- 2. Insertion d'un kiné / d'un patient de test (laissez-passer uniquement)
-- ---------------------------------------------------------------------------
drop policy if exists instructors_test_insert on public.instructors;
create policy instructors_test_insert on public.instructors
  for insert to public
  with check (current_setting('app.admin_bypass', true) = 'test_accounts');

drop policy if exists patients_test_insert on public.patients;
create policy patients_test_insert on public.patients
  for insert to public
  with check (current_setting('app.admin_bypass', true) = 'test_accounts');

-- ---------------------------------------------------------------------------
-- 3. Création
-- ---------------------------------------------------------------------------

-- Kiné de test : déjà « approved », avec un nom de cabinet pour ne pas tomber
-- sur l'écran d'inscription du cabinet. Pas de numéro RPPS.
create or replace function internal.admin_create_test_instructor(p_email text, p_full_name text)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_email text := lower(trim(p_email));
  v_name  text := trim(p_full_name);
  v_id    uuid;
  v_new   boolean;
begin
  if v_email = '' or v_name = '' then
    raise exception 'Nom et e-mail obligatoires.';
  end if;

  select r.app_id, r.is_new into v_id, v_new from internal.precreate_app_user(v_email) r;
  if not coalesce(v_new, false) then
    raise exception 'EMAIL_TAKEN';
  end if;

  perform set_config('app.admin_bypass', 'test_accounts', true);
  insert into public.instructors (id, full_name, email, status, cabinet_name)
  values (v_id, v_name, v_email, 'approved', 'Cabinet de test');
  insert into internal.test_accounts (app_id, kind, email, full_name)
  values (v_id, 'kine', v_email, v_name);
  perform set_config('app.admin_bypass', '', true);
  return v_id;
end;
$$;

-- Patient de test, rattaché à un kiné DE TEST uniquement.
-- p_free_access : accès offert (patients.trial_ends_at dans 10 ans), pour
-- essayer l'application sans passer par le paiement Stripe ; sinon le patient
-- arrive, comme un vrai, sur le choix d'une offre.
create or replace function internal.admin_create_test_patient(
  p_email text, p_full_name text, p_instructor_id uuid, p_free_access boolean
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_email text := lower(trim(p_email));
  v_name  text := trim(p_full_name);
  v_id    uuid;
  v_new   boolean;
begin
  if v_email = '' or v_name = '' then
    raise exception 'Nom et e-mail obligatoires.';
  end if;

  perform set_config('app.admin_bypass', 'test_accounts', true);
  if not exists (
    select 1 from internal.test_accounts t where t.app_id = p_instructor_id and t.kind = 'kine'
  ) then
    raise exception 'NOT_A_TEST_KINE';
  end if;

  select r.app_id, r.is_new into v_id, v_new from internal.precreate_app_user(v_email) r;
  if not coalesce(v_new, false) then
    raise exception 'EMAIL_TAKEN';
  end if;

  perform set_config('app.admin_bypass', 'test_accounts', true);
  insert into public.patients (id, instructor_id, full_name, email, trial_ends_at)
  values (
    v_id, p_instructor_id, v_name, v_email,
    case when p_free_access then now() + interval '10 years' else null end
  );
  insert into internal.test_accounts (app_id, kind, email, full_name, instructor_id)
  values (v_id, 'patient', v_email, v_name, p_instructor_id);
  perform set_config('app.admin_bypass', '', true);
  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Liste (pour /admin)
-- ---------------------------------------------------------------------------
create or replace function internal.admin_list_test_accounts()
returns table(
  app_id uuid, kind text, email text, full_name text,
  instructor_id uuid, instructor_name text, created_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform set_config('app.admin_bypass', 'test_accounts', true);
  return query
    select t.app_id, t.kind, t.email, t.full_name, t.instructor_id, k.full_name, t.created_at
    from internal.test_accounts t
    left join internal.test_accounts k on k.app_id = t.instructor_id
    order by coalesce(k.created_at, t.created_at), (t.kind = 'patient'), t.created_at;
  perform set_config('app.admin_bypass', '', true);
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Suppression
-- ---------------------------------------------------------------------------

-- Qui serait supprimé avec ce compte de test : lui-même et, pour un kiné, ses
-- patients de test. Sert au serveur pour supprimer les identités Clerk AVANT
-- les données. `other_patients` = patients du kiné qui ne sont PAS des comptes
-- de test (invités à la main) ; `has_subscription` = abonnement Stripe encore
-- en cours. Dans les deux cas le serveur refuse de supprimer.
create or replace function internal.admin_test_account_members(p_app_id uuid)
returns table(app_id uuid, email text, clerk_id text, has_subscription boolean, other_patients integer)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_ids    uuid[];
  v_subs   uuid[];
  v_others integer;
begin
  perform set_config('app.admin_bypass', 'test_accounts', true);
  select array_agg(t.app_id) into v_ids
  from internal.test_accounts t
  where t.app_id = p_app_id or t.instructor_id = p_app_id;
  if v_ids is null or not (p_app_id = any(v_ids)) then
    raise exception 'NOT_A_TEST_ACCOUNT';
  end if;

  perform set_config('app.admin_bypass', 'admin_read', true);
  select count(*)::integer into v_others
  from public.patients p
  where p.instructor_id = p_app_id and not (p.id = any(v_ids));
  select coalesce(array_agg(s.user_id), '{}') into v_subs
  from public.subscriptions s
  where s.user_id = any(v_ids)
    and s.stripe_subscription_id is not null
    and coalesce(s.status, '') not in ('canceled', 'incomplete_expired');

  perform set_config('app.admin_bypass', 'app_users', true);
  return query
    select u.app_id, u.email, u.clerk_id, (u.app_id = any(v_subs)), v_others
    from public.app_users u
    where u.app_id = any(v_ids);
  perform set_config('app.admin_bypass', '', true);
end;
$$;

-- Supprime un compte de test et, pour un kiné, ses patients de test. Tout ce
-- qui dépend de ces comptes part en cascade (comme internal.delete_app_user_by_id).
-- Refuse tout compte qui n'est pas inscrit dans internal.test_accounts, et un
-- kiné de test qui a encore des patients hors comptes de test.
create or replace function internal.admin_delete_test_account(p_app_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_ids uuid[];
begin
  perform set_config('app.admin_bypass', 'test_accounts', true);
  select array_agg(t.app_id) into v_ids
  from internal.test_accounts t
  where t.app_id = p_app_id or t.instructor_id = p_app_id;
  if v_ids is null or not (p_app_id = any(v_ids)) then
    raise exception 'NOT_A_TEST_ACCOUNT';
  end if;

  perform set_config('app.admin_bypass', 'admin_read', true);
  if exists (
    select 1 from public.patients p where p.instructor_id = p_app_id and not (p.id = any(v_ids))
  ) then
    raise exception 'HAS_OTHER_PATIENTS';
  end if;

  perform set_config('app.admin_bypass', 'app_users', true);
  delete from public.app_users u where u.app_id = any(v_ids);
  perform set_config('app.admin_bypass', '', true);
end;
$$;

commit;
