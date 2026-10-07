-- Physio-App — Migration 0061 : verrouillage sécurité (audit du 2026-10-07)
-- À appliquer sur Scalingo À LA MAIN (psql), PAS via scripts/migrate.mjs (le
-- journal schema_migrations de Scalingo est incomplet). Rejouable sans risque.
--
-- Chaque bloc ci-dessous a été expliqué à Philippe en clair avant d'être
-- appliqué (CLAUDE.md §3 et §9). Même mécanisme que 0057 : sur Scalingo il
-- n'y a qu'un seul rôle Postgres et FORCE ROW LEVEL SECURITY s'applique à lui
-- aussi ; les seules écritures « admin » passent par des fonctions du schéma
-- `internal` (jamais exposé par PostgREST) qui posent le laissez-passer
-- transactionnel `app.admin_bypass` juste avant d'écrire.

begin;

-- ---------------------------------------------------------------------------
-- 1. app_users — fin de la politique « tout le monde peut tout » (0058).
--    Un utilisateur connecté ne peut plus que LIRE sa propre ligne (celle de
--    son identifiant Clerk). Création, liaison et suppression passent par les
--    fonctions internal.* ci-dessous, appelées par le serveur uniquement
--    (lib/auth/user-map.ts, lib/db/admin.ts).
-- ---------------------------------------------------------------------------

drop policy if exists app_users_service on public.app_users;

drop policy if exists app_users_select_own on public.app_users;
create policy app_users_select_own on public.app_users
  for select to public
  using (
    clerk_id = coalesce(
      nullif(current_setting('request.jwt.claim.sub', true), ''),
      (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
    )
  );

drop policy if exists app_users_admin_bypass on public.app_users;
create policy app_users_admin_bypass on public.app_users
  for all to public
  using (current_setting('app.admin_bypass', true) = 'app_users')
  with check (current_setting('app.admin_bypass', true) = 'app_users');

-- E-mails en minuscules (Clerk les renvoie toujours en minuscules ; une
-- invitation tapée « Marie.Dupont@… » ne retrouvait plus son patient).
-- Les doublons éventuels (même adresse à la casse près) sont laissés tels
-- quels plutôt que de casser la contrainte unique.
select set_config('app.admin_bypass', 'app_users', true);
update public.app_users u
set email = lower(trim(u.email))
where u.email is not null
  and u.email <> lower(trim(u.email))
  and not exists (
    select 1 from public.app_users o
    where o.app_id <> u.app_id and o.email = lower(trim(u.email))
  );
select set_config('app.admin_bypass', '', true);

create schema if not exists internal;

-- Connexion : identifiant interne pour un compte Clerk (création ou liaison).
create or replace function internal.resolve_app_user(p_clerk_id text, p_email text)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_email text := lower(trim(p_email));
  v_id uuid;
begin
  perform set_config('app.admin_bypass', 'app_users', true);

  select app_id into v_id from public.app_users where clerk_id = p_clerk_id;
  if v_id is not null then
    return v_id;
  end if;

  -- Compte pré-créé (patient invité, compte migré) : on y attache le Clerk id,
  -- seulement s'il n'en a pas déjà un.
  update public.app_users set clerk_id = p_clerk_id
  where email = v_email and clerk_id is null
  returning app_id into v_id;
  if v_id is not null then
    return v_id;
  end if;

  insert into public.app_users (clerk_id, email)
  values (p_clerk_id, v_email)
  on conflict do nothing
  returning app_id into v_id;
  if v_id is not null then
    return v_id;
  end if;

  -- Course perdue contre une autre requête pour la même personne : relire.
  select app_id into v_id from public.app_users where clerk_id = p_clerk_id;
  if v_id is null then
    raise exception 'resolve_app_user: impossible de créer ou retrouver le compte (e-mail déjà lié à un autre identifiant ?)';
  end if;
  return v_id;
end;
$$;

-- Invitation d'un patient : identifiant réservé avant sa première connexion.
create or replace function internal.precreate_app_user(p_email text, out app_id uuid, out is_new boolean)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
#variable_conflict use_column
declare
  v_email text := lower(trim(p_email));
begin
  perform set_config('app.admin_bypass', 'app_users', true);
  select u.app_id into app_id from public.app_users u where u.email = v_email;
  if app_id is not null then
    is_new := false;
    return;
  end if;
  insert into public.app_users (email) values (v_email)
  on conflict do nothing
  returning public.app_users.app_id into app_id;
  if app_id is not null then
    is_new := true;
    return;
  end if;
  select u.app_id into app_id from public.app_users u where u.email = v_email;
  is_new := false;
end;
$$;

-- Suppression d'un compte (suppression par le patient, ou par son kiné). Les
-- lignes instructors/patients et tout ce qui en dépend partent en cascade.
create or replace function internal.delete_app_user_by_id(p_app_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform set_config('app.admin_bypass', 'app_users', true);
  delete from public.app_users where app_id = p_app_id;
end;
$$;

create or replace function internal.delete_app_user_by_email(p_email text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform set_config('app.admin_bypass', 'app_users', true);
  delete from public.app_users where email = lower(trim(p_email));
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. instructors.status — un kiné ne peut plus s'auto-valider.
--    Nouveau compte = « pending » obligatoirement ; seul le changement fait
--    par l'admin (/admin) ou la vérification RPPS automatique (toutes deux via
--    internal.admin_set_instructor_status) peut modifier le statut.
-- ---------------------------------------------------------------------------

alter table public.instructors alter column status set default 'pending';

drop policy if exists instructors_insert_self on public.instructors;
create policy instructors_insert_self on public.instructors
  for insert to authenticated
  with check (id = public.current_app_user_id() and status = 'pending');

create or replace function internal.guard_instructor_status()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.status is distinct from old.status
     and coalesce(current_setting('app.admin_bypass', true), '') <> 'set_instructor_status' then
    raise exception 'Le statut d''un compte kiné ne peut être changé que par l''administrateur.';
  end if;
  return new;
end;
$$;

drop trigger if exists instructors_guard_status on public.instructors;
create trigger instructors_guard_status
  before update on public.instructors
  for each row execute function internal.guard_instructor_status();

-- ---------------------------------------------------------------------------
-- 3. patients.trial_ends_at — un kiné ne peut plus offrir un accès gratuit
--    illimité à ses patients (aucun code de l'appli n'écrit cette colonne).
-- ---------------------------------------------------------------------------

create or replace function internal.guard_patient_trial()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.trial_ends_at is distinct from old.trial_ends_at
     and coalesce(current_setting('app.admin_bypass', true), '') <> 'patient_trial' then
    raise exception 'La date de fin d''essai ne peut pas être modifiée depuis l''application.';
  end if;
  return new;
end;
$$;

drop trigger if exists patients_guard_trial on public.patients;
create trigger patients_guard_trial
  before update on public.patients
  for each row execute function internal.guard_patient_trial();

-- ---------------------------------------------------------------------------
-- 4. Vidéos d'exercices — un kiné ne peut plus changer que la vidéo de SES
--    exercices. Les exercices de la plateforme (created_by null) restent
--    modifiables par l'administrateur seul, via internal.admin_set_exercise_media
--    (lib/db/admin.ts, appelé après vérification de ADMIN_EMAILS côté serveur).
-- ---------------------------------------------------------------------------

create or replace function public.set_exercise_media(
  p_exercise_id uuid,
  p_media_url text,
  p_start_seconds integer default 0
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := public.current_app_user_id();
begin
  if not exists (select 1 from public.instructors where id = v_me and status = 'approved') then
    raise exception 'not an approved instructor';
  end if;

  update public.exercises
  set media_url = p_media_url,
      media_start_seconds = greatest(0, p_start_seconds)
  where id = p_exercise_id
    and created_by = v_me;

  if not found then
    raise exception 'exercise not found or not yours';
  end if;
end;
$$;

create or replace function internal.admin_set_exercise_media(
  p_exercise_id uuid,
  p_media_url text,
  p_start_seconds integer
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform set_config('app.admin_bypass', 'set_exercise_media', true);
  update public.exercises
  set media_url = p_media_url,
      media_start_seconds = greatest(0, coalesce(p_start_seconds, 0))
  where id = p_exercise_id
    and created_by is null;
  if not found then
    raise exception 'platform exercise not found';
  end if;
end;
$$;

drop policy if exists exercises_admin_bypass on public.exercises;
create policy exercises_admin_bypass on public.exercises
  for update to public
  using (current_setting('app.admin_bypass', true) = 'set_exercise_media')
  with check (current_setting('app.admin_bypass', true) = 'set_exercise_media');

-- ---------------------------------------------------------------------------
-- 5. patient_profiles.stage_declared_at — date à laquelle le patient a
--    déclaré son stade, distincte de updated_at (corriger son poids ne doit
--    plus remettre sa progression à la semaine 1).
-- ---------------------------------------------------------------------------

alter table public.patient_profiles add column if not exists stage_declared_at timestamptz;
update public.patient_profiles set stage_declared_at = updated_at where stage_declared_at is null;

-- ---------------------------------------------------------------------------
-- 6. subscriptions.user_id — pointait encore vers auth.users (inutilisé,
--    CLAUDE.md §3) : un patient supprimé laissait sa ligne d'abonnement.
--    NOT VALID : n'échoue pas sur d'éventuelles lignes orphelines existantes,
--    mais s'applique à toutes les nouvelles.
-- ---------------------------------------------------------------------------

alter table public.subscriptions drop constraint if exists subscriptions_user_id_fkey;
alter table public.subscriptions
  add constraint subscriptions_user_id_fkey
  foreign key (user_id) references public.app_users(app_id) on delete cascade not valid;

commit;
