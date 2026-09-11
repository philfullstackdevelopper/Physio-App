-- Physio-App — Migration 0055 : lecture des abonnements patients par le kiné
-- Run once in Supabase (SQL Editor -> New query -> paste -> Run). Safe to re-run.
--
-- subscriptions_self_read (0009, réécrite en 0031) ne laisse chaque utilisateur
-- lire que sa PROPRE ligne. Le kiné n'a donc aucun moyen de savoir quelle offre
-- (Essentiel/Standard/Premium) ses patients ont choisie, ni combien sont
-- réellement actifs — nécessaire pour le compteur de patients actifs de la
-- page Tarifs et paiements (lib/billing/patientCounts.ts), et plus tard pour
-- la collecte de la commission plateforme.
--
-- Additive : n'enlève ni ne modifie subscriptions_self_read. Même schéma que
-- workout_logs_select (0031) — l'instructeur peut lire une ligne dont le
-- user_id est l'un de ses patients, rien de plus.

drop policy if exists subscriptions_instructor_read on public.subscriptions;
create policy subscriptions_instructor_read on public.subscriptions
  for select to authenticated
  using (
    exists (
      select 1 from patients p
      where p.id = subscriptions.user_id and p.instructor_id = public.current_app_user_id()
    )
  );
