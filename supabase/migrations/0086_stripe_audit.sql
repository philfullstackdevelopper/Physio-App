-- =============================================================================
-- 0086 — Corrections Stripe après l'audit du 2026-11-08.
--
-- En clair, pour Philippe (CLAUDE.md §3 : chaque règle expliquée avant d'être
-- appliquée). AUCUNE règle de lecture (RLS) ne change : un patient voit
-- toujours seulement SON abonnement et SES notes d'honoraires, un kiné ceux de
-- SES patients, et personne n'écrit dans ces tables depuis le navigateur. Ce
-- fichier ne touche que les fonctions serveur (schéma `internal`, jamais
-- exposé par l'API) qui recopient ce que Stripe nous dit :
--
--  1. ABONNEMENT D'UN PATIENT : NE PLUS ÉCRASER LE BON PAR UN ANCIEN.
--     Un patient n'a qu'une ligne dans `subscriptions`. Quand il remplace un
--     abonnement refusé par un nouveau, Stripe peut nous prévenir EN RETARD
--     de la fin de l'ancien ; jusqu'ici, ce message tardif remplaçait le
--     nouvel abonnement par l'ancien (« terminé ») et lui coupait l'accès.
--     Désormais la fonction ignore un message qui parle d'un AUTRE abonnement
--     que celui enregistré quand l'enregistré est encore vivant (essai, actif,
--     paiement en retard) et que le message parle d'un abonnement terminé ou
--     plus ancien (on retient pour cela sa date de création chez Stripe,
--     nouvelle colonne stripe_subscription_created). Et un abonnement
--     enregistré comme terminé ne « revit » pas sur un message en retard.
--
--  2. HONORAIRES DU KINÉ (6 €) : NOUVEAUX ÉTATS DE PAIEMENT.
--     En plus de « en cours », « payé » et « refusé » :
--       - « validation demandée » (action_required) : la banque du patient
--         veut qu'il confirme lui-même le paiement (3-D Secure) ; le patient
--         voit un bouton pour payer ;
--       - « remboursé » (refunded) : le kiné a remboursé le patient ;
--       - « contesté » (disputed) : le patient a contesté le paiement auprès
--         de sa banque.
--     Une colonne garde la raison d'un refus (ex. « authentication_required »),
--     pour l'afficher et comprendre les échecs.
--     L'ordre des messages de Stripe est respecté : un paiement « payé » ne
--     redevient jamais « en cours » ou « refusé » sur un message en retard ;
--     il ne peut devenir que « remboursé » ou « contesté ». Un litige gagné
--     le remet à « payé ». Un « remboursé » ne bouge plus. Le numéro de note
--     d'honoraires ne change jamais.
--
--  3. KINÉ QUI DÉCONNECTE SON COMPTE STRIPE D'EASYPHYSIO.
--     Stripe nous prévient (account.application.deauthorized). La fiche de
--     paiement du kiné repasse alors à « pas encore activé » : plus aucun
--     prélèvement n'est tenté, et sa page « Suivi & facturation » lui propose
--     de reconnecter un compte. Seul le serveur l'écrit, avec le « passe »
--     déjà utilisé pour cette table (upsert_connect_account, migration 0057).
--
-- Les anciennes versions des fonctions restent appelables (elles appellent
-- les nouvelles) : on peut appliquer ce fichier AVANT de déployer le code.
-- Rejouable sans risque. Sur Scalingo : node scripts/migrate.mjs --only
-- 0086_stripe_audit.sql (le journal schema_migrations est incomplet).
-- =============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1. Abonnements : ordre des messages de Stripe
-- ---------------------------------------------------------------------------

alter table public.subscriptions add column if not exists stripe_subscription_created timestamptz;

drop function if exists internal.admin_upsert_subscription(uuid, text, text, text, text, timestamptz, text, boolean, timestamptz);

-- Renvoie true si la ligne a été écrite, false si le message a été ignoré.
create or replace function internal.admin_upsert_subscription(
  p_user_id uuid,
  p_plan text,
  p_stripe_customer_id text,
  p_stripe_subscription_id text,
  p_status text,
  p_current_period_end timestamptz,
  p_stripe_account_id text,
  p_cancel_at_period_end boolean,
  p_stripe_created timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_alive constant text[] := array['trialing', 'active', 'past_due', 'unpaid'];
  v_ended constant text[] := array['canceled', 'incomplete_expired'];
  v_cur record;
begin
  perform set_config('app.admin_bypass', 'upsert_subscription', true);

  -- Verrou sur la ligne du patient : deux messages Stripe simultanés passent
  -- l'un après l'autre.
  select s.stripe_subscription_id, s.status, s.stripe_subscription_created
    into v_cur
    from public.subscriptions s
    where s.user_id = p_user_id
    for update;

  if found then
    if v_cur.stripe_subscription_id is distinct from p_stripe_subscription_id then
      -- Un AUTRE abonnement que celui enregistré, encore vivant : on ne le
      -- remplace que par un abonnement vivant ET plus récent.
      if v_cur.status = any (v_alive) and (
           not (p_status = any (v_alive))
           or (v_cur.stripe_subscription_created is not null and p_stripe_created is not null
               and p_stripe_created < v_cur.stripe_subscription_created)
         ) then
        perform set_config('app.admin_bypass', '', true);
        return false;
      end if;
    elsif v_cur.status = any (v_ended) and not (p_status = any (v_ended)) then
      -- Le même abonnement, déjà terminé : un message en retard ne le fait pas revivre.
      perform set_config('app.admin_bypass', '', true);
      return false;
    end if;
  end if;

  insert into public.subscriptions (
    user_id, plan, stripe_customer_id, stripe_subscription_id, status, current_period_end,
    stripe_account_id, cancel_at_period_end, stripe_subscription_created, updated_at
  ) values (
    p_user_id, p_plan, p_stripe_customer_id, p_stripe_subscription_id, p_status, p_current_period_end,
    p_stripe_account_id, coalesce(p_cancel_at_period_end, false), p_stripe_created, now()
  )
  on conflict (user_id) do update set
    plan = excluded.plan,
    stripe_customer_id = excluded.stripe_customer_id,
    stripe_subscription_id = excluded.stripe_subscription_id,
    status = excluded.status,
    current_period_end = excluded.current_period_end,
    stripe_account_id = excluded.stripe_account_id,
    cancel_at_period_end = excluded.cancel_at_period_end,
    stripe_subscription_created = coalesce(excluded.stripe_subscription_created, public.subscriptions.stripe_subscription_created),
    updated_at = now();
  perform set_config('app.admin_bypass', '', true);
  return true;
end;
$$;

-- Ancienne signature (code d'avant ce fichier) : même règle, sans date de création.
create or replace function internal.admin_upsert_subscription(
  p_user_id uuid,
  p_plan text,
  p_stripe_customer_id text,
  p_stripe_subscription_id text,
  p_status text,
  p_current_period_end timestamptz,
  p_stripe_account_id text,
  p_cancel_at_period_end boolean
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform internal.admin_upsert_subscription(
    p_user_id, p_plan, p_stripe_customer_id, p_stripe_subscription_id, p_status,
    p_current_period_end, p_stripe_account_id, p_cancel_at_period_end, null::timestamptz
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Honoraires du kiné : nouveaux états, raison du refus, ordre des messages
-- ---------------------------------------------------------------------------

alter table public.monthly_reviews add column if not exists payment_failure_reason text;

alter table public.monthly_reviews drop constraint if exists monthly_reviews_payment_status_check;
alter table public.monthly_reviews add constraint monthly_reviews_payment_status_check
  check (payment_status in ('pending', 'paid', 'failed', 'action_required', 'refunded', 'disputed'));

create or replace function internal.set_review_payment(
  p_review_id uuid,
  p_payment_status text,
  p_stripe_payment_intent_id text,
  p_failure_reason text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_cur record;
  v_ok boolean;
begin
  perform set_config('app.admin_bypass', 'review_write', true);
  select r.payment_status, r.stripe_payment_intent_id into v_cur
    from public.monthly_reviews r where r.id = p_review_id for update;
  if not found then
    perform set_config('app.admin_bypass', '', true);
    return;
  end if;

  v_ok := case
    -- Remboursé : définitif.
    when v_cur.payment_status = 'refunded' then false
    -- Payé : ne peut devenir que remboursé ou contesté.
    when v_cur.payment_status = 'paid' then p_payment_status in ('paid', 'refunded', 'disputed')
    -- Contesté : litige gagné (payé), perdu ou remboursé.
    when v_cur.payment_status = 'disputed' then p_payment_status in ('paid', 'refunded', 'disputed')
    -- Remboursé / contesté n'arrivent que sur un paiement encaissé.
    when p_payment_status in ('refunded', 'disputed') then false
    -- En cours avec un AUTRE paiement : un échec en retard de l'ancien paiement ne l'écrase pas.
    when v_cur.payment_status = 'pending'
         and p_payment_status in ('failed', 'action_required')
         and v_cur.stripe_payment_intent_id is not null
         and p_stripe_payment_intent_id is not null
         and v_cur.stripe_payment_intent_id <> p_stripe_payment_intent_id then false
    else true
  end;

  if v_ok then
    update public.monthly_reviews set
      payment_status = p_payment_status,
      stripe_payment_intent_id = coalesce(p_stripe_payment_intent_id, stripe_payment_intent_id),
      paid_at = case when p_payment_status = 'paid' then coalesce(paid_at, now()) else paid_at end,
      payment_failure_reason = case
        when p_payment_status in ('failed', 'action_required') then coalesce(p_failure_reason, payment_failure_reason)
        when p_payment_status in ('paid', 'pending') then null
        else payment_failure_reason end,
      updated_at = now()
    where id = p_review_id;
  end if;
  perform set_config('app.admin_bypass', '', true);
end;
$$;

-- Ancienne signature (code d'avant ce fichier) : même règle, sans raison.
create or replace function internal.set_review_payment(
  p_review_id uuid,
  p_payment_status text,
  p_stripe_payment_intent_id text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform internal.set_review_payment(p_review_id, p_payment_status, p_stripe_payment_intent_id, null::text);
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Kiné qui déconnecte son compte Stripe
-- ---------------------------------------------------------------------------

-- Renvoie l'id du kiné concerné (null si ce compte n'est rattaché à personne).
create or replace function internal.connect_account_deauthorized(p_stripe_connect_account_id text)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_instructor uuid;
begin
  perform set_config('app.admin_bypass', 'upsert_connect_account', true);
  update public.instructor_connect_accounts
     set status = 'not_started', updated_at = now()
   where stripe_connect_account_id = p_stripe_connect_account_id;
  select c.instructor_id into v_instructor
    from public.instructor_connect_accounts c
   where c.stripe_connect_account_id = p_stripe_connect_account_id
   limit 1;
  perform set_config('app.admin_bypass', '', true);
  return v_instructor;
end;
$$;

commit;
