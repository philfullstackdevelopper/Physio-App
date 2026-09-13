-- Physio-App — Migration 0057: fonctions d'accès privilégié pour Scalingo
--
-- SCALINGO UNIQUEMENT (ne pas appliquer sur Supabase). Ne concerne pas la
-- base de production live, qui garde le mécanisme "service role" de Supabase
-- inchangé, et qui fonctionne toujours très bien.
--
-- Contexte : sur Scalingo, le rôle unique disponible n'a ni CREATEROLE, ni
-- BYPASSRLS (vérifié directement : `select rolbypassrls, rolcreaterole from
-- pg_roles` renvoie faux pour les deux). Impossible donc de recréer
-- l'équivalent de la clé "service role" de Supabase, qui contourne toutes
-- les règles de sécurité. À la place : quelques fonctions "security definer"
-- ultra-précises, sur le modèle de set_exercise_media() (migration 0022)
-- déjà présent dans le code — chacune ne fait qu'une seule chose bien
-- définie, jamais un contournement général.
--
-- Mécanisme : chaque fonction pose un drapeau de session
-- (app.admin_bypass = 'nom_de_l_operation') juste avant son écriture ; une
-- politique RLS supplémentaire, permissive, vérifie ce drapeau exact sur
-- chaque table concernée. Comme PostgREST ne laisse jamais un client poser
-- lui-même ce drapeau, le seul chemin possible passe par ces fonctions.
--
-- IMPORTANT — leçon de sécurité (2026-09-13) : `revoke execute ... from
-- public` NE PROTÈGE RIEN ici. Avec un seul rôle Postgres disponible sur
-- Scalingo, ce rôle est aussi PROPRIÉTAIRE de chaque fonction qu'il crée, et
-- un propriétaire garde toujours le droit d'exécuter ses propres fonctions,
-- quoi qu'on révoque par ailleurs (vérifié en le testant en conditions
-- réelles : une révocation "from public" n'a rien changé). La seule
-- protection qui fonctionne vraiment : les fonctions réservées au serveur
-- (jamais à un appel direct depuis un jeton patient/kiné) vivent dans le
-- schéma `internal`, que PostgREST n'expose jamais (PGRST_DB_SCHEMA=public
-- uniquement) — donc injoignables depuis l'extérieur, point final. Seule
-- accept_patient_terms() reste dans `public` et reste appelable par
-- n'importe quel utilisateur connecté, car elle se vérifie elle-même
-- (n'accepte que l'identifiant du patient qui appelle).

-- ---------------------------------------------------------------------------
-- 1. Un patient valide ses propres CGU (ne peut toucher que sa date
--    d'acceptation, sur sa propre fiche — jamais sa condition, son kiné, etc.)
-- ---------------------------------------------------------------------------
create or replace function public.accept_patient_terms(p_patient_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_patient_id is distinct from public.current_app_user_id() then
    raise exception 'Un patient ne peut valider que ses propres CGU.';
  end if;
  perform set_config('app.admin_bypass', 'accept_patient_terms', true);
  update public.patients set terms_accepted_at = now() where id = p_patient_id;
end;
$$;
revoke all on function public.accept_patient_terms(uuid) from public;
grant execute on function public.accept_patient_terms(uuid) to public;

-- Schéma jamais exposé par PostgREST (PGRST_DB_SCHEMA=public uniquement) —
-- seule vraie barrière pour les fonctions 2 à 4 ci-dessous (voir note plus
-- haut : les révocations de droits ne servent à rien avec un seul rôle).
create schema if not exists internal;
revoke all on schema internal from public;

drop policy if exists patients_admin_bypass on public.patients;
create policy patients_admin_bypass on public.patients
  for update
  using (current_setting('app.admin_bypass', true) = 'accept_patient_terms')
  with check (current_setting('app.admin_bypass', true) = 'accept_patient_terms');

-- ---------------------------------------------------------------------------
-- 2. Changer le statut d'un kiné (approbation admin, ou auto-approbation
--    RPPS lors de l'inscription). Volontairement inaccessible via la propre
--    session du kiné : sinon n'importe quel kiné pourrait s'auto-approuver
--    en appelant Postgrest directement (voir le commentaire déjà présent
--    dans app/signup/onboarding/actions.ts). Vit dans `internal`, jamais
--    exposée par PostgREST — appelée uniquement via une connexion Postgres
--    directe (lib/db/pool.ts), jamais via l'adresse publique.
-- ---------------------------------------------------------------------------
create or replace function internal.admin_set_instructor_status(p_instructor_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform set_config('app.admin_bypass', 'set_instructor_status', true);
  update public.instructors set status = p_status where id = p_instructor_id;
end;
$$;
-- Pas de grant/revoke ici : le schéma `internal` lui-même n'est jamais
-- exposé par PostgREST, c'est la seule protection qui compte (voir note en
-- tête de fichier).

drop policy if exists instructors_admin_bypass on public.instructors;
create policy instructors_admin_bypass on public.instructors
  for update
  using (current_setting('app.admin_bypass', true) = 'set_instructor_status')
  with check (current_setting('app.admin_bypass', true) = 'set_instructor_status');

-- ---------------------------------------------------------------------------
-- 3. Enregistrer un abonnement Stripe. Déclenché par les webhooks Stripe —
--    aucune session utilisateur n'existe à ce moment-là. Vit dans
--    `internal`, appelée via une connexion Postgres directe.
-- ---------------------------------------------------------------------------
create or replace function internal.admin_upsert_subscription(
  p_user_id uuid,
  p_plan text,
  p_stripe_customer_id text,
  p_stripe_subscription_id text,
  p_status text,
  p_current_period_end timestamptz
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform set_config('app.admin_bypass', 'upsert_subscription', true);
  insert into public.subscriptions (
    user_id, plan, stripe_customer_id, stripe_subscription_id, status, current_period_end, updated_at
  ) values (
    p_user_id, p_plan, p_stripe_customer_id, p_stripe_subscription_id, p_status, p_current_period_end, now()
  )
  on conflict (user_id) do update set
    plan = excluded.plan,
    stripe_customer_id = excluded.stripe_customer_id,
    stripe_subscription_id = excluded.stripe_subscription_id,
    status = excluded.status,
    current_period_end = excluded.current_period_end,
    updated_at = now();
end;
$$;
-- Pas de grant/revoke ici non plus — même raison (fonction dans `internal`).

drop policy if exists subscriptions_admin_bypass on public.subscriptions;
create policy subscriptions_admin_bypass on public.subscriptions
  for all
  using (current_setting('app.admin_bypass', true) = 'upsert_subscription')
  with check (current_setting('app.admin_bypass', true) = 'upsert_subscription');

-- ---------------------------------------------------------------------------
-- 4. Enregistrer le compte Stripe Connect d'un kiné. Délibérément dans sa
--    propre table, à l'écart de la session du kiné (voir CLAUDE.md §3) :
--    sinon un kiné pourrait rediriger les paiements de ses patients vers un
--    compte Stripe non vérifié en écrivant directement via sa propre
--    session. N'est censée être appelée qu'après une vérification Stripe
--    côté serveur (OAuth/webhook), jamais sur une simple demande client. Vit
--    dans `internal`, appelée via une connexion Postgres directe.
-- ---------------------------------------------------------------------------
create or replace function internal.admin_upsert_connect_account(
  p_instructor_id uuid,
  p_stripe_connect_account_id text,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform set_config('app.admin_bypass', 'upsert_connect_account', true);
  insert into public.instructor_connect_accounts (instructor_id, stripe_connect_account_id, status, updated_at)
  values (p_instructor_id, p_stripe_connect_account_id, p_status, now())
  on conflict (instructor_id) do update set
    stripe_connect_account_id = excluded.stripe_connect_account_id,
    status = excluded.status,
    updated_at = now();
end;
$$;
-- Pas de grant/revoke ici non plus — même raison (fonction dans `internal`).

drop policy if exists connect_accounts_admin_bypass on public.instructor_connect_accounts;
create policy connect_accounts_admin_bypass on public.instructor_connect_accounts
  for all
  using (current_setting('app.admin_bypass', true) = 'upsert_connect_account')
  with check (current_setting('app.admin_bypass', true) = 'upsert_connect_account');

-- ---------------------------------------------------------------------------
-- 5. Vraie règle manquante (pas un contournement) : un patient peut lire le
--    compte Stripe Connect de SON PROPRE kiné, pour savoir où le payer.
--    Même schéma que la politique instructors_select_own_patient déjà
--    présente (migration 0031).
-- ---------------------------------------------------------------------------
drop policy if exists connect_accounts_patient_read on public.instructor_connect_accounts;
create policy connect_accounts_patient_read on public.instructor_connect_accounts
  for select
  using (
    exists (
      select 1 from public.patients p
      where p.instructor_id = instructor_connect_accounts.instructor_id
        and p.id = public.current_app_user_id()
    )
  );
