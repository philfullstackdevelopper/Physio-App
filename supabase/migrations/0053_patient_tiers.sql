-- Physio-App — Migration 0053 : offres patient à trois paliers
-- Run once in Supabase (SQL Editor -> New query -> paste -> Run). Safe to re-run.
--
-- Complète le spec docs/superpowers/specs/2026-09-08-patient-program-tiers-design.md
-- et le plan docs/superpowers/plans/2026-09-10-patient-tiers-trial-and-cancel.md.
-- Le spec annonçait « aucune migration » : c'était faux sur trois points.
--
--   1. subscriptions.plan — la contrainte (0009, élargie en 0020) refusait les
--      clés des trois offres : le webhook/retour Stripe aurait échoué en
--      silence à la première souscription.
--   2. instructors.tier_*_cents — décision Philippe 2026-09-10 : les trois prix
--      du spec sont la base par défaut, que chaque kiné peut modifier. Nullable :
--      null = prix par défaut (lib/billing/plans.ts TIERS). Modifiable par le
--      kiné sur sa propre ligne via instructors_update_own (0001) — voulu.
--   3. patients.trial_ends_at — le défaut de 60 jours (0009) aurait fait sauter
--      la page d'offres à tout nouveau patient (le « grandfathering » du spec
--      §7 compte un essai en cours comme un accès actif). L'essai est désormais
--      celui de Stripe (7 jours, sur l'offre choisie). Les lignes existantes
--      gardent leur valeur : les patients historiques ne sont pas bloqués.
--
-- Additive : aucune donnée existante modifiée ni supprimée. Aucune nouvelle
-- table, aucune nouvelle politique RLS.

-- ---------------------------------------------------------------------------
-- 1. SUBSCRIPTIONS — autoriser les trois offres
-- ---------------------------------------------------------------------------
alter table public.subscriptions
  drop constraint if exists subscriptions_plan_check;
alter table public.subscriptions
  add constraint subscriptions_plan_check
  check (plan in ('patient_monthly', 'kine_pro', 'kine_platform_fee',
                  'essentiel', 'standard', 'premium'));

-- ---------------------------------------------------------------------------
-- 2. INSTRUCTORS — prix par offre, propres à chaque kiné (null = défaut)
-- ---------------------------------------------------------------------------
alter table public.instructors
  add column if not exists tier_essentiel_cents integer,
  add column if not exists tier_standard_cents  integer,
  add column if not exists tier_premium_cents   integer;

alter table public.instructors
  drop constraint if exists instructors_tier_prices_positive;
alter table public.instructors
  add constraint instructors_tier_prices_positive check (
    (tier_essentiel_cents is null or tier_essentiel_cents > 0) and
    (tier_standard_cents  is null or tier_standard_cents  > 0) and
    (tier_premium_cents   is null or tier_premium_cents   > 0)
  );

-- ---------------------------------------------------------------------------
-- 3. PATIENTS — plus d'essai « maison » pour les nouveaux inscrits
-- ---------------------------------------------------------------------------
alter table public.patients
  alter column trial_ends_at drop default;
