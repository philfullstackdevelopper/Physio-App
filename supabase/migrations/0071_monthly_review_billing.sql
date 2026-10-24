-- Physio-App — Migration 0071 : nouveau modèle de facturation (2026-10-24)
-- À appliquer sur Scalingo À LA MAIN après accord de Philippe, puis à inscrire
-- dans schema_migrations (journal incomplet). Rejouable sans risque.
--
-- Le modèle (CLAUDE.md §4, docs/messages-validation-juridique.md) :
--   1. Le patient paie SON kiné, sur le compte Stripe du kiné, un « bilan de
--      suivi » par mois — seulement le mois où le kiné valide le bilan.
--      EasyPhysio n'en prend rien (pas de commission : art. R.4321-72 CSP).
--   2. Le kiné paie EasyPhysio un forfait fixe par patient actif et par mois,
--      sur une facture mensuelle (table platform_invoices, déjà là depuis 0020).
--
-- Ce que fait ce fichier, en clair :
--   A. instructors.review_price_cents : le tarif du bilan, fixé par le kiné
--      lui-même (entre 10 et 40 €). Il le modifie sur sa propre fiche, comme
--      son nom de cabinet — règle existante instructors_update_own.
--   B. patient_follow_ups : une ligne par patient qui a accepté le suivi
--      mensuel (tarif accepté, carte enregistrée chez Stripe, actif/arrêté).
--      LECTURE : le patient lit la sienne ; le kiné lit celles de SES patients.
--      ÉCRITURE : personne via l'API — seulement le serveur, après vérification
--      chez Stripe (fonctions internal.* ci-dessous). Sinon un patient pourrait
--      se déclarer « carte enregistrée » ou changer le tarif accepté.
--   C. monthly_reviews : un bilan validé par mois et par patient, avec son
--      retour écrit, son montant, l'état du paiement et le numéro de la note
--      d'honoraires. LECTURE : le patient lit les siens ; le kiné lit ceux de
--      SES patients. ÉCRITURE : seulement le serveur (le numéro de note doit
--      se suivre sans trou, et le montant ne doit pas être modifiable).
--   D. instructor_platform_billing : le moyen de paiement du kiné pour la
--      facture EasyPhysio (client Stripe sur le compte plateforme). Lecture :
--      le kiné lit la sienne. Écriture : serveur seulement.
--   E. platform_invoices (0020) : le serveur peut maintenant l'écrire.
--   F. Lecture administrateur (laissez-passer « admin_read », comme 0062) des
--      séances, ressentis et bilans de tous les kinés, pour calculer les
--      patients actifs du mois au moment de facturer. Fonction réservée au
--      serveur, jamais exposée par PostgREST (schéma internal).

begin;

-- ---------------------------------------------------------------------------
-- A. Tarif du bilan de suivi, fixé par le kiné
-- ---------------------------------------------------------------------------
alter table public.instructors
  add column if not exists review_price_cents integer;
alter table public.instructors
  drop constraint if exists instructors_review_price_range;
alter table public.instructors
  add constraint instructors_review_price_range
  check (review_price_cents is null or review_price_cents between 1000 and 4000);

-- ---------------------------------------------------------------------------
-- B. Suivi mensuel accepté par le patient
-- ---------------------------------------------------------------------------
create table if not exists public.patient_follow_ups (
  patient_id               uuid primary key references public.patients (id) on delete cascade,
  instructor_id            uuid not null references public.instructors (id) on delete cascade,
  price_cents              integer not null check (price_cents between 1000 and 4000),
  status                   text not null default 'pending_card'
    check (status in ('pending_card', 'active', 'stopped')),
  consented_at             timestamptz,
  stripe_customer_id       text,
  stripe_payment_method_id text,
  card_label               text,
  stopped_at               timestamptz,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);
create index if not exists idx_follow_ups_instructor on public.patient_follow_ups (instructor_id);

alter table public.patient_follow_ups enable row level security;
alter table public.patient_follow_ups force row level security;

drop policy if exists follow_ups_patient_read on public.patient_follow_ups;
create policy follow_ups_patient_read on public.patient_follow_ups
  for select to public
  using (patient_id = public.current_app_user_id());

drop policy if exists follow_ups_instructor_read on public.patient_follow_ups;
create policy follow_ups_instructor_read on public.patient_follow_ups
  for select to public
  using (instructor_id = public.current_app_user_id());

drop policy if exists follow_ups_admin_bypass on public.patient_follow_ups;
create policy follow_ups_admin_bypass on public.patient_follow_ups
  for all to public
  using (current_setting('app.admin_bypass', true) in ('follow_up_write', 'admin_read'))
  with check (current_setting('app.admin_bypass', true) = 'follow_up_write');

-- ---------------------------------------------------------------------------
-- C. Bilans mensuels validés
-- ---------------------------------------------------------------------------
create table if not exists public.monthly_reviews (
  id                       uuid primary key default gen_random_uuid(),
  patient_id               uuid not null references public.patients (id) on delete cascade,
  instructor_id            uuid not null references public.instructors (id) on delete cascade,
  period                   date not null check (extract(day from period) = 1),
  feedback                 text not null check (length(trim(feedback)) > 0),
  validated_at             timestamptz not null default now(),
  amount_cents             integer not null check (amount_cents between 1000 and 4000),
  payment_status           text not null default 'pending'
    check (payment_status in ('pending', 'paid', 'failed')),
  stripe_payment_intent_id text,
  paid_at                  timestamptz,
  fee_note_year            integer not null,
  fee_note_seq             integer not null,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  unique (patient_id, period),
  unique (instructor_id, fee_note_year, fee_note_seq)
);
create index if not exists idx_monthly_reviews_instructor_period on public.monthly_reviews (instructor_id, period);

alter table public.monthly_reviews enable row level security;
alter table public.monthly_reviews force row level security;

drop policy if exists monthly_reviews_patient_read on public.monthly_reviews;
create policy monthly_reviews_patient_read on public.monthly_reviews
  for select to public
  using (patient_id = public.current_app_user_id());

drop policy if exists monthly_reviews_instructor_read on public.monthly_reviews;
create policy monthly_reviews_instructor_read on public.monthly_reviews
  for select to public
  using (instructor_id = public.current_app_user_id());

drop policy if exists monthly_reviews_admin_bypass on public.monthly_reviews;
create policy monthly_reviews_admin_bypass on public.monthly_reviews
  for all to public
  using (current_setting('app.admin_bypass', true) in ('review_write', 'admin_read'))
  with check (current_setting('app.admin_bypass', true) = 'review_write');

-- ---------------------------------------------------------------------------
-- D. Moyen de paiement du kiné pour la facture EasyPhysio
-- ---------------------------------------------------------------------------
create table if not exists public.instructor_platform_billing (
  instructor_id            uuid primary key references public.instructors (id) on delete cascade,
  stripe_customer_id       text not null,
  stripe_payment_method_id text,
  payment_method_label     text,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

alter table public.instructor_platform_billing enable row level security;
alter table public.instructor_platform_billing force row level security;

drop policy if exists platform_billing_self_read on public.instructor_platform_billing;
create policy platform_billing_self_read on public.instructor_platform_billing
  for select to public
  using (instructor_id = public.current_app_user_id());

drop policy if exists platform_billing_admin_bypass on public.instructor_platform_billing;
create policy platform_billing_admin_bypass on public.instructor_platform_billing
  for all to public
  using (current_setting('app.admin_bypass', true) in ('platform_billing_write', 'admin_read'))
  with check (current_setting('app.admin_bypass', true) = 'platform_billing_write');

-- ---------------------------------------------------------------------------
-- E. Factures EasyPhysio : écriture serveur
-- ---------------------------------------------------------------------------
drop policy if exists platform_invoices_admin_bypass on public.platform_invoices;
create policy platform_invoices_admin_bypass on public.platform_invoices
  for all to public
  using (current_setting('app.admin_bypass', true) in ('platform_invoice_write', 'admin_read'))
  with check (current_setting('app.admin_bypass', true) = 'platform_invoice_write');

-- ---------------------------------------------------------------------------
-- F. Lecture administrateur des signaux d'activité (calcul des patients actifs)
-- ---------------------------------------------------------------------------
drop policy if exists workout_logs_admin_read on public.workout_logs;
create policy workout_logs_admin_read on public.workout_logs
  for select to public
  using (current_setting('app.admin_bypass', true) = 'admin_read');

drop policy if exists patient_feedback_admin_read on public.patient_feedback;
create policy patient_feedback_admin_read on public.patient_feedback
  for select to public
  using (current_setting('app.admin_bypass', true) = 'admin_read');

-- ---------------------------------------------------------------------------
-- Fonctions serveur (schéma internal, jamais exposé par PostgREST)
-- ---------------------------------------------------------------------------

-- Le patient a accepté le tarif et enregistré sa carte (vérifié chez Stripe
-- par l'appelant) — ou a arrêté son suivi.
create or replace function internal.upsert_follow_up(
  p_patient_id uuid,
  p_instructor_id uuid,
  p_price_cents integer,
  p_status text,
  p_stripe_customer_id text,
  p_stripe_payment_method_id text,
  p_card_label text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform set_config('app.admin_bypass', 'follow_up_write', true);
  insert into public.patient_follow_ups (
    patient_id, instructor_id, price_cents, status, consented_at,
    stripe_customer_id, stripe_payment_method_id, card_label, stopped_at, updated_at
  ) values (
    p_patient_id, p_instructor_id, p_price_cents, p_status,
    case when p_status = 'active' then now() end,
    p_stripe_customer_id, p_stripe_payment_method_id, p_card_label,
    case when p_status = 'stopped' then now() end, now()
  )
  on conflict (patient_id) do update set
    instructor_id = excluded.instructor_id,
    price_cents = excluded.price_cents,
    status = excluded.status,
    consented_at = case when excluded.status = 'active' then coalesce(public.patient_follow_ups.consented_at, now())
                        else public.patient_follow_ups.consented_at end,
    stripe_customer_id = coalesce(excluded.stripe_customer_id, public.patient_follow_ups.stripe_customer_id),
    stripe_payment_method_id = coalesce(excluded.stripe_payment_method_id, public.patient_follow_ups.stripe_payment_method_id),
    card_label = coalesce(excluded.card_label, public.patient_follow_ups.card_label),
    stopped_at = case when excluded.status = 'stopped' then now() else null end,
    updated_at = now();
  perform set_config('app.admin_bypass', '', true);
end;
$$;

-- Le kiné valide le bilan du mois : enregistre le bilan et lui donne le
-- numéro de note d'honoraires suivant (par kiné et par année, sans trou).
-- Refuse un deuxième bilan pour le même patient et le même mois.
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
  v_id uuid;
begin
  perform set_config('app.admin_bypass', 'review_write', true);
  -- Un seul numéro à la fois par kiné : verrou le temps de la transaction.
  perform pg_advisory_xact_lock(hashtext('fee_note:' || p_instructor_id::text));
  select coalesce(max(r.fee_note_seq), 0) + 1 into v_seq
    from public.monthly_reviews r
    where r.instructor_id = p_instructor_id and r.fee_note_year = v_year;
  insert into public.monthly_reviews (
    patient_id, instructor_id, period, feedback, amount_cents, fee_note_year, fee_note_seq
  ) values (
    p_patient_id, p_instructor_id, p_period, p_feedback, p_amount_cents, v_year, v_seq
  )
  returning id into v_id;
  perform set_config('app.admin_bypass', '', true);
  return query select v_id, v_year, v_seq;
end;
$$;

-- Résultat du prélèvement d'un bilan (après création du paiement, ou depuis
-- le webhook Stripe).
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
  perform set_config('app.admin_bypass', 'review_write', true);
  update public.monthly_reviews set
    payment_status = p_payment_status,
    stripe_payment_intent_id = coalesce(p_stripe_payment_intent_id, stripe_payment_intent_id),
    paid_at = case when p_payment_status = 'paid' then coalesce(paid_at, now()) else paid_at end,
    updated_at = now()
  where id = p_review_id;
  perform set_config('app.admin_bypass', '', true);
end;
$$;

-- Moyen de paiement du kiné pour la facture EasyPhysio.
create or replace function internal.upsert_platform_billing(
  p_instructor_id uuid,
  p_stripe_customer_id text,
  p_stripe_payment_method_id text,
  p_payment_method_label text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform set_config('app.admin_bypass', 'platform_billing_write', true);
  insert into public.instructor_platform_billing (
    instructor_id, stripe_customer_id, stripe_payment_method_id, payment_method_label, updated_at
  ) values (p_instructor_id, p_stripe_customer_id, p_stripe_payment_method_id, p_payment_method_label, now())
  on conflict (instructor_id) do update set
    stripe_customer_id = excluded.stripe_customer_id,
    stripe_payment_method_id = coalesce(excluded.stripe_payment_method_id, public.instructor_platform_billing.stripe_payment_method_id),
    payment_method_label = coalesce(excluded.payment_method_label, public.instructor_platform_billing.payment_method_label),
    updated_at = now();
  perform set_config('app.admin_bypass', '', true);
end;
$$;

-- Facture EasyPhysio d'un mois pour un kiné (une seule par mois : unique
-- (instructor_id, period_start) depuis 0020).
create or replace function internal.upsert_platform_invoice(
  p_instructor_id uuid,
  p_period_start date,
  p_period_end date,
  p_patient_count integer,
  p_amount_cents integer,
  p_stripe_invoice_id text,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform set_config('app.admin_bypass', 'platform_invoice_write', true);
  insert into public.platform_invoices (
    instructor_id, period_start, period_end, patient_count, amount_cents, stripe_invoice_id, status, updated_at
  ) values (p_instructor_id, p_period_start, p_period_end, p_patient_count, p_amount_cents, p_stripe_invoice_id, p_status, now())
  on conflict (instructor_id, period_start) do update set
    patient_count = excluded.patient_count,
    amount_cents = excluded.amount_cents,
    stripe_invoice_id = coalesce(excluded.stripe_invoice_id, public.platform_invoices.stripe_invoice_id),
    status = excluded.status,
    updated_at = now();
  perform set_config('app.admin_bypass', '', true);
end;
$$;

-- Lecture serveur (webhook) : un bilan et le compte Stripe de son kiné.
create or replace function internal.review_for_payment(p_review_id uuid)
returns table(review_id uuid, payment_status text, connect_account_id text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform set_config('app.admin_bypass', 'admin_read', true);
  return query
    select r.id, r.payment_status,
           (select c.stripe_connect_account_id from public.instructor_connect_accounts c where c.instructor_id = r.instructor_id)
    from public.monthly_reviews r where r.id = p_review_id;
  perform set_config('app.admin_bypass', '', true);
end;
$$;

-- Lecture serveur : le suivi d'un patient (création du paiement d'un bilan,
-- arrêt du suivi). Le kiné peut lire ce suivi via l'API, mais le prélèvement
-- est fait côté serveur, qui revérifie tout ici.
create or replace function internal.follow_up_for_charge(p_patient_id uuid)
returns table(
  instructor_id uuid, price_cents integer, status text,
  stripe_customer_id text, stripe_payment_method_id text, connect_account_id text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform set_config('app.admin_bypass', 'admin_read', true);
  return query
    select f.instructor_id, f.price_cents, f.status, f.stripe_customer_id, f.stripe_payment_method_id,
           (select c.stripe_connect_account_id from public.instructor_connect_accounts c where c.instructor_id = f.instructor_id)
    from public.patient_follow_ups f where f.patient_id = p_patient_id;
  perform set_config('app.admin_bypass', '', true);
end;
$$;

-- Patients actifs d'un mois, pour TOUS les kinés (facturation mensuelle).
-- Actif = invitation acceptée et, dans le mois : au moins une séance faite,
-- un ressenti noté, ou un bilan validé. Même règle que lib/billing/activePatients.ts.
create or replace function internal.admin_month_active_patients(p_period_start date, p_period_end date)
returns table(instructor_id uuid, active_count integer)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform set_config('app.admin_bypass', 'admin_read', true);
  return query
    select p.instructor_id, count(*)::integer
    from public.patients p
    where p.terms_accepted_at is not null
      and (
        exists (select 1 from public.workout_logs w
                where w.patient_id = p.id and w.completed_at >= p_period_start and w.completed_at < p_period_end)
        or exists (select 1 from public.patient_feedback f
                   where f.patient_id = p.id and f.created_at >= p_period_start and f.created_at < p_period_end)
        or exists (select 1 from public.monthly_reviews r
                   where r.patient_id = p.id and r.period = p_period_start)
      )
    group by p.instructor_id;
  perform set_config('app.admin_bypass', '', true);
end;
$$;

-- Moyen de paiement EasyPhysio de chaque kiné (facturation mensuelle).
create or replace function internal.admin_platform_billing_list()
returns table(instructor_id uuid, stripe_customer_id text, stripe_payment_method_id text, approved_at timestamptz)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform set_config('app.admin_bypass', 'admin_read', true);
  return query
    select b.instructor_id, b.stripe_customer_id, b.stripe_payment_method_id, i.created_at
    from public.instructor_platform_billing b
    join public.instructors i on i.id = b.instructor_id;
  perform set_config('app.admin_bypass', '', true);
end;
$$;

-- Factures déjà émises (pour ne jamais facturer deux fois un même mois, et
-- pour savoir si le kiné a déjà eu son mois offert).
create or replace function internal.admin_platform_invoices_list()
returns table(instructor_id uuid, period_start date, status text, amount_cents integer)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform set_config('app.admin_bypass', 'admin_read', true);
  return query select i.instructor_id, i.period_start, i.status, i.amount_cents from public.platform_invoices i;
  perform set_config('app.admin_bypass', '', true);
end;
$$;

commit;
