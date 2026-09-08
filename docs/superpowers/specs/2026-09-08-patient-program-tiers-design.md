# Offres patient à trois paliers — inscription, paiement au kiné, plafonds

Décidé avec Philippe le 2026-09-08 (échange en langage naturel, pas de maquette). Complète et **remplace en partie** le modèle économique décrit dans `2026-09-04-messages-and-tarif-redesign-design.md` §« Modèle économique » : le patient ne paie plus un tarif libre fixé par le kiné, mais choisit l'une de trois offres à prix fixe.

## Portée

Ce spec couvre le **sous-projet 1** : inscription patient, choix d'offre, paiement au kiné, plafond de séances/semaine, compteur « patients actifs », affichage des offres sur le site public.

**Hors périmètre (sous-projet 2, à concevoir séparément)** : le mécanisme par lequel le kiné paie effectivement les 15 % à EasyPhysio chaque mois. Aujourd'hui ce prélèvement n'existe nulle part dans le code — `lib/billing/platformFee.ts` ne fait que calculer une estimation affichée sur `/dashboard/facturation`. Philippe a choisi de garder un modèle d'agrégation mensuelle (pas de répartition automatique à chaque paiement Stripe), ce qui veut dire qu'il faudra un jour un moyen réel de facturer le kiné (Stripe Invoicing, carte enregistrée, job planifié). Ce sous-projet n'a pas encore de date ; les données produites ici (qui a payé, quelle offre, depuis quand) seront sa base.

## 1. Les trois offres

Remplacent définitivement l'ancien tarif libre du kiné (`instructors.monthly_patient_price_cents`) **et** l'ancien abonnement séparé patient → EasyPhysio à 10 €/mois (`PLANS.patient_monthly`, `app/billing/*`). Un seul paiement désormais, au kiné, qui couvre tout.

| Offre | Prix | Séances/semaine max | Bibliothèque vidéo complète |
|---|---|---|---|
| Essentiel | 19,99 €/mois | 1 | non |
| Standard | 34,99 €/mois | 3 | non |
| Premium | 49,99 €/mois | illimité | oui |

Défini dans `lib/billing/plans.ts`, qui devient la source unique de vérité (prix, plafond, accès vidéo) — réutilisé tel quel par le paiement Stripe (§3) et l'affichage public (§6), pour que le prix annoncé et le prix facturé ne puissent jamais diverger.

```ts
export type TierKey = "essentiel" | "standard" | "premium";

export interface Tier {
  key: TierKey;
  label: string;
  amount: number; // cents/mois
  weeklyCap: number | null; // null = illimité
  videoLibrary: boolean;
}

export const TIERS: Record<TierKey, Tier> = {
  essentiel: { key: "essentiel", label: "Essentiel", amount: 1999, weeklyCap: 1, videoLibrary: false },
  standard:  { key: "standard",  label: "Standard",  amount: 3499, weeklyCap: 3, videoLibrary: false },
  premium:   { key: "premium",   label: "Premium",   amount: 4999, weeklyCap: null, videoLibrary: true },
};
```

`PLANS`/`PlanKey` (`lib/billing/plans.ts` actuel) sont remplacés par `TIERS`/`TierKey` ci-dessus ; `isPlanKey` devient `isTierKey`.

## 2. Nouveau parcours patient

Le kiné ajoute un patient exactement comme aujourd'hui (`addPatient`, nom + e-mail, invitation Clerk) — **aucun changement** à `app/dashboard/patients/new` ni à `addPatient`.

Après l'invitation, la séquence patient devient :

1. `app/auth/set-password` (existant, inchangé) — le patient définit son mot de passe, accepte les CGU.
2. **Nouvelle étape** `app/patient/abonnement` — choix de l'offre, redirection vers Stripe Checkout, retour après paiement.
3. `app/patient/onboarding` (existant, inchangé) — situation clinique, consentement données de santé.
4. `/patient` — accès normal.

Gate : même mécanisme que le consentement santé existant (`isProfileComplete`, appelé depuis `lib/patient/home-data.ts:69` et `app/patient/[workoutId]/seance/page.tsx`). Nouvelle fonction jumelle `hasActiveTier(patientId)` dans `lib/patient/home-data.ts` (ou `lib/billing/access.ts`), appelée aux deux mêmes points d'entrée, redirigeant vers `/patient/abonnement` si aucun abonnement actif. Elle est vérifiée **avant** `isProfileComplete`, pour que l'ordre réel corresponde à 1→2→3→4 ci-dessus.

### Page `/patient/abonnement`
Trois cartes (une par offre), prix, plafond, mention bibliothèque vidéo pour Premium, bouton « Choisir cette offre » par carte → `startTierCheckout(tier)`.

## 3. Paiement — Stripe Connect

Nouvelle action serveur `startTierCheckout(tierKey)` dans `app/patient/abonnement/actions.ts`, calquée sur `app/billing/actions.ts:startCheckout` mais :
- Lit le `stripe_connect_account_id` du kiné du patient (`instructor_connect_accounts`, via `patients.instructor_id`) — refuse si le kiné n'a pas terminé l'inscription Stripe (message clair, pas de paiement possible tant que le kiné n'est pas actif).
- `mode: "subscription"`, prix construit depuis `TIERS[tierKey]` (inline `price_data`, comme aujourd'hui — pas de Price IDs Stripe à gérer).
- `subscription_data.transfer_data.destination = <compte Connect du kiné>` — la totalité du paiement part sur le compte du kiné (pas de `amount_percent` : les 15 % restent un sujet du sous-projet 2, pas prélevés ici).
- `metadata: { user_id: patient.id, plan: tierKey }`, `success_url` → `/patient/onboarding?subscribed=1`, `cancel_url` → `/patient/abonnement?checkout=cancel`.

Le webhook existant (`app/api/stripe/webhook/route.ts`, `syncSubscription` dans `lib/billing/sync.ts`) fonctionne **sans modification** : il écrit déjà `plan` (= la clé de l'offre), `status`, `stripe_customer_id`, `stripe_subscription_id` dans `subscriptions`, indexé par `user_id`. Aucune nouvelle table, aucune nouvelle colonne sur `patients`.

`hasActiveTier(patientId)` lit simplement `subscriptions` : ligne dont `user_id = patientId`, `plan` ∈ {`essentiel`,`standard`,`premium`}, `status` actif (réutilise `isSubscriptionActive` de `lib/billing/access.ts`).

## 4. Plafond hebdomadaire — blocage strict

Nouvelle fonction pure `weeklyCapFor(patientId)` (lit l'offre active via `subscriptions`, retourne `TIERS[plan].weeklyCap`). Vérifiée dans les trois actions qui changent les séances assignées à un patient :

- `assignCondition` (`app/dashboard/patients/[id]/actions.ts:12`) — au moment de recommander une séance après le changement de condition, si applicable.
- `addRecommendedWorkout` (même fichier, ligne 61) — avant l'insertion, somme des `times_per_week` des séances déjà recommandées + celle qu'on ajoute.
- `adjustPatientWorkout` (même fichier, ligne 100) — le plafond s'applique à la séance ajustée elle-même (`workout.times_per_week`), pas à l'ajout/retrait d'exercices à l'intérieur.

Dépassement → `fail("Ce patient est sur l'offre <Nom> (<n> séance(s)/sem.) — passez-le à l'offre supérieure.")`, même pattern que les erreurs existantes de ces actions (redirect avec `?error=`).

Un patient sans offre active (ne devrait pas arriver — gate côté patient) est traité comme plafond 0 : blocage total, message générique.

## 5. Compteur « Patients actifs »

`lib/dashboard/homeData.ts:97` (`patientCount: patients.length`) compte aujourd'hui **tous** les patients, payants ou non — c'est trompeur une fois le paiement obligatoire. On ajoute un second champ plutôt que de redéfinir l'existant, pour ne pas perdre la visibilité sur les invitations en attente :

```ts
patientCount: number;       // inchangé — total des patients du kiné
activePatientCount: number; // nouveau — ceux avec un abonnement actif (subscriptions.status actif, plan ∈ TIERS)
```

Dashboard (`app/dashboard/page.tsx`) : deux `StatTile` côte à côte, « Patients actifs » et « Total » (au lieu d'un seul « Patients suivis »).

## 6. Affichage public des trois offres

Nouveau composant `components/PricingTiers.tsx`, ajouté à `app/page.tsx` (site vitrine), lisant directement `TIERS` — jamais de prix codé en dur une deuxième fois. Trois cartes verticales, prix, plafond exprimé en langage patient (« 1 séance par semaine », « jusqu'à 3 séances par semaine », « séances illimitées + bibliothèque vidéo complète »), pas de bouton d'achat (l'achat n'existe que dans le parcours patient déjà invité par son kiné — le site vitrine n'a pas de inscription libre).

Distinct de `components/ComparisonTable.tsx` (déjà en place sur `app/page.tsx:187`), qui compare « sans/avec EasyPhysio » et n'affiche aucun prix — aucune modification de ce composant.

## 7. Patients existants — bascule

Décision de Philippe : **grandfathering**. Les patients déjà en essai (`patients.trial_ends_at`) ou déjà abonnés à l'ancien plan `patient_monthly` (table `subscriptions`) gardent leur accès actuel tel quel — `hasActiveTier` doit aussi reconnaître ces deux cas comme « actif » (pas seulement les nouvelles offres), pour ne pas les bloquer rétroactivement à `/patient/abonnement`. Concrètement : `hasActiveTier` retourne vrai si `patientAccess(...).level !== "free"` (logique existante, inchangée) OU si une offre des trois nouveaux paliers est active.

`lib/billing/access.ts` (`PatientLevel`, `patientAccess`) n'est **pas** supprimé : le chemin `trial`/ancien `premium` continue de fonctionner pour ces comptes historiques. Le chemin des nouvelles offres (§3) est un ajout à côté, pas un remplacement de cette logique — seul `PLANS.patient_monthly` (l'offre elle-même, plus proposée à la vente) disparaît ; les lignes `subscriptions` déjà existantes avec `plan = "patient_monthly"` restent lisibles et valides.

## Migration base de données

Aucune nouvelle table ni colonne : `subscriptions` (0009) et `instructor_connect_accounts` existent déjà et suffisent. Pas de fichier de migration SQL pour ce sous-projet.

## Tests
- `lib/billing/plans.test.ts` : structure de `TIERS`, `isTierKey`.
- `lib/billing/access.test.ts` (étendre l'existant) : `hasActiveTier` — actif sur nouvelle offre, actif sur ancien `patient_monthly`/essai (grandfathering), inactif sinon.
- `lib/exercise/weeklyCap.test.ts` (nouveau, pure) : `weeklyCapFor`/la fonction de vérification de plafond — sous le plafond, au plafond, au-dessus, offre Premium (`null` = jamais bloqué).
- `npm test`, `npx tsc --noEmit`, `npm run lint` verts.
- Vérification navigateur : parcours complet invitation → mot de passe → choix d'offre → paiement (mode test Stripe) → onboarding → `/patient` ; tentative de dépassement de plafond bloquée avec message clair ; affichage des trois offres sur le site public.
