# Offres patient après l'onboarding — essai 7 jours, prix modifiables par le kiné, annulation

Plan d'exécution du spec `../specs/2026-09-08-patient-program-tiers-design.md`, avec les décisions prises avec Philippe le 2026-09-10. Là où ce plan contredit le spec, **c'est ce plan qui fait foi** (les écarts sont listés en §1).

## 1. Écarts par rapport au spec du 08/09

| # | Spec du 08/09 | Décision du 10/09 |
|---|---|---|
| D1 | Choix d'offre **avant** l'onboarding (mot de passe → offre → onboarding) | Choix d'offre **après** l'onboarding : « Enregistrer et continuer » → `/patient/abonnement` → `/patient` |
| D2 | Paiement immédiat | **7 jours gratuits** (`subscription_data.trial_period_days: 7`), carte saisie au checkout, premier prélèvement à J+7, automatique |
| D3 | Prix fixes, identiques pour tous les kinés | Les 3 prix du spec sont la **base par défaut** ; chaque kiné peut les modifier depuis `/dashboard/facturation` (3 colonnes nullable sur `instructors`, repli sur `TIERS` si null) |
| D4 | Non couvert | **Annulation en un clic** depuis `/patient/compte` (section « Mon abonnement ») via le portail client Stripe déjà câblé (`openBillingPortal`) |
| D5 | « Aucune migration » | **Faux** — voir §2 : la migration 0020 n'a jamais été appliquée, la contrainte `subscriptions_plan_check` refuse les nouvelles clés, et le défaut de 60 jours sur `patients.trial_ends_at` court-circuiterait la page d'offres pour tout nouveau patient |
| D6 | Gabarit : « trois cartes » | Gabarit **Road to Offer** : 3 cartes côte à côte, celle du milieu (Standard) surélevée et remplie de la couleur de marque avec un ruban « 7 jours gratuits », prix en gros + `/mois`, bouton pleine largeur, ligne de réassurance sous le bouton, liste à coches |

Reportés à une itération suivante (dans le spec, pas demandés le 10/09) : plafond hebdo strict côté kiné (§4 du spec), compteur « patients actifs » (§5), affichage public des offres (§6), et le sous-projet 2 (encaissement réel des 15 %).

## 2. Base de données — ce qu'il faut réellement appliquer

État constaté le 10/09 sur le projet Supabase `physio-app` :
- `instructors.monthly_patient_price_cents` : **absent**
- `instructor_connect_accounts`, `platform_invoices` : **absentes**
- `subscriptions_plan_check` : `plan in ('patient_monthly','kine_pro')` — version 0009, pas 0020
- `patients.trial_ends_at` : défaut `now() + 60 days` toujours actif

Donc :
1. **Appliquer `0020_connect_pricing.sql` tel quel** (fichier existant). Politiques RLS qu'il crée, en clair : `instructor_connect_accounts` et `platform_invoices` sont lisibles uniquement par le kiné propriétaire et **jamais écrivables depuis le navigateur** (seul le serveur, avec la clé service-role, y écrit) — c'est ce qui empêche un kiné de détourner les paiements d'un autre. `monthly_patient_price_cents` est modifiable par le kiné sur sa propre ligne via la politique existante `instructors_update_own`, ce qui est voulu.
2. **Nouvelle migration `0053_patient_tiers.sql`** :
   - `subscriptions_plan_check` élargie à `('patient_monthly','kine_pro','kine_platform_fee','essentiel','standard','premium')`
   - `instructors.tier_essentiel_cents / tier_standard_cents / tier_premium_cents` (integer nullable, `> 0`), modifiables par le kiné via `instructors_update_own` (voulu : c'est lui qui fixe ses prix)
   - `alter column patients.trial_ends_at drop default` — les **nouveaux** patients n'ont plus d'essai « maison » de 60 jours (l'essai est désormais celui de Stripe, 7 jours, sur l'offre choisie) ; les patients **existants** gardent leur valeur (grandfathering du spec §7 préservé)
   - Pas de nouvelle table, pas de nouvelle politique RLS.

## 3. Code — étapes dans l'ordre, chacune vérifiable seule

1. **Migrations** (§2) — vérification : `select` sur les colonnes/contraintes.
2. **`lib/billing/plans.ts`** : `TIERS`/`TierKey`/`isTierKey` (spec §1) ; `PLANS.patient_monthly` conservé uniquement comme clé historique (`LEGACY_PLAN_KEYS`) pour lire les anciennes lignes. `resolveTierPrices(instructorRow)` : les 3 prix effectifs d'un kiné (colonne si renseignée, sinon défaut). Tests `lib/billing/plans.test.ts`.
3. **`lib/billing/access.ts`** : `hasActiveTier({ subPlan, subStatus, subCurrentPeriodEnd, trialEndsAt })` pur — vrai si offre ∈ `TIERS` active (`trialing` compte), OU ancien `patient_monthly` actif, OU `trial_ends_at` futur (grandfathering). Tests dans `lib/billing/access.test.ts` (nouveau fichier, même style `node:test` que `platformFee.test.ts`).
4. **Côté kiné** — `/dashboard/facturation` : le formulaire « tarif unique » devient 3 champs (Essentiel / Standard / Premium, pré-remplis avec le prix effectif) ; nouvelle action `setTierPrices` dans `app/dashboard/connect/actions.ts` ; `FeeSimulator` suit le champ Standard. `setPatientPrice`/`monthly_patient_price_cents` ne sont plus proposés (colonne conservée pour `platformFee.ts`, sous-projet 2).
5. **Côté patient** — `app/patient/abonnement/page.tsx` (gabarit D6, prix effectifs du kiné du patient, bandeau « paiement pas encore activé par votre kiné » si son compte Connect n'est pas `active`) + `app/patient/abonnement/actions.ts` : `startTierCheckout(formData)` calqué sur `startCheckout` avec `subscription_data.transfer_data.destination = <compte Connect du kiné>`, `trial_period_days: 7`, `metadata.plan = <tier>`, `success_url → /billing/return?session_id=…&next=/patient`, `cancel_url → /patient/abonnement?checkout=cancel`. `app/billing/return/route.ts` honore `next`.
6. **Portes** : `app/patient/layout.tsx` rend `/patient/abonnement` plein écran sans nav (comme l'onboarding) ; `lib/patient/home-data.ts:70` et `app/patient/[workoutId]/seance/page.tsx:33` — profil complet → sinon onboarding, **puis** `hasActiveTier` → sinon `/patient/abonnement` ; `saveOnboarding` redirige vers `/patient/abonnement` si pas d'offre active, sinon `/patient`.
7. **Annulation** : section « Mon abonnement » dans `app/patient/compte/page.tsx` (offre, statut, prochaine échéance / fin d'essai, bouton « Gérer / annuler mon abonnement » → `openBillingPortal`) ; `app/billing/refresh/route.ts` corrigé (il utilise encore `supabase.auth.getUser()`, mort depuis Clerk — passer par `requireUser`) et renvoyé vers `/patient/compte`. L'ancienne page `app/billing/page.tsx` (abonnement à 10 €) redirige vers `/patient/compte`.
8. **Vérification navigateur** : invitation → mot de passe → CGU → onboarding → page d'offres → Stripe Checkout (carte test `4242…`) → retour `/patient` ; `/patient/compte` montre l'essai et permet l'annulation via le portail ; un patient historique (essai 60 j ou `patient_monthly`) n'est jamais renvoyé vers `/patient/abonnement`.

## 4. Prérequis externe — Stripe Connect

`transfer_data.destination` exige que Stripe Connect soit **activé sur le compte Stripe d'EasyPhysio** (Dashboard Stripe → Connect) et que le kiné du patient ait terminé l'onboarding Connect (`instructor_connect_accounts.status = 'active'`, via « Activer les paiements » sur `/dashboard/facturation`). Sans ça, l'étape paiement n'est pas testable de bout en bout ; la page d'offres reste affichable et explique au patient que son kiné n'a pas encore activé les paiements (comportement du spec §3, conservé).
