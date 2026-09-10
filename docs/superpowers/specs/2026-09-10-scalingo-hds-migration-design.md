# Migration Scalingo/HDS — sortie de Supabase Storage et de l'hébergement Vercel

Décidé avec Philippe le 2026-09-10 (échange en langage naturel, pas de maquette). Chantier séparé du développement produit courant : **ne commence qu'une fois le produit jugé fini pour le lancement**, en un seul bloc dédié, pas en parallèle des autres fonctionnalités.

## Pourquoi

Le produit stocke des données de santé de patients (conditions, séances, feedback douleur — §3 de `CLAUDE.md`). La loi française (art. L.1111-8 CSP, décret n°2026-209 du 24/03/2026) impose qu'un tiers hébergeant ces données pour le compte d'un responsable de traitement (le kiné) passe par un hébergeur certifié HDS, avec hébergement physique dans l'UE/EEE. Ni Supabase ni Vercel (stack actuelle, `CLAUDE.md` §8) ne sont certifiés HDS. Risque de non-conformité : jusqu'à 3 ans d'emprisonnement et 45 000 € d'amende (personne physique) au titre de l'art. L1115-1 CSP, cumulable avec des sanctions CNIL au titre du RGPD.

Scalingo est certifié HDS 2.0 sur l'ensemble des six périmètres d'hébergement (valide jusqu'en septembre 2028) et correspond à la cible déjà prévue par le scaffold Phase 2 documenté dans `CLAUDE.md` §7 (`auth.ts`, `lib/db/pool.ts`, `lib/db/withUserContext.ts`, migration `0017_users_and_auth_tokens.sql`).

## Portée

**Dans le périmètre** : sortir de Supabase (base de données + stockage de fichiers) et de l'hébergement Vercel, vers Scalingo (app + PostgreSQL) + un stockage S3-compatible externe (Outscale OOS, aligné avec la région HDS de Scalingo — à confirmer/comparer avant de trancher définitivement).

**Hors périmètre** :
- **L'authentification reste sur Clerk.** Décision prise le 2026-09-10 : Clerk ne stocke que des identifiants de connexion (pas de données de santé), n'est pas concerné par la contrainte HDS, et fonctionne via API depuis n'importe quel hébergeur. Le scaffold Auth.js/NextAuth existant (`auth.ts`, `lib/auth/{password,tokens}.ts`) n'est **pas** activé par ce chantier — il reste tel quel, en réserve, pour une éventuelle bascule future si Philippe décide un jour d'abandonner Clerk. Voir « Pont Clerk ↔ RLS » ci-dessous pour ce que ça change côté base de données.
- **Stripe reste identique** — aucune donnée de santé, aucune contrainte HDS. Seul changement : repointer l'URL du webhook Stripe Connect vers le nouveau domaine au moment de la bascule.
- Aucune nouvelle fonctionnalité produit. Objectif : parité fonctionnelle stricte. Si un comportement diffère de la version actuelle après la migration, c'est un bug, pas une amélioration à saisir au passage.
- Pas de migration de données réelles : tous les comptes/patients actuels sont fictifs. Seule exception, voir ci-dessous.

## Ce qui est préservé de Supabase

**Uniquement la bibliothèque d'exercices** : tables `exercises`, `conditions`, `workouts`, `workout_exercises`, plus les images associées actuellement dans Supabase Storage (93 exercices Injurymap + 9 illustrations potrace custom, `CLAUDE.md` historique du 2026-09-09). Tout le reste (patients, instructeurs, `workout_logs`, `patient_messages`, `subscriptions`, `patient_documents`...) repart d'une base neuve, vide, re-seedée si besoin pour les tests.

## Architecture cible

- **App** : conteneur Scalingo (Next.js en mode standalone — process persistant, pas de fonctions serverless comme sur Vercel), région SecNumCloud.
- **Base de données** : PostgreSQL Scalingo, plan à confirmer entre Starter et Business HDS en région SecNumCloud (voir « Question ouverte » ci-dessous) — 54 migrations SQL rejouées telles quelles.
- **Stockage fichiers** : bucket S3-compatible externe (Outscale OOS pressenti), pour les images d'exercices et les futurs documents patients (`patient_documents`).
- **Auth** : Clerk, inchangé. RLS existant s'appuie sur `auth.uid()` (recréé sur Postgres nu par la migration `0017`, pensé à l'origine pour Auth.js) — il faut un pont qui fait porter l'identité Clerk (vérifiée côté serveur) jusqu'à cette même convention `auth.uid()`, pour que les policies RLS actuelles continuent de fonctionner sans être réécrites.
- **Paiement** : Stripe Connect inchangé, webhook repointé.

## Étapes

### Phase 0 — Préalables
1. Produit jugé fonctionnellement fini pour le lancement (seuil décidé par Philippe).
2. Contact commercial Scalingo : confirmer si le plan Business HDS est nécessaire pour être réellement couvert par leur certification (vs. Starter en région SecNumCloud), et le détail contractuel HDS (correspondant professionnel de santé requis, coûts annexes non publiés).
3. Choix définitif du stockage S3-compatible (Outscale OOS par défaut, sauf comparatif demandé).

### Phase 1 — Base de données
4. Provisionner une base PostgreSQL neuve chez Scalingo, rejouer les 54 migrations SQL (`node scripts/migrate.mjs`).
5. Construire le pont Clerk ↔ `auth.uid()` (le point le plus sensible du projet — chaque policy RLS concernée expliquée à Philippe avant application, conformément à la convention du projet).
6. Réécrire les fichiers utilisant `@supabase/supabase-js` (58 fichiers identifiés) pour passer par des requêtes SQL directes via `withUserContext` (`lib/db/withUserContext.ts`).

### Phase 2 — Bibliothèque d'exercices
7. Script d'export des tables `exercises`/`conditions`/`workouts`/`workout_exercises` depuis Supabase.
8. Téléchargement des images depuis Supabase Storage, re-upload vers le nouveau bucket S3-compatible, réimport des lignes avec les nouvelles URLs.

### Phase 3 — Stockage fichiers (nouveau code)
9. Créer le bucket S3-compatible.
10. Écrire le code d'upload/téléchargement pour les documents patients (`patient_documents`) et toute autre fonctionnalité s'appuyant sur Supabase Storage.

### Phase 4 — Facturation
11. Repointer le webhook Stripe Connect vers le nouveau domaine/environnement (config Stripe dashboard, pas de code).

### Phase 5 — Déploiement et bascule
12. Déployer sur Scalingo en environnement de test, avant tout changement DNS.
13. Vérification de bout en bout par Philippe dans le navigateur, page par page : inscription kiné → approbation admin → ajout patient → assignation condition/séance → séance patient → paiement Stripe → messagerie. Chaque zone validée avant de passer à la suivante.
14. Bascule DNS finale vers Scalingo ; arrêt de l'hébergement Vercel et de la base/stockage Supabase.

## Estimation

Révisée le 2026-09-10 en tenant compte des outils de développement assisté disponibles (écriture de code directe, parallélisation possible entre zones indépendantes) — le goulot d'étranglement n'est pas le volume de code, c'est la vérification de sécurité et les tests fonctionnels.

| Étape | Estimation |
|---|---|
| Réécriture des 58 fichiers (Supabase → SQL direct) | 2-4 jours |
| Pont Clerk ↔ RLS | 2-3 jours |
| Migration bibliothèque d'exercices | quelques heures à 1 jour |
| Stockage fichiers | 1 jour |
| Déploiement + vérification de bout en bout | 2-4 jours |
| **Total** | **~1,5 à 2 semaines** de calendrier, en sessions concentrées |

## Coûts d'hébergement estimés (Scalingo, hors code)

Dépend fortement du plan PostgreSQL retenu (Starter vs Business HDS, voir question ouverte) :

| Échelle | App | Base de données | Stockage | Total |
|---|---|---|---|---|
| Démarrage (quelques comptes de test) | ~17 €/mois (M) | ~24 €/mois (Business HDS 512 Mo) | ~1 €/mois | **~40-45 €/mois** |
| 10 kinés / ~100 patients | ~17-35 €/mois | ~24-48 €/mois | ~0,50 €/mois | **~45-70 €/mois** |
| 100 kinés / ~1 500 patients | ~69 €/mois (XL) | ~96 €/mois (2 Go) | ~1,50 €/mois | **~170-250 €/mois** |

À mettre en regard du revenu plateforme (commission 15 % sur abonnements patients, `lib/billing/plans.ts`) : l'hébergement représente une part décroissante du revenu à mesure que l'échelle grandit (~10-15 % à 100 patients, ~3 % à 1 500 patients).

## Question ouverte à trancher avant Phase 0

Le tableau tarifaire Scalingo distingue une gamme "Starter" et une gamme "Business HDS" pour PostgreSQL, disponibles toutes deux en région SecNumCloud — il n'est pas certain que le Starter en région SecNumCloud suffise à être réellement couvert par la certification HDS de Scalingo, ou si seule la gamme Business HDS l'est. **À confirmer directement avec le commercial Scalingo avant de signer quoi que ce soit** — ça peut faire une différence de coût significative (×2,8 sur la base de données).

## Ce qui reste pour Philippe (non délégable)

- Créer le compte Scalingo, signer le contrat HDS, moyens de paiement.
- Valider les décisions de conception (comme le choix de garder Clerk, déjà tranché).
- Vérifier chaque étape dans le navigateur avant de passer à la suivante.
- Donner le feu vert pour la bascule DNS finale (action irréversible).
