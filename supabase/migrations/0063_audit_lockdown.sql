-- =============================================================================
-- 0063 — Verrouillage après l'audit de sécurité du 2026-10-08.
--
-- En clair, pour Philippe (CLAUDE.md §3 : chaque règle expliquée avant d'être
-- appliquée) :
--
--  1. Un kiné EN ATTENTE, REFUSÉ ou SUSPENDU ne voit plus aucune donnée
--     patient, même en interrogeant la base directement. Jusqu'ici, seul
--     l'écran de l'appli le bloquait ; un utilisateur technique pouvait encore
--     lire et modifier les fiches, profils de santé, messages et séances de
--     ses patients. On tient à jour une petite liste « kinés bloqués »
--     (instructor_blocks), remplie automatiquement à chaque changement de
--     statut, et chaque table de données patient reçoit une règle de plus :
--     « un kiné de cette liste ne voit et n'écrit rien ici ». Les patients ne
--     sont jamais concernés (ils ne sont pas dans la liste) ; les kinés
--     validés ne voient aucune différence.
--
--  2. Un kiné ne peut plus changer l'e-mail (ni l'identifiant, ni le kiné
--     rattaché, ni la date d'acceptation des CGU) d'une fiche patient. C'est
--     la faille critique de l'audit : en mettant l'e-mail de quelqu'un
--     d'autre sur un de ses patients puis en le supprimant, il faisait
--     supprimer le compte de cette personne. (Le code de suppression a aussi
--     été corrigé : il ne se fie plus à cet e-mail.)
--
--  3. Le profil de santé d'un patient (dont son consentement aux données de
--     santé et l'étape déclarée) ne peut être écrit QUE par le patient
--     lui-même. Un kiné pouvait jusqu'ici cocher le consentement à sa place.
--
--  4. Le badge « RPPS vérifié » de /admin ne peut plus être posé par le kiné
--     lui-même : seule la vérification automatique côté serveur peut le faire
--     (internal.admin_set_rpps_verified), et changer de numéro RPPS l'efface.
--
--  5. Nettoyage : deux règles d'accès qui utilisaient encore l'ancienne
--     identité Supabase (auth.uid(), toujours vide avec Clerk) lisent
--     maintenant la bonne identité, et une vieille règle trop large sur le
--     stockage des vidéos (Supabase seulement) est supprimée.
--
-- Rejouable sans risque (drop … if exists / create or replace / on conflict).
-- Sur Scalingo, le journal schema_migrations est incomplet : appliquer CE
-- fichier seul, jamais migrate.mjs en entier (voir scripts/migrate.mjs).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Kinés bloqués
-- ---------------------------------------------------------------------------

create table if not exists public.instructor_blocks (
  instructor_id uuid primary key references public.instructors (id) on delete cascade,
  status text not null,
  blocked_at timestamptz not null default now()
);

alter table public.instructor_blocks enable row level security;
alter table public.instructor_blocks force row level security;

-- Chacun ne peut lire que SA propre ligne (et aucune écriture directe) : la
-- liste n'est tenue que par le déclencheur ci-dessous.
drop policy if exists instructor_blocks_select_own on public.instructor_blocks;
create policy instructor_blocks_select_own on public.instructor_blocks
  for select to public
  using (instructor_id = public.current_app_user_id());

drop policy if exists instructor_blocks_maintain on public.instructor_blocks;
create policy instructor_blocks_maintain on public.instructor_blocks
  for all to public
  using (current_setting('app.admin_bypass', true) = 'instructor_blocks')
  with check (current_setting('app.admin_bypass', true) = 'instructor_blocks');

-- Tenue automatique de la liste à chaque création de compte kiné ou
-- changement de statut. Le laissez-passer n'est ouvert que le temps de
-- l'écriture, puis remis à sa valeur précédente.
create or replace function internal.sync_instructor_block()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_previous text := coalesce(current_setting('app.admin_bypass', true), '');
begin
  perform set_config('app.admin_bypass', 'instructor_blocks', true);
  if coalesce(new.status, 'approved') = 'approved' then
    delete from public.instructor_blocks where instructor_id = new.id;
  else
    insert into public.instructor_blocks (instructor_id, status)
    values (new.id, new.status)
    on conflict (instructor_id) do update set status = excluded.status, blocked_at = now();
  end if;
  perform set_config('app.admin_bypass', v_previous, true);
  return null;
end;
$$;

drop trigger if exists instructors_sync_block on public.instructors;
create trigger instructors_sync_block
  after insert or update of status on public.instructors
  for each row execute function internal.sync_instructor_block();

-- Liste initiale. La lecture de `instructors` passe par ses règles d'accès
-- (FORCE ROW LEVEL SECURITY, même pour le propriétaire) : on les suspend le
-- temps de cette seule lecture, dans la transaction de la migration, comme
-- 0060 l'a fait pour `exercises`.
alter table public.instructors no force row level security;
select set_config('app.admin_bypass', 'instructor_blocks', true);
insert into public.instructor_blocks (instructor_id, status)
select id, status from public.instructors where coalesce(status, 'approved') <> 'approved'
on conflict (instructor_id) do update set status = excluded.status;
delete from public.instructor_blocks b
using public.instructors i
where i.id = b.instructor_id and coalesce(i.status, 'approved') = 'approved';
select set_config('app.admin_bypass', '', true);
alter table public.instructors force row level security;

-- Vrai si la personne connectée est un kiné bloqué. Lit seulement
-- instructor_blocks (règle « ma propre ligne », sans sous-requête) : aucune
-- boucle possible avec les règles des autres tables.
create or replace function public.current_user_is_blocked_instructor()
returns boolean
language sql
stable
set search_path = public, pg_temp
as $$
  select exists (select 1 from public.instructor_blocks where instructor_id = public.current_app_user_id());
$$;

-- Règle RESTRICTIVE : elle s'ajoute (ET) aux règles existantes au lieu de les
-- remplacer — rien de ce qui était autorisé ne change pour un kiné validé ou
-- un patient.
do $$
declare
  t text;
begin
  foreach t in array array[
    'patients', 'patient_profiles', 'patient_feedback', 'workout_logs',
    'patient_messages', 'patient_recommended_workouts', 'subscriptions'
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
-- 2. Fiche patient : e-mail, identifiant, kiné et CGU non modifiables
-- ---------------------------------------------------------------------------

create or replace function internal.guard_patient_identity()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_bypass text := coalesce(current_setting('app.admin_bypass', true), '');
begin
  if new.id is distinct from old.id
     or lower(new.email) is distinct from lower(old.email)
     or new.instructor_id is distinct from old.instructor_id then
    raise exception 'L''e-mail, l''identifiant et le kiné d''une fiche patient ne peuvent pas être modifiés.';
  end if;
  if new.terms_accepted_at is distinct from old.terms_accepted_at and v_bypass <> 'accept_patient_terms' then
    raise exception 'Seul le patient peut accepter les CGU.';
  end if;
  return new;
end;
$$;

drop trigger if exists patients_guard_identity on public.patients;
create trigger patients_guard_identity
  before update on public.patients
  for each row execute function internal.guard_patient_identity();

-- ---------------------------------------------------------------------------
-- 3. Profil de santé : écrit par le patient lui-même uniquement
-- ---------------------------------------------------------------------------
-- Aucun écran kiné n'écrit dans patient_profiles. current_app_user_id() est
-- vide pour la connexion serveur directe (lib/db/admin.ts : export,
-- suppression…), qui reste donc possible.

create or replace function internal.guard_patient_profile_owner()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_me uuid := public.current_app_user_id();
begin
  if v_me is not null and v_me is distinct from new.id then
    raise exception 'Seul le patient peut remplir son profil de santé et son consentement.';
  end if;
  return new;
end;
$$;

drop trigger if exists patient_profiles_guard_owner on public.patient_profiles;
create trigger patient_profiles_guard_owner
  before insert or update on public.patient_profiles
  for each row execute function internal.guard_patient_profile_owner();

-- ---------------------------------------------------------------------------
-- 4. « RPPS vérifié » : posé par le serveur seulement
-- ---------------------------------------------------------------------------

create or replace function internal.guard_instructor_rpps()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_bypass boolean := coalesce(current_setting('app.admin_bypass', true), '') = 'set_rpps_verified';
begin
  if v_bypass then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.rpps_verified_at := null;
  elsif new.rpps_number is distinct from old.rpps_number then
    new.rpps_verified_at := null; -- nouveau numéro : à revérifier
  elsif new.rpps_verified_at is distinct from old.rpps_verified_at then
    raise exception 'La vérification RPPS ne peut être faite que par EasyPhysio.';
  end if;
  return new;
end;
$$;

drop trigger if exists instructors_guard_rpps on public.instructors;
create trigger instructors_guard_rpps
  before insert or update on public.instructors
  for each row execute function internal.guard_instructor_rpps();

create or replace function internal.admin_set_rpps_verified(p_instructor_id uuid, p_verified_at timestamptz)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform set_config('app.admin_bypass', 'set_rpps_verified', true);
  update public.instructors set rpps_verified_at = p_verified_at where id = p_instructor_id;
  perform set_config('app.admin_bypass', '', true);
end;
$$;

-- La mise à jour ci-dessus passe aussi par les règles de la table (lecture
-- de la ligne visée, puis écriture) : on les autorise pour ce seul
-- laissez-passer.
drop policy if exists instructors_rpps_bypass_read on public.instructors;
create policy instructors_rpps_bypass_read on public.instructors
  for select to public
  using (current_setting('app.admin_bypass', true) = 'set_rpps_verified');

drop policy if exists instructors_rpps_bypass on public.instructors;
create policy instructors_rpps_bypass on public.instructors
  for update to public
  using (current_setting('app.admin_bypass', true) = 'set_rpps_verified')
  with check (current_setting('app.admin_bypass', true) = 'set_rpps_verified');

-- ---------------------------------------------------------------------------
-- 5. Nettoyage
-- ---------------------------------------------------------------------------

do $$
begin
  if to_regclass('public.instructor_connect_accounts') is not null then
    drop policy if exists connect_accounts_self_read on public.instructor_connect_accounts;
    create policy connect_accounts_self_read on public.instructor_connect_accounts
      for select to public
      using (instructor_id = public.current_app_user_id());
  end if;
  if to_regclass('public.platform_invoices') is not null then
    drop policy if exists platform_invoices_self_read on public.platform_invoices;
    create policy platform_invoices_self_read on public.platform_invoices
      for select to public
      using (instructor_id = public.current_app_user_id());
  end if;
  -- Schéma storage : n'existe que sur Supabase.
  if to_regclass('storage.objects') is not null then
    drop policy if exists exercise_media_instructor_write on storage.objects;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. Supprimer une séance n'efface plus l'historique des patients
-- ---------------------------------------------------------------------------
-- Jusqu'ici, supprimer une séance effaçait en cascade toutes les séances
-- RÉALISÉES qui s'y rapportent (workout_logs) et ses attributions — y
-- compris celles des patients d'AUTRES kinés, puisque la bibliothèque est
-- partagée : des données de santé perdues. Désormais la base refuse la
-- suppression tant qu'une séance réalisée ou une attribution y renvoie
-- (« no action » : vérifié en fin d'opération, si bien que supprimer un
-- patient avec ses copies de séance personnelles et son historique marche
-- toujours d'un seul coup).
do $$
declare
  r record;
begin
  for r in
    select c.conname, c.conrelid::regclass as tbl
    from pg_constraint c
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any (c.conkey)
    where c.contype = 'f'
      and c.confrelid = 'public.workouts'::regclass
      and c.conrelid in ('public.workout_logs'::regclass, 'public.patient_recommended_workouts'::regclass)
      and a.attname = 'workout_id'
  loop
    execute format('alter table %s drop constraint %I', r.tbl, r.conname);
  end loop;
end;
$$;

alter table public.workout_logs
  add constraint workout_logs_workout_id_fkey
  foreign key (workout_id) references public.workouts (id) on delete no action;
alter table public.patient_recommended_workouts
  add constraint patient_recommended_workouts_workout_id_fkey
  foreign key (workout_id) references public.workouts (id) on delete no action;
