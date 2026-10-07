-- Physio-App — Migration 0062 : vue d'ensemble admin des kinés + suspension
-- À appliquer sur Scalingo À LA MAIN (psql/pg), puis à inscrire dans
-- schema_migrations (journal incomplet, voir mémoire). Rejouable sans risque.
--
-- Bug corrigé au passage (constaté le 2026-10-07 par un test annulé) : sur
-- Scalingo (FORCE RLS, un seul rôle), la connexion serveur ne voyait AUCUN
-- kiné — /admin affichait toujours « Aucune demande en attente », et
-- l'approbation (manuelle comme automatique par RPPS) ne modifiait aucune
-- ligne sans erreur : un UPDATE … WHERE doit aussi passer une politique
-- SELECT, et instructors_admin_bypass n'existait qu'en UPDATE.
--
-- Mécanisme inchangé (voir 0057/0061) : laissez-passer transactionnel
-- `app.admin_bypass`, posé uniquement par des fonctions du schéma `internal`
-- que PostgREST n'expose jamais.

begin;

-- ---------------------------------------------------------------------------
-- 1. Nouveau statut « suspended » (kiné exclu par l'administrateur).
-- ---------------------------------------------------------------------------
alter table public.instructors drop constraint if exists instructors_status_check;
alter table public.instructors
  add constraint instructors_status_check
  check (status in ('pending', 'approved', 'rejected', 'suspended'));

-- ---------------------------------------------------------------------------
-- 2. Lecture admin (laissez-passer « admin_read ») + lecture pendant le
--    changement de statut (pour que l'UPDATE retrouve sa ligne).
-- ---------------------------------------------------------------------------
drop policy if exists instructors_admin_read on public.instructors;
create policy instructors_admin_read on public.instructors
  for select to public
  using (current_setting('app.admin_bypass', true) in ('admin_read', 'set_instructor_status'));

drop policy if exists patients_admin_read on public.patients;
create policy patients_admin_read on public.patients
  for select to public
  using (current_setting('app.admin_bypass', true) = 'admin_read');

drop policy if exists subscriptions_admin_read on public.subscriptions;
create policy subscriptions_admin_read on public.subscriptions
  for select to public
  using (current_setting('app.admin_bypass', true) = 'admin_read');

drop policy if exists connect_accounts_admin_read on public.instructor_connect_accounts;
create policy connect_accounts_admin_read on public.instructor_connect_accounts
  for select to public
  using (current_setting('app.admin_bypass', true) = 'admin_read');

-- La liste d'attente existante (0057) était en SQL pur, sans laissez-passer.
create or replace function internal.admin_list_pending_instructors()
returns table(
  id uuid, full_name text, email text, created_at timestamptz,
  cabinet_name text, cabinet_address text, phone text,
  rpps_number text, siret text, rpps_verified_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform set_config('app.admin_bypass', 'admin_read', true);
  return query
    select i.id, i.full_name, i.email, i.created_at, i.cabinet_name, i.cabinet_address, i.phone,
           i.rpps_number, i.siret, i.rpps_verified_at
    from public.instructors i
    where i.status = 'pending'
    order by i.created_at asc;
end;
$$;

-- Tous les kinés, pour la vue d'ensemble /admin.
create or replace function internal.admin_list_instructors()
returns table(
  id uuid, full_name text, email text, status text, created_at timestamptz,
  cabinet_name text, rpps_number text, rpps_verified_at timestamptz,
  patient_count integer, paying_count integer, connect_status text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform set_config('app.admin_bypass', 'admin_read', true);
  return query
    select i.id, i.full_name, i.email, i.status, i.created_at, i.cabinet_name, i.rpps_number, i.rpps_verified_at,
           (select count(*)::int from public.patients p where p.instructor_id = i.id),
           (select count(*)::int from public.patients p join public.subscriptions s on s.user_id = p.id
             where p.instructor_id = i.id and s.status in ('active', 'trialing', 'past_due')),
           (select c.status from public.instructor_connect_accounts c where c.instructor_id = i.id)
    from public.instructors i
    order by i.created_at desc;
end;
$$;

-- Abonnements des patients d'un kiné, pour les résilier/rembourser à la
-- suspension (lib/billing/suspendInstructor.ts).
create or replace function internal.admin_instructor_subscriptions(p_instructor_id uuid)
returns table(patient_id uuid, stripe_subscription_id text, status text, connect_account_id text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform set_config('app.admin_bypass', 'admin_read', true);
  return query
    select p.id, s.stripe_subscription_id, s.status,
           (select c.stripe_connect_account_id from public.instructor_connect_accounts c where c.instructor_id = p_instructor_id)
    from public.patients p
    join public.subscriptions s on s.user_id = p.id
    where p.instructor_id = p_instructor_id
      and s.stripe_subscription_id is not null;
end;
$$;

-- Numéro RPPS déjà utilisé par un AUTRE compte kiné ? (l'approbation
-- automatique est alors refusée et la demande passe en revue manuelle).
create or replace function internal.rpps_in_use(p_rpps text, p_exclude_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v boolean;
begin
  perform set_config('app.admin_bypass', 'admin_read', true);
  select exists (
    select 1 from public.instructors
    where rpps_number = p_rpps and id is distinct from p_exclude_id and status <> 'rejected'
  ) into v;
  perform set_config('app.admin_bypass', '', true);
  return v;
end;
$$;

commit;
