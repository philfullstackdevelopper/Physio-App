-- =============================================================================
-- 0090 — Corrections de l'audit du 13 novembre 2026 (U1 à U4)
-- (docs/audit-2026-11-13.md)
--
-- EN CLAIR, ce que ce fichier change :
--
--  U1. L'adresse e-mail d'une fiche kiné ne peut plus être modifiée par le kiné.
--      Avant, un kiné pouvait y écrire l'adresse de l'administrateur ; le site
--      croyait alors que son QR code était celui de l'administrateur et ouvrait
--      l'inscription des patients avant le lancement.
--        a) à la création d'une fiche kiné, l'adresse est celle du compte de
--           connexion (app_users), pas celle envoyée par le navigateur ;
--        b) ensuite elle est figée (seul le serveur peut la changer) ;
--        c) la page /rejoindre lit désormais l'adresse du COMPTE (app_users),
--           jamais celle de la fiche.
--
--  U2. Le journal des migrations (schema_migrations) quitte le schéma public,
--      exposé sur Internet par PostgREST, pour le schéma internal, qui ne l'est
--      pas. Avant, n'importe qui pouvait le lire, le vider ou le falsifier.
--
--  U3. Un kiné ne peut plus supprimer une fiche patient en parlant directement
--      à la base. La suppression passe par le site, qui arrête d'abord
--      l'abonnement Stripe, puis appelle internal.delete_patient — laquelle ne
--      supprime que le patient DE CE kiné.
--
--  U4. internal.discard_reserved_app_user : retire un identifiant réservé pour
--      une invitation, seulement s'il n'a servi à rien (personne ne s'est
--      connecté avec, aucune fiche patient ni kiné). Avant, deux inscriptions
--      simultanées pour la même adresse pouvaient effacer le patient tout juste
--      créé par l'autre.
--
-- CE QU'ELLE NE CHANGE PAS : un kiné ne voit toujours que SES patients, un
-- patient que SA fiche ; aucune règle de lecture n'est élargie.
--
-- Rejouable sans risque. Pas de begin/commit (scripts/migrate.mjs ouvre déjà la
-- transaction). À appliquer AVANT de déployer le code qui l'utilise : l'ancien
-- code du site ne sait supprimer un patient que par la règle retirée en U3.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- U1. E-mail de la fiche kiné : imposé à la création, figé ensuite
-- ---------------------------------------------------------------------------
create or replace function internal.guard_instructor_email()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_pass text := coalesce(current_setting('app.admin_bypass', true), '');
  v_email text;
begin
  if tg_op = 'INSERT' then
    -- Comptes de test créés par le serveur (0064) : déjà contrôlés.
    if v_pass = 'test_accounts' then
      return new;
    end if;
    perform set_config('app.admin_bypass', 'app_users', true);
    select u.email into v_email from public.app_users u where u.app_id = new.id;
    perform set_config('app.admin_bypass', v_pass, true);
    if v_email is not null then
      new.email := v_email;
    end if;
    return new;
  end if;

  if new.email is distinct from old.email and v_pass <> 'set_instructor_email' then
    raise exception 'L''adresse e-mail d''un compte kiné ne peut pas être modifiée ici.';
  end if;
  return new;
end;
$$;

drop trigger if exists instructors_guard_email on public.instructors;
create trigger instructors_guard_email
  before insert or update on public.instructors
  for each row execute function internal.guard_instructor_email();

-- La page /rejoindre : nom et statut viennent de la fiche kiné, l'adresse vient
-- du compte de connexion (que le kiné ne peut pas modifier).
create or replace function internal.join_link_kine(p_instructor_id uuid)
returns table(full_name text, email text, status text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_name text;
  v_status text;
  v_email text;
  v_found boolean;
begin
  perform set_config('app.admin_bypass', 'admin_read', true);
  select true, i.full_name::text, i.status::text into v_found, v_name, v_status
  from public.instructors i
  where i.id = p_instructor_id;
  if coalesce(v_found, false) is false then
    perform set_config('app.admin_bypass', '', true);
    return;
  end if;
  perform set_config('app.admin_bypass', 'app_users', true);
  select u.email::text into v_email from public.app_users u where u.app_id = p_instructor_id;
  perform set_config('app.admin_bypass', '', true);
  return query select v_name, v_email, v_status;
end;
$$;

-- ---------------------------------------------------------------------------
-- U2. Journal des migrations : hors du schéma exposé
-- ---------------------------------------------------------------------------
do $$
begin
  if to_regclass('public.schema_migrations') is not null
     and to_regclass('internal.schema_migrations') is null then
    alter table public.schema_migrations set schema internal;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- U3. Suppression d'un patient par son kiné : par le serveur seulement
-- ---------------------------------------------------------------------------
drop policy if exists patients_delete_by_instructor on public.patients;

drop policy if exists patients_delete_server on public.patients;
create policy patients_delete_server on public.patients
  for delete to public
  using (current_setting('app.admin_bypass', true) = 'delete_patient');

drop policy if exists patients_delete_server_read on public.patients;
create policy patients_delete_server_read on public.patients
  for select to public
  using (current_setting('app.admin_bypass', true) = 'delete_patient');

-- Renvoie vrai si une fiche a été supprimée. Ne touche que le patient de CE kiné.
create or replace function internal.delete_patient(p_instructor_id uuid, p_patient_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_count integer;
begin
  perform set_config('app.admin_bypass', 'delete_patient', true);
  delete from public.patients p
  where p.id = p_patient_id
    and p.instructor_id = p_instructor_id;
  get diagnostics v_count = row_count;
  perform set_config('app.admin_bypass', '', true);
  return v_count > 0;
end;
$$;

-- ---------------------------------------------------------------------------
-- U4. Retirer un identifiant réservé, seulement s'il n'a servi à rien
-- ---------------------------------------------------------------------------
-- Renvoie vrai si la ligne a été retirée.
create or replace function internal.discard_reserved_app_user(p_app_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_used boolean;
  v_count integer;
begin
  perform set_config('app.admin_bypass', 'admin_read', true);
  select exists (select 1 from public.patients p where p.id = p_app_id)
      or exists (select 1 from public.instructors i where i.id = p_app_id)
    into v_used;
  if v_used then
    perform set_config('app.admin_bypass', '', true);
    return false;
  end if;
  perform set_config('app.admin_bypass', 'app_users', true);
  delete from public.app_users u
  where u.app_id = p_app_id
    and u.clerk_id is null;
  get diagnostics v_count = row_count;
  perform set_config('app.admin_bypass', '', true);
  return v_count > 0;
end;
$$;

notify pgrst, 'reload schema';
