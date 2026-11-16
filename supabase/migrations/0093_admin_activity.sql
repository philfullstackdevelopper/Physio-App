-- =============================================================================
-- 0093 — Vue « Activité » de /admin (Philippe, 2026-11-16).
--
-- En clair, pour Philippe (CLAUDE.md §3) :
--
--  Deux fonctions de LECTURE, appelées seulement par le serveur quand
--  l'admin ouvre /admin (lib/db/activity.ts). Elles donnent, pour chaque
--  kiné et chaque patient : quand il est arrivé, jusqu'où il est allé
--  (CGU, carte, programme, première séance), quand il a fait sa dernière
--  séance, et s'il peut recevoir une notification sur son téléphone.
--
--  - AUCUNE règle d'accès (policy) n'est ajoutée ni élargie. Les fonctions
--    utilisent les « laissez-passer » qui existent déjà : « admin_read »
--    (kinés, patients, séances faites, abonnements, programmes, mois
--    facturés — migrations 0062, 0071, 0083), « push » (téléphones
--    enregistrés, 0083) et « test_accounts » (pour écarter les comptes de
--    test, 0064). Le laissez-passer est remis à zéro à la fin.
--  - Rien n'est lu dans les messages, le questionnaire de santé, les
--    douleurs ou les commentaires : seulement des dates et des compteurs.
--  - Elles vivent dans le schéma « internal », que l'API publique
--    (PostgREST) n'expose jamais : un navigateur ne peut pas les appeler.
--
--  Rejouable sans risque. Sur Scalingo, appliquer CE fichier seul :
--    node scripts/migrate.mjs --only 0093_admin_activity.sql
-- =============================================================================

create or replace function internal.admin_activity_patients()
returns table(
  patient_id uuid,
  instructor_id uuid,
  email text,
  created_at timestamptz,
  joined_via_link boolean,
  terms_accepted_at timestamptz,
  subscription_status text,
  has_programme boolean,
  first_session_at timestamptz,
  last_session_at timestamptz,
  sessions_7d integer,
  sessions_30d integer,
  sessions_total integer,
  push_platforms text[],
  is_test boolean
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_test uuid[];
  v_push jsonb;
begin
  perform set_config('app.admin_bypass', 'test_accounts', true);
  select coalesce(array_agg(t.app_id), '{}') into v_test from internal.test_accounts t;

  perform set_config('app.admin_bypass', 'push', true);
  select coalesce(jsonb_object_agg(x.app_user_id::text, x.platforms), '{}'::jsonb) into v_push
  from (select pt.app_user_id, array_agg(distinct pt.platform) as platforms
        from public.push_tokens pt group by pt.app_user_id) x;

  perform set_config('app.admin_bypass', 'admin_read', true);
  return query
    select p.id, p.instructor_id, p.email, p.created_at,
           p.joined_via_link_at is not null,
           p.terms_accepted_at,
           (select s.status from public.subscriptions s where s.user_id = p.id),
           exists (select 1 from public.patient_recommended_workouts r where r.patient_id = p.id)
             or p.condition_id is not null,
           l.first_at, l.last_at, l.n7, l.n30, l.n_all,
           coalesce(array(select jsonb_array_elements_text(v_push -> p.id::text)), '{}'),
           p.id = any (v_test) or p.instructor_id = any (v_test)
    from public.patients p
    left join lateral (
      select min(w.completed_at) as first_at, max(w.completed_at) as last_at,
             (count(*) filter (where w.completed_at > now() - interval '7 days'))::int as n7,
             (count(*) filter (where w.completed_at > now() - interval '30 days'))::int as n30,
             count(*)::int as n_all
      from public.workout_logs w where w.patient_id = p.id
    ) l on true
    order by p.created_at desc;
  perform set_config('app.admin_bypass', '', true);
end;
$$;

create or replace function internal.admin_activity_instructors()
returns table(
  instructor_id uuid,
  full_name text,
  email text,
  status text,
  created_at timestamptz,
  first_patient_at timestamptz,
  last_programme_at timestamptz,
  push_platforms text[],
  is_test boolean
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_test uuid[];
  v_push jsonb;
begin
  perform set_config('app.admin_bypass', 'test_accounts', true);
  select coalesce(array_agg(t.app_id), '{}') into v_test from internal.test_accounts t;

  perform set_config('app.admin_bypass', 'push', true);
  select coalesce(jsonb_object_agg(x.app_user_id::text, x.platforms), '{}'::jsonb) into v_push
  from (select pt.app_user_id, array_agg(distinct pt.platform) as platforms
        from public.push_tokens pt group by pt.app_user_id) x;

  perform set_config('app.admin_bypass', 'admin_read', true);
  return query
    select i.id, i.full_name, i.email, i.status, i.created_at,
           (select min(p.created_at) from public.patients p where p.instructor_id = i.id),
           -- Dernier travail sur un programme : séance recommandée à un patient
           -- ou mois de suivi enregistré (lib/billing/autoReview.ts).
           greatest(
             (select max(r.created_at) from public.patient_recommended_workouts r
                join public.patients p on p.id = r.patient_id where p.instructor_id = i.id),
             (select max(m.created_at) from public.monthly_reviews m where m.instructor_id = i.id)
           ),
           coalesce(array(select jsonb_array_elements_text(v_push -> i.id::text)), '{}'),
           i.id = any (v_test)
    from public.instructors i
    order by i.created_at desc;
  perform set_config('app.admin_bypass', '', true);
end;
$$;
