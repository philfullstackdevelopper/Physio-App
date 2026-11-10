-- =============================================================================
-- 0089 — Argent : corrections après l'audit complet du 2026-11-10
--        (docs/audit-complet-2026-11.md, points B5, M1 et M4).
--
-- !!! À APPLIQUER AVANT DE DÉPLOYER LE CODE QUI VA AVEC !!!
-- Le nouveau code lit la colonne monthly_reviews.patient_name et appelle les
-- fonctions internal.trial_already_used, internal.mark_trial_used,
-- internal.record_billing_acceptance et internal.kine_fees_acceptance créées
-- ici : sans ce fichier, plus aucun patient ne peut s'abonner et les notes
-- d'honoraires ne s'affichent plus. Dans l'autre sens, aucun souci : l'ANCIEN
-- code continue de fonctionner une fois ce fichier appliqué (les fonctions
-- existantes gardent leur nom et leurs paramètres).
-- Ordre : 1) node scripts/migrate.mjs --only 0089_billing_audit.sql
--         2) déployer le code.
--
-- En clair, pour Philippe (CLAUDE.md §3 : chaque règle expliquée avant d'être
-- appliquée) :
--
--  1. LES NOTES D'HONORAIRES DU KINÉ SURVIVENT À LA SUPPRESSION DU PATIENT.
--     Jusqu'ici, supprimer un patient effaçait aussi ses lignes dans
--     `monthly_reviews` (les mois facturés 6 € par le kiné) : la note
--     disparaissait du récapitulatif et du CSV du kiné alors que l'argent
--     était bien sur son compte. Désormais, quand le patient est supprimé, la
--     ligne RESTE : seul le lien vers le patient est vidé (patient_id devient
--     vide). Pour que la note garde un nom, on recopie le nom du patient sur
--     la note au moment où elle est émise (nouvelle colonne patient_name) ;
--     les notes déjà émises sont complétées avec le nom actuel.
--     Qui lit quoi — INCHANGÉ : le kiné lit ses notes (règle par instructor_id,
--     elle ne dépend pas du patient) ; le patient lit les siennes (règle par
--     patient_id) ; une note dont le patient est supprimé n'est donc plus lue
--     que par le kiné. Personne n'écrit depuis le navigateur.
--     Ce qui reste effacé avec le patient (volontairement) : sa carte et son
--     accord chez le kiné (patient_follow_ups) et son abonnement d'accès
--     (subscriptions) — ce sont des données de paiement personnelles, sans
--     valeur comptable pour le kiné.
--     Si c'est le KINÉ qui est supprimé : ses notes partent toujours avec lui
--     (inchangé). Supprimer un kiné reste une opération manuelle : exporter
--     ses notes avant (obligation de conservation comptable du kiné).
--     Durée de conservation du nom sur la note : à valider avec un comptable
--     et à écrire dans la politique de confidentialité.
--
--  2. UN NUMÉRO DE NOTE N'EST JAMAIS RÉUTILISÉ.
--     Le numéro était « le plus grand numéro existant + 1 » : si la dernière
--     note disparaissait, son numéro était redonné. Un compteur par kiné et
--     par année (table internal.fee_note_counters) retient maintenant le
--     dernier numéro donné ; il ne recule jamais. Il démarre au plus grand
--     numéro déjà utilisé. Cette table vit dans le schéma `internal`, que
--     l'API n'expose pas : ni kiné ni patient ne peuvent la lire ou l'écrire.
--
--  3. L'ESSAI GRATUIT DE 10 JOURS NE SE REPREND PAS.
--     Un patient pouvait supprimer son compte, se réinscrire avec le même
--     e-mail et retrouver 10 jours gratuits, indéfiniment. On retient donc
--     qu'un e-mail a déjà eu son essai, dans internal.trial_uses : seulement
--     une EMPREINTE de l'e-mail (SHA-256 de l'adresse en minuscules — on ne
--     peut pas relire l'adresse) et la date. Cette ligne survit à la
--     suppression du compte (c'est son but). Schéma `internal` : jamais lue ni
--     écrite depuis un navigateur. Les patients qui ont déjà un abonnement
--     sont inscrits d'office. À mentionner dans la politique de
--     confidentialité (donnée pseudonymisée conservée après suppression).
--
--  4. L'ACCORD ÉCRIT DU PATIENT SUR LES DEUX MONTANTS EST CONSERVÉ.
--     Quand le patient coche la case et choisit son offre, le serveur
--     enregistre dans internal.billing_acceptances : la date, l'offre, les
--     deux montants (accès EasyPhysio et honoraires du kiné), les jours
--     d'essai, le kiné nommé dans l'accord, la langue et la version des CGU.
--     Le kiné est lu sur la fiche du patient par le serveur (le navigateur ne
--     peut pas en nommer un autre). Cette preuve survit à la suppression du
--     compte (le lien vers le patient est vidé, il reste l'empreinte de
--     l'e-mail) — durée à valider avec un juriste. Schéma `internal` : jamais
--     lue ni écrite depuis un navigateur.
--     Une fonction dit si le patient a donné son accord pour SON kiné actuel :
--     si son kiné a changé depuis l'accord, le serveur ne copie plus sa carte
--     et ne prélève plus les 6 € tant qu'il n'a pas redonné son accord.
--
-- Ce fichier ne change AUCUNE règle de cloisonnement entre kinés ni entre
-- patients, en dehors de ce qui est décrit ci-dessus (les règles de lecture de
-- monthly_reviews ne sont pas modifiées ; les trois nouvelles tables sont
-- réservées au serveur).
--
-- Rejouable sans risque. Pas de begin/commit : scripts/migrate.mjs ouvre déjà
-- une transaction par fichier. Ne dépend pas de la migration 0088.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Notes d'honoraires : elles restent quand le patient est supprimé
-- ---------------------------------------------------------------------------

-- Nom du patient recopié sur la note au moment où elle est émise.
alter table public.monthly_reviews add column if not exists patient_name text;

-- Le lien vers le patient peut être vide (patient supprimé).
alter table public.monthly_reviews alter column patient_id drop not null;

-- Le lien « patient » de 0071 effaçait la note avec le patient (on delete
-- cascade). On le retrouve (quel que soit son nom) et on le remplace par un
-- lien qui VIDE seulement patient_id (on delete set null).
do $$
declare r record;
begin
  for r in
    select c.conname
    from pg_constraint c
    where c.conrelid = 'public.monthly_reviews'::regclass
      and c.contype = 'f'
      and c.confrelid = 'public.patients'::regclass
  loop
    execute format('alter table public.monthly_reviews drop constraint %I', r.conname);
  end loop;
end $$;

alter table public.monthly_reviews
  add constraint monthly_reviews_patient_id_fkey
  foreign key (patient_id) references public.patients (id) on delete set null;

-- Les autres règles de la table restent valables avec un patient vide :
--   - unique (patient_id, period) : un seul mois facturé par patient et par
--     mois ; deux notes de patients supprimés ne se gênent pas (deux « vides »
--     ne sont jamais considérés comme égaux) ;
--   - unique (instructor_id, fee_note_year, fee_note_seq) : inchangée ;
--   - lecture du kiné : par instructor_id, inchangée ;
--   - lecture du patient : par patient_id ; une note sans patient n'est lue
--     par aucun patient.

-- Notes déjà émises : on recopie le nom actuel du patient. La table étant
-- protégée même pour le serveur (RLS forcée), on lit avec le passe
-- « admin_read » puis on écrit avec le passe « review_write » (0071).
do $$
declare v jsonb;
begin
  perform set_config('app.admin_bypass', 'admin_read', true);
  select coalesce(jsonb_agg(jsonb_build_object('id', r.id, 'name', p.full_name)), '[]'::jsonb)
    into v
    from public.monthly_reviews r
    join public.patients p on p.id = r.patient_id
    where r.patient_name is null and p.full_name is not null;
  perform set_config('app.admin_bypass', 'review_write', true);
  update public.monthly_reviews r
     set patient_name = x.name
    from jsonb_to_recordset(v) as x(id uuid, name text)
   where r.id = x.id;
  perform set_config('app.admin_bypass', '', true);
end $$;

-- ---------------------------------------------------------------------------
-- 2. Compteur des numéros de note, par kiné et par année
-- ---------------------------------------------------------------------------

create table if not exists internal.fee_note_counters (
  instructor_id uuid not null references public.instructors (id) on delete cascade,
  note_year     integer not null,
  last_seq      integer not null check (last_seq >= 0),
  updated_at    timestamptz not null default now(),
  primary key (instructor_id, note_year)
);

alter table internal.fee_note_counters enable row level security;
alter table internal.fee_note_counters force row level security;

-- Une seule règle : le serveur, avec le passe « review_write » (celui qui
-- écrit déjà les notes). Aucune règle pour les kinés ni les patients.
drop policy if exists fee_note_counters_server_only on internal.fee_note_counters;
create policy fee_note_counters_server_only on internal.fee_note_counters
  for all to public
  using (current_setting('app.admin_bypass', true) = 'review_write')
  with check (current_setting('app.admin_bypass', true) = 'review_write');

-- Départ : le plus grand numéro déjà donné à chaque kiné, chaque année. En
-- cas de rejeu, le compteur ne recule jamais (greatest).
do $$
begin
  perform set_config('app.admin_bypass', 'review_write', true);
  insert into internal.fee_note_counters as c (instructor_id, note_year, last_seq)
    select r.instructor_id, r.fee_note_year, max(r.fee_note_seq)
    from public.monthly_reviews r
    group by r.instructor_id, r.fee_note_year
  on conflict (instructor_id, note_year) do update
    set last_seq = greatest(c.last_seq, excluded.last_seq), updated_at = now();
  perform set_config('app.admin_bypass', '', true);
end $$;

-- Enregistre le mois facturé et lui donne le numéro de note suivant. Mêmes
-- paramètres et même résultat qu'en 0071 (l'ancien code continue de marcher).
-- Nouveautés : le numéro vient du compteur (jamais réutilisé) et le nom du
-- patient est recopié sur la note. Refuse toujours un deuxième mois pour le
-- même patient et le même mois (erreur 23505) ; dans ce cas rien n'est
-- enregistré et le compteur n'avance pas (tout est annulé ensemble).
create or replace function internal.record_monthly_review(
  p_patient_id uuid,
  p_instructor_id uuid,
  p_period date,
  p_feedback text,
  p_amount_cents integer
)
returns table(review_id uuid, fee_note_year integer, fee_note_seq integer)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_year integer := extract(year from p_period)::integer;
  v_seq integer;
  v_max integer;
  v_id uuid;
  v_name text;
begin
  -- Nom du patient au moment de la note (lecture serveur).
  perform set_config('app.admin_bypass', 'admin_read', true);
  select p.full_name into v_name from public.patients p where p.id = p_patient_id;

  perform set_config('app.admin_bypass', 'review_write', true);
  -- Un seul numéro à la fois par kiné : verrou le temps de la transaction.
  perform pg_advisory_xact_lock(hashtext('fee_note:' || p_instructor_id::text));
  -- Ceinture et bretelles : le compteur ne passe jamais sous le plus grand
  -- numéro réellement présent.
  select coalesce(max(r.fee_note_seq), 0) into v_max
    from public.monthly_reviews r
    where r.instructor_id = p_instructor_id and r.fee_note_year = v_year;
  insert into internal.fee_note_counters as c (instructor_id, note_year, last_seq)
    values (p_instructor_id, v_year, v_max + 1)
  on conflict (instructor_id, note_year) do update
    set last_seq = greatest(c.last_seq, v_max) + 1, updated_at = now()
  returning c.last_seq into v_seq;

  insert into public.monthly_reviews (
    patient_id, instructor_id, period, feedback, amount_cents, fee_note_year, fee_note_seq, patient_name
  ) values (
    p_patient_id, p_instructor_id, p_period, p_feedback, p_amount_cents, v_year, v_seq, v_name
  )
  returning id into v_id;
  perform set_config('app.admin_bypass', '', true);
  return query select v_id, v_year, v_seq;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Essai gratuit déjà utilisé (empreinte de l'e-mail)
-- ---------------------------------------------------------------------------

-- Empreinte d'un e-mail : SHA-256 de l'adresse en minuscules, sans espaces
-- autour. Vide si l'adresse est vide. Ne lit aucune table.
create or replace function internal.email_hash(p_email text)
returns text
language sql
immutable
as $$
  select case
    when p_email is null or length(trim(p_email)) = 0 then null
    else encode(sha256(convert_to(lower(trim(p_email)), 'UTF8')), 'hex')
  end;
$$;

create table if not exists internal.trial_uses (
  email_hash text primary key check (email_hash ~ '^[0-9a-f]{64}$'),
  used_at    timestamptz not null default now()
);

alter table internal.trial_uses enable row level security;
alter table internal.trial_uses force row level security;

-- Une seule règle : le serveur, avec le passe « trial_use ».
drop policy if exists trial_uses_server_only on internal.trial_uses;
create policy trial_uses_server_only on internal.trial_uses
  for all to public
  using (current_setting('app.admin_bypass', true) = 'trial_use')
  with check (current_setting('app.admin_bypass', true) = 'trial_use');

-- « Ce patient a consommé son essai » : appelée par le serveur quand son
-- abonnement d'accès est enregistré (retour de paiement, webhook Stripe).
-- L'e-mail est lu sur la fiche du patient. Rejouable (la première date reste).
create or replace function internal.mark_trial_used(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_hash text;
begin
  perform set_config('app.admin_bypass', 'admin_read', true);
  select internal.email_hash(p.email) into v_hash from public.patients p where p.id = p_user_id;
  if v_hash is not null then
    perform set_config('app.admin_bypass', 'trial_use', true);
    insert into internal.trial_uses (email_hash) values (v_hash)
    on conflict (email_hash) do nothing;
  end if;
  perform set_config('app.admin_bypass', '', true);
end;
$$;

-- « Cet e-mail a-t-il déjà eu son essai ? » On regarde l'e-mail de la fiche
-- du patient ET celui de sa connexion (p_email), au cas où ils diffèrent.
create or replace function internal.trial_already_used(p_user_id uuid, p_email text)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_hash text;
  v_used boolean;
begin
  perform set_config('app.admin_bypass', 'admin_read', true);
  select internal.email_hash(p.email) into v_hash from public.patients p where p.id = p_user_id;
  perform set_config('app.admin_bypass', 'trial_use', true);
  select exists (
    select 1 from internal.trial_uses t
    where t.email_hash = v_hash or t.email_hash = internal.email_hash(p_email)
  ) into v_used;
  perform set_config('app.admin_bypass', '', true);
  return coalesce(v_used, false);
end;
$$;

-- Patients qui ont déjà un abonnement enregistré : leur essai est consommé.
do $$
declare v text[];
begin
  perform set_config('app.admin_bypass', 'admin_read', true);
  select coalesce(array_agg(distinct internal.email_hash(p.email)), '{}'::text[])
    into v
    from public.subscriptions s
    join public.patients p on p.id = s.user_id
    where internal.email_hash(p.email) is not null;
  perform set_config('app.admin_bypass', 'trial_use', true);
  insert into internal.trial_uses (email_hash)
    select h from unnest(v) as h
  on conflict (email_hash) do nothing;
  perform set_config('app.admin_bypass', '', true);
end $$;

-- ---------------------------------------------------------------------------
-- 4. Accord écrit du patient sur les deux montants
-- ---------------------------------------------------------------------------

create table if not exists internal.billing_acceptances (
  id             uuid primary key default gen_random_uuid(),
  -- Vidé si le patient / le kiné est supprimé : la preuve reste (empreinte de l'e-mail).
  patient_id     uuid references public.patients (id) on delete set null,
  instructor_id  uuid references public.instructors (id) on delete set null,
  email_hash     text,
  accepted_at    timestamptz not null default now(),
  offer_key      text not null,
  platform_cents integer not null check (platform_cents >= 0),
  kine_cents     integer not null check (kine_cents >= 0),
  trial_days     integer not null default 0 check (trial_days >= 0),
  locale         text not null,
  terms_version  text not null
);
create index if not exists idx_billing_acceptances_patient
  on internal.billing_acceptances (patient_id, accepted_at desc);

alter table internal.billing_acceptances enable row level security;
alter table internal.billing_acceptances force row level security;

-- Une seule règle : le serveur, avec le passe « billing_acceptance ».
drop policy if exists billing_acceptances_server_only on internal.billing_acceptances;
create policy billing_acceptances_server_only on internal.billing_acceptances
  for all to public
  using (current_setting('app.admin_bypass', true) = 'billing_acceptance')
  with check (current_setting('app.admin_bypass', true) = 'billing_acceptance');

-- Enregistre l'accord du patient (case cochée + offre choisie). Le kiné et
-- l'e-mail sont lus sur la fiche du patient, jamais reçus du navigateur.
-- Lève une erreur si la fiche patient n'existe pas.
create or replace function internal.record_billing_acceptance(
  p_patient_id uuid,
  p_offer_key text,
  p_platform_cents integer,
  p_kine_cents integer,
  p_trial_days integer,
  p_locale text,
  p_terms_version text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_instructor uuid;
  v_hash text;
  v_id uuid;
begin
  perform set_config('app.admin_bypass', 'admin_read', true);
  select p.instructor_id, internal.email_hash(p.email) into v_instructor, v_hash
    from public.patients p where p.id = p_patient_id;
  if not found then
    perform set_config('app.admin_bypass', '', true);
    raise exception 'record_billing_acceptance : patient % introuvable', p_patient_id;
  end if;
  perform set_config('app.admin_bypass', 'billing_acceptance', true);
  insert into internal.billing_acceptances (
    patient_id, instructor_id, email_hash, offer_key, platform_cents, kine_cents, trial_days, locale, terms_version
  ) values (
    p_patient_id, v_instructor, v_hash, p_offer_key, p_platform_cents, p_kine_cents,
    coalesce(p_trial_days, 0), p_locale, p_terms_version
  )
  returning id into v_id;
  perform set_config('app.admin_bypass', '', true);
  return v_id;
end;
$$;

-- Le patient a-t-il donné son accord pour les honoraires de CE kiné ?
--   'yes'   : son dernier accord nomme ce kiné ;
--   'other' : son dernier accord nomme un autre kiné (ou un kiné supprimé) —
--             le serveur ne copie pas la carte et ne prélève pas ;
--   'none'  : aucun accord enregistré (abonné avant ce fichier). On regarde
--             alors l'ancien enregistrement (patient_follow_ups) : s'il nomme
--             un autre kiné, c'est 'other' ; sinon 'none' (toléré, comme avant).
create or replace function internal.kine_fees_acceptance(p_patient_id uuid, p_instructor_id uuid)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_found boolean := false;
  v_instructor uuid;
  v_old uuid;
begin
  perform set_config('app.admin_bypass', 'billing_acceptance', true);
  select true, a.instructor_id into v_found, v_instructor
    from internal.billing_acceptances a
    where a.patient_id = p_patient_id
    order by a.accepted_at desc
    limit 1;
  if coalesce(v_found, false) then
    perform set_config('app.admin_bypass', '', true);
    return case when v_instructor = p_instructor_id then 'yes' else 'other' end;
  end if;
  perform set_config('app.admin_bypass', 'admin_read', true);
  select f.instructor_id into v_old
    from public.patient_follow_ups f
    where f.patient_id = p_patient_id and f.consented_at is not null;
  perform set_config('app.admin_bypass', '', true);
  if v_old is not null and v_old <> p_instructor_id then
    return 'other';
  end if;
  return 'none';
end;
$$;
