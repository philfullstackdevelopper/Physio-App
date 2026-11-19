-- =============================================================================
-- 0102 — Tarif libre du kiné : lire le montant accepté par le patient
-- (2026-11-19, lib/billing/patientPlans.ts → chargeableKineCents)
--
-- EN CLAIR : le kiné fixe désormais son propre tarif (0 à 500, colonne
-- instructors.review_price_cents qui existe déjà depuis 0071/0077). Chaque
-- patient accepte un montant par écrit avant de payer (table
-- internal.billing_acceptances, migration 0089). Cette fonction renvoie le
-- montant de son DERNIER accord, s'il nomme bien ce kiné ; sinon rien.
-- Le serveur prélève ensuite le moins élevé entre ce montant et le tarif
-- actuel du kiné : une hausse n'est jamais prélevée sans nouvel accord.
--
-- RÈGLES D'ACCÈS (RLS) : AUCUNE règle ajoutée, retirée ou élargie. Fonction
-- de lecture du schéma internal (jamais exposé par PostgREST), appelée
-- uniquement par le serveur, même laissez-passer que kine_fees_acceptance.
--
-- Rejouable sans risque. Pas de begin/commit (scripts/migrate.mjs ouvre déjà la
-- transaction).
-- =============================================================================

create or replace function internal.kine_fees_accepted_cents(p_patient_id uuid, p_instructor_id uuid)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_instructor uuid;
  v_cents integer;
begin
  perform set_config('app.admin_bypass', 'billing_acceptance', true);
  select a.instructor_id, a.kine_cents into v_instructor, v_cents
    from internal.billing_acceptances a
    where a.patient_id = p_patient_id
    order by a.accepted_at desc
    limit 1;
  perform set_config('app.admin_bypass', '', true);
  if v_instructor is distinct from p_instructor_id then
    return null;
  end if;
  return v_cents;
end;
$$;
