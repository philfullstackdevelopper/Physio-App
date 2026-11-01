-- 0077 — Tarif du kiné : libre, 0 € permis (Philippe, 2026-11-01).
--
-- En clair :
--  * Le kiné fixe librement le prix de son programme mensuel « hors
--    nomenclature » (comme sur Andrew) : 0 €, ou de 1 € à 500 € (le plafond
--    ne sert qu'à éviter une faute de frappe). EasyPhysio ne prend rien.
--  * À 0 €, ses patients entrent dans l'appli sans payer ; au-dessus, le
--    patient accepte le tarif et enregistre sa carte avant d'accéder à l'appli
--    (règle appliquée dans app/patient/layout.tsx). La carte n'est prélevée
--    que le mois où le kiné fait réellement le programme (inchangé).
--  * Un suivi accepté (patient_follow_ups) et un bilan facturé
--    (monthly_reviews) suivent la même fourchette, 1 € à 500 € : il n'y a
--    jamais de prélèvement à 0 €.
--
-- Seules des règles de contrôle de montants changent. Aucune règle d'accès
-- (RLS) n'est touchée.

alter table public.instructors
  drop constraint if exists instructors_review_price_range;
alter table public.instructors
  add constraint instructors_review_price_range
  check (review_price_cents is null or review_price_cents = 0 or review_price_cents between 100 and 50000);

-- Les anciennes règles « entre 10 et 40 € » de 0071 ont été écrites sans nom :
-- on les retrouve par leur colonne avant de les remplacer.
do $$
declare r record;
begin
  for r in
    select c.conrelid::regclass as tbl, c.conname
    from pg_constraint c
    where c.contype = 'c'
      and c.conrelid in ('public.patient_follow_ups'::regclass, 'public.monthly_reviews'::regclass)
      and pg_get_constraintdef(c.oid) ~ '(price_cents|amount_cents).*1000.*4000'
  loop
    execute format('alter table %s drop constraint %I', r.tbl, r.conname);
  end loop;
end $$;

alter table public.patient_follow_ups
  add constraint patient_follow_ups_price_range check (price_cents between 100 and 50000);
alter table public.monthly_reviews
  add constraint monthly_reviews_amount_range check (amount_cents between 100 and 50000);
