-- =============================================================================
-- 0080 — Formules patient 1, 3 et 6 mois (Philippe, 2026-11-02).
--
-- En clair, pour Philippe (CLAUDE.md §3 : chaque changement expliqué avant
-- d'être appliqué) :
--
-- Nouveau modèle : le kiné utilise l'appli gratuitement ; le patient choisit
-- une formule (1 mois 9,99 €, 3 mois 19,99 €, 6 mois 29,99 €), renouvelée
-- automatiquement, résiliable à tout moment. Le paiement va sur le compte
-- Stripe du kiné, et Stripe prélève au passage la part d'EasyPhysio.
--
-- On réutilise la table `subscriptions` (une ligne par patient, déjà
-- protégée) au lieu d'en créer une nouvelle. Ce fichier :
--
--  1. Autorise les trois nouveaux noms de formule : plan_1m, plan_3m,
--     plan_6m (les anciens noms restent permis, pour l'historique).
--
--  2. Ajoute deux colonnes :
--     - stripe_account_id : le compte Stripe du kiné sur lequel vit
--       l'abonnement (pour pouvoir le résilier ou le relire) ;
--     - cancel_at_period_end : le patient a résilié, l'accès continue
--       jusqu'à la fin de la période payée.
--
--  3. Remplace la fonction serveur qui enregistre un abonnement
--     (internal.admin_upsert_subscription) par la même avec ces deux
--     informations en plus. Elle reste dans le schéma `internal`, jamais
--     exposé : seul le serveur (webhook Stripe, retour de paiement) l'appelle.
--
-- AUCUNE règle d'accès (RLS) ne change : un patient ne voit toujours que SON
-- abonnement, un kiné que ceux de SES patients, et personne ne peut écrire
-- dans la table depuis le navigateur.
--
-- Rejouable sans risque.
-- =============================================================================

alter table public.subscriptions drop constraint if exists subscriptions_plan_check;
alter table public.subscriptions add constraint subscriptions_plan_check check (
  plan = any (array[
    'plan_1m', 'plan_3m', 'plan_6m',
    -- anciens noms, conservés pour l'historique :
    'patient_monthly', 'kine_pro', 'kine_platform_fee', 'essentiel', 'standard', 'premium'
  ])
);

alter table public.subscriptions add column if not exists stripe_account_id text;
alter table public.subscriptions add column if not exists cancel_at_period_end boolean not null default false;

drop function if exists internal.admin_upsert_subscription(uuid, text, text, text, text, timestamptz);
drop function if exists internal.admin_upsert_subscription(uuid, text, text, text, text, timestamptz, text, boolean);

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
  perform set_config('app.admin_bypass', 'upsert_subscription', true);
  insert into public.subscriptions (
    user_id, plan, stripe_customer_id, stripe_subscription_id, status, current_period_end,
    stripe_account_id, cancel_at_period_end, updated_at
  ) values (
    p_user_id, p_plan, p_stripe_customer_id, p_stripe_subscription_id, p_status, p_current_period_end,
    p_stripe_account_id, coalesce(p_cancel_at_period_end, false), now()
  )
  on conflict (user_id) do update set
    plan = excluded.plan,
    stripe_customer_id = excluded.stripe_customer_id,
    stripe_subscription_id = excluded.stripe_subscription_id,
    status = excluded.status,
    current_period_end = excluded.current_period_end,
    stripe_account_id = excluded.stripe_account_id,
    cancel_at_period_end = excluded.cancel_at_period_end,
    updated_at = now();
end;
$$;
