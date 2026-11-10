-- =============================================================================
-- 0088 — Corrections de l'audit complet du 2026-11-10 (cloisonnement)
-- (docs/audit-complet-2026-11.md, points B1, B2, S2, S3, S5, C5 et « points
-- plus petits » de la section 1)
--
-- CE QUE CETTE MIGRATION FAIT, EN CLAIR
--
--  1. Création d'une fiche patient par un kiné (faille B1 + B2).
--     Avant : la règle vérifiait seulement « le patient est rattaché à moi ».
--     Un kiné pouvait donc, en parlant directement à la base, créer une fiche
--     « patient » portant l'identifiant d'UN AUTRE KINÉ, puis la « supprimer »
--     — ce qui effaçait le compte de ce kiné et tous ses patients. Il pouvait
--     aussi créer la fiche avec un essai gratuit jusqu'en 2099 ou avec les CGU
--     déjà « acceptées ».
--     Après : à chaque création de fiche par un kiné, la base vérifie que
--       - l'identifiant n'est pas celui d'un kiné ;
--       - l'identifiant est bien un compte « réservé pour une invitation »
--         (pas encore relié à un compte de connexion) ;
--       - l'e-mail de la fiche est celui de ce compte réservé ;
--     et elle vide d'office les champs que seul le serveur peut remplir
--     (essai gratuit, date d'acceptation des CGU…).
--     Les créations faites par le serveur (lien QR code, comptes de test)
--     ne changent pas.
--
--  2. Suppression d'un compte (2e verrou pour B1).
--     Les deux fonctions serveur qui suppriment un compte refusent désormais
--     de supprimer un compte qui a une fiche KINÉ. Supprimer un patient, ou un
--     compte sans fiche, marche comme avant. (Les comptes de test gardent leur
--     propre fonction de suppression, inchangée.)
--
--  3. Bibliothèque lisible sans se connecter (S2).
--     Pathologies, séances de la bibliothèque, lignes de séance, zones du
--     corps : il faut maintenant être connecté (kiné ou patient) pour les
--     lire, comme c'est déjà le cas pour les exercices depuis 0067. Rien ne
--     change pour une personne connectée.
--
--  4. Rattachement d'un compte invité (S3).
--     À la première connexion, un compte « réservé » (patient invité) n'est
--     relié à la personne que si Clerk a VÉRIFIÉ son adresse e-mail. Sinon la
--     connexion est refusée avec un message clair, au lieu de donner le
--     dossier du patient à quelqu'un qui a seulement tapé son adresse.
--
--  5. Un patient ne peut plus se créer une fiche kiné (C5), et un kiné ne
--     peut pas non plus être en même temps patient par ce chemin.
--
--  6. Séances : en modifiant une de ses séances, un kiné ne peut plus la
--     rattacher au patient d'un autre kiné.
--
--  7. Profil de santé : un kiné ne peut plus SUPPRIMER le profil de santé (et
--     donc le consentement) d'un patient ; seul le patient ou le serveur.
--
--  8. Kiné suspendu / refusé / en attente : le blocage au niveau de la base
--     (0063) est étendu aux séances, lignes de séance, exercices, notes
--     d'honoraires et suivis — il ne peut plus rien y lire ni écrire en
--     parlant directement à la base.
--
--  9. Verrou « RLS forcé » posé explicitement sur toutes les tables publiques
--     déjà protégées (S5). Sur Scalingo c'était fait à la main ; l'écrire ici garantit qu'une
--     reconstruction de la base (passage en région HDS) ne l'oublie pas.
--
-- CE QU'ELLE NE CHANGE PAS : un kiné ne voit toujours que SES patients, un
-- patient que SA fiche ; aucune règle de lecture entre kinés n'est élargie.
--
-- Rejouable sans risque. Pas de begin/commit (scripts/migrate.mjs ouvre déjà
-- la transaction). Le code de l'appli fonctionne avant comme après.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Garde-fou à la création d'une fiche patient
-- ---------------------------------------------------------------------------
create or replace function internal.guard_patient_insert()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_pass text := coalesce(current_setting('app.admin_bypass', true), '');
  v_is_kine boolean;
  v_clerk text;
  v_email text;
  v_found boolean;
begin
  -- Créations faites par le serveur lui-même (0064 comptes de test, 0082 lien
  -- QR code) : elles ont déjà leurs propres contrôles.
  if v_pass in ('test_accounts', 'join_link') then
    return new;
  end if;

  -- Lecture des deux tables de référence avec un laissez-passer ouvert
  -- seulement le temps de la lecture, puis remis à sa valeur d'avant.
  perform set_config('app.admin_bypass', 'admin_read', true);
  select exists (select 1 from public.instructors i where i.id = new.id) into v_is_kine;
  perform set_config('app.admin_bypass', 'app_users', true);
  select true, u.clerk_id, u.email into v_found, v_clerk, v_email
  from public.app_users u where u.app_id = new.id;
  perform set_config('app.admin_bypass', v_pass, true);

  if v_is_kine then
    raise exception 'Cette adresse est déjà celle d''un compte kiné.';
  end if;
  if coalesce(v_found, false) is false then
    raise exception 'Identifiant de patient inconnu.';
  end if;
  if v_clerk is not null then
    raise exception 'Un compte existe déjà pour cette personne : elle ne peut pas être ajoutée comme nouveau patient.';
  end if;
  if lower(trim(coalesce(new.email, ''))) is distinct from lower(trim(coalesce(v_email, ''))) then
    raise exception 'L''adresse e-mail de la fiche ne correspond pas à l''invitation.';
  end if;

  -- Champs que seul le serveur remplit : vidés d'office. (jsonb_populate_record
  -- ignore les colonnes qui n'existent pas encore dans cette base.)
  new := jsonb_populate_record(new, jsonb_build_object(
    'trial_ends_at', null,
    'terms_accepted_at', null,
    'joined_via_link_at', null,
    'feedback_seen_at', null
  ));
  return new;
end;
$$;

drop trigger if exists patients_guard_insert on public.patients;
create trigger patients_guard_insert
  before insert on public.patients
  for each row execute function internal.guard_patient_insert();

-- ---------------------------------------------------------------------------
-- 2. Suppression d'un compte : jamais un compte qui a une fiche kiné
-- ---------------------------------------------------------------------------
create or replace function internal.delete_app_user_by_id(p_app_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform set_config('app.admin_bypass', 'admin_read', true);
  if exists (select 1 from public.instructors i where i.id = p_app_id) then
    perform set_config('app.admin_bypass', '', true);
    raise exception 'IS_KINE: ce compte a une fiche kiné, il ne peut pas être supprimé par ce chemin.';
  end if;
  perform set_config('app.admin_bypass', 'app_users', true);
  delete from public.app_users where app_id = p_app_id;
  perform set_config('app.admin_bypass', '', true);
end;
$$;

create or replace function internal.delete_app_user_by_email(p_email text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_email text := lower(trim(p_email));
  v_ids uuid[];
begin
  perform set_config('app.admin_bypass', 'app_users', true);
  select array_agg(u.app_id) into v_ids from public.app_users u where u.email = v_email;
  perform set_config('app.admin_bypass', 'admin_read', true);
  if v_ids is not null and exists (select 1 from public.instructors i where i.id = any(v_ids)) then
    perform set_config('app.admin_bypass', '', true);
    raise exception 'IS_KINE: ce compte a une fiche kiné, il ne peut pas être supprimé par ce chemin.';
  end if;
  perform set_config('app.admin_bypass', 'app_users', true);
  delete from public.app_users where email = v_email;
  perform set_config('app.admin_bypass', '', true);
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Bibliothèque : lecture réservée aux personnes connectées
--    (current_app_user_id() est vide sans session valide)
-- ---------------------------------------------------------------------------
drop policy if exists conditions_select_all on public.conditions;
create policy conditions_select_all on public.conditions
  for select to public
  using (public.current_app_user_id() is not null);

drop policy if exists body_parts_select_all on public.body_parts;
create policy body_parts_select_all on public.body_parts
  for select to public
  using (public.current_app_user_id() is not null);

drop policy if exists ex_body_parts_select_all on public.exercise_body_parts;
create policy ex_body_parts_select_all on public.exercise_body_parts
  for select to public
  using (public.current_app_user_id() is not null);

-- Séances : mêmes trois cas qu'avant (bibliothèque / ma séance de patient /
-- séance d'un de mes patients), mais seulement pour une personne connectée.
drop policy if exists workouts_select_visible on public.workouts;
create policy workouts_select_visible on public.workouts
  for select to public
  using (
    public.current_app_user_id() is not null
    and (
      patient_id is null
      or patient_id = public.current_app_user_id()
      or exists (select 1 from public.patients p
                 where p.id = workouts.patient_id
                   and p.instructor_id = public.current_app_user_id())
    )
  );

drop policy if exists workout_ex_select_visible on public.workout_exercises;
create policy workout_ex_select_visible on public.workout_exercises
  for select to public
  using (
    public.current_app_user_id() is not null
    and exists (
      select 1 from public.workouts w
      where w.id = workout_exercises.workout_id
        and (
          w.patient_id is null
          or w.patient_id = public.current_app_user_id()
          or exists (select 1 from public.patients p
                     where p.id = w.patient_id
                       and p.instructor_id = public.current_app_user_id())
        )
    )
  );

-- ---------------------------------------------------------------------------
-- 4. Première connexion : un compte réservé n'est relié qu'à une adresse
--    e-mail VÉRIFIÉE par Clerk. (Seul changement par rapport à 0076 : la
--    condition « p_email_verified » sur le rattachement du compte réservé, et
--    un refus explicite sinon.)
-- ---------------------------------------------------------------------------
create or replace function internal.resolve_app_user(p_clerk_id text, p_email text, p_email_verified boolean)
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
  -- seulement s'il n'en a pas déjà un ET si l'adresse est vérifiée.
  if coalesce(p_email_verified, false) then
    update public.app_users set clerk_id = p_clerk_id
    where email = v_email and clerk_id is null
    returning app_id into v_id;
    if v_id is not null then
      return v_id;
    end if;
  elsif exists (select 1 from public.app_users where email = v_email) then
    raise exception 'EMAIL_NOT_VERIFIED: un compte existe pour cette adresse, mais elle n''a pas été vérifiée.';
  end if;

  -- Nouveau Clerk (production) : e-mail vérifié par Clerk et déjà lié à un
  -- autre identifiant → on rattache le même compte au nouvel identifiant.
  if coalesce(p_email_verified, false) and v_email <> '' then
    update public.app_users set clerk_id = p_clerk_id
    where email = v_email and clerk_id is distinct from p_clerk_id
    returning app_id into v_id;
    if v_id is not null then
      return v_id;
    end if;
  end if;

  insert into public.app_users (clerk_id, email)
  values (p_clerk_id, v_email)
  on conflict do nothing
  returning app_id into v_id;
  if v_id is not null then
    return v_id;
  end if;

  select app_id into v_id from public.app_users where clerk_id = p_clerk_id;
  if v_id is null then
    raise exception 'resolve_app_user: impossible de créer ou retrouver le compte (e-mail déjà lié à un autre identifiant ?)';
  end if;
  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Un patient ne peut pas se créer une fiche kiné
-- ---------------------------------------------------------------------------
drop policy if exists instructors_insert_self on public.instructors;
create policy instructors_insert_self on public.instructors
  for insert to public
  with check (
    id = public.current_app_user_id()
    and status = 'pending'
    and not exists (select 1 from public.patients p where p.id = public.current_app_user_id())
  );

-- ---------------------------------------------------------------------------
-- 6. Modifier une séance : le rattachement à un patient est revérifié
--    (même condition que la création, 0044)
-- ---------------------------------------------------------------------------
drop policy if exists workouts_update_owner on public.workouts;
create policy workouts_update_owner on public.workouts
  for update to public
  using (created_by = public.current_app_user_id())
  with check (
    created_by = public.current_app_user_id()
    and (
      patient_id is null
      or exists (select 1 from public.patients p
                 where p.id = patient_id
                   and p.instructor_id = public.current_app_user_id())
    )
  );

-- ---------------------------------------------------------------------------
-- 7. Profil de santé : le kiné le LIT, il ne le supprime plus.
--    (L'écriture par le kiné était déjà bloquée par 0063. La suppression en
--    cascade quand la fiche patient est supprimée continue de fonctionner :
--    les cascades ne passent pas par ces règles.)
-- ---------------------------------------------------------------------------
drop policy if exists patient_profiles_by_instructor on public.patient_profiles;
create policy patient_profiles_by_instructor on public.patient_profiles
  for select to public
  using (
    exists (
      select 1 from public.patients p
      where p.id = patient_profiles.id and p.instructor_id = public.current_app_user_id()
    )
  );

-- ---------------------------------------------------------------------------
-- 8. Kiné non validé (en attente, refusé, suspendu) : blocage étendu.
--    Règle RESTRICTIVE, comme en 0063 : elle s'ajoute aux règles existantes,
--    rien ne change pour un kiné validé ni pour un patient.
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'workouts', 'workout_exercises', 'exercises', 'monthly_reviews', 'patient_follow_ups'
  ] loop
    if to_regclass('public.' || t) is not null then
      execute format('drop policy if exists %I on public.%I', t || '_not_blocked_instructor', t);
      execute format(
        'create policy %I on public.%I as restrictive for all to public
           using (not public.current_user_is_blocked_instructor())
           with check (not public.current_user_is_blocked_instructor())',
        t || '_not_blocked_instructor', t
      );
    end if;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- 9. Verrou « RLS forcé » sur toutes les tables publiques déjà protégées.
--    Une table publique SANS protection du tout est seulement signalée (et
--    laissée telle quelle : c'est le cas voulu du journal des migrations).
-- ---------------------------------------------------------------------------
do $$
declare
  r record;
begin
  for r in
    select c.relname, c.relrowsecurity, c.relforcerowsecurity
    from pg_class c
    where c.relnamespace = 'public'::regnamespace and c.relkind = 'r'
  loop
    if r.relrowsecurity and not r.relforcerowsecurity then
      execute format('alter table public.%I force row level security', r.relname);
      raise notice 'RLS forcé posé sur public.%', r.relname;
    elsif not r.relrowsecurity then
      raise notice 'ATTENTION : public.% n''a aucune protection RLS', r.relname;
    end if;
  end loop;
end;
$$;
