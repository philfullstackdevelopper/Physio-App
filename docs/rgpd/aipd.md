# Analyse d'impact relative à la protection des données (AIPD) — EasyPhysio

> **BROUILLON rédigé par Claude — à faire valider par un juriste (Stanislas de Saint-Romain) avant usage. Rien ici n'est validé.**

_Plan : méthode PIA de la CNIL (contexte → principes fondamentaux → risques → validation). Établi le 2026-11-08 d'après le code de la branche `feat/hds-clerk-rgpd`. Aucun vrai patient n'est encore inscrit (invitations patients fermées jusqu'à la bascule HDS) : c'est le bon moment pour faire cette analyse — **avant** le lancement._

| | |
|---|---|
| Traitement analysé | Suivi à distance des programmes d'exercices des patients de kinésithérapeutes (Partie B du registre) et abonnement d'accès du patient (registre A2) |
| Responsable(s) | Chaque kiné [et/ou EasyPhysio — rôle à trancher, README question 1] |
| Rédacteur | Claude (brouillon) pour [à compléter : société EasyPhysio] |
| Avis du DPO | [à compléter — pas de DPO désigné à ce jour] |
| Avis des personnes concernées | [à compléter — ex. questionnaire à quelques patients test et au kiné partenaire] |

## 1. Pourquoi une AIPD est nécessaire

Critères du G29 (lignes directrices WP248) remplis — 2 suffisent :
1. **Données sensibles** : données de santé (douleur, pathologie, phase de rééducation, histoire de la blessure, poids, taille, séances faites).
2. **Personnes vulnérables** : patients, dans une relation de soin déséquilibrée avec leur kiné ; potentiellement mineurs (rien ne l'empêche, README question 7).
3. Possiblement **usage innovant** (suivi asynchrone par appli mobile, phase de rééducation qui avance automatiquement).
4. Possiblement **grande échelle** à terme (plateforme multi-kinés, ouverture à l'étranger prévue).
5. Possiblement **surveillance systématique** (adhérence quotidienne, rappels).

## 2. Contexte

### 2.1 Description
Un kiné inscrit invite ses patients (e-mail ou QR code). Le patient accepte les CGU, s'abonne (accès plateforme payé à EasyPhysio, carte enregistrée), remplit un questionnaire de santé avec consentement, puis suit les séances choisies par son kiné, note sa douleur et sa difficulté, et échange des messages. Le kiné voit l'adhérence, la douleur sur 30 jours, ajuste la séance ; un ajustement dans le mois déclenche le prélèvement de ses honoraires (6 €) sur son propre compte Stripe.

### 2.2 Données, supports et flux

| Données | Où elles sont | Qui les reçoit en plus |
|---|---|---|
| Santé et suivi (`patient_profiles`, `patient_feedback`, `workout_logs`, `exercise_results`, `patient_recommended_workouts`, `workouts` personnalisées, `patient_messages`, `monthly_reviews.feedback`) | PostgreSQL Scalingo (aujourd'hui `osc-fr1`, **non HDS**) via PostgREST + Caddy | Personne d'autre |
| Identité du patient (nom, e-mail) | Base Scalingo **et** Clerk (USA) | Stripe (abonnement d'accès + compte du kiné) |
| Paiement | Stripe (carte) ; base : identifiants Stripe, 4 derniers chiffres | — |
| Jeton de notification | Base + Expo / Apple / Google | — |
| Vidéos d'exercices (pas de patient filmé) | Cloudflare R2 | — |
| Mesure d'audience (site public + espace kiné) | PostHog UE | — |
| Copie ancienne | Projet Supabase (USA), plus utilisé, **pas encore supprimé** | — |

Supports techniques : serveur Next.js (Scalingo), base PostgreSQL, PostgREST, navigateurs, appli mobile Expo (WebView du site), poste de Philippe (accès base par `scalingo db-tunnel`, clés dans `.env.local`), sessions de Claude Code (qui lisent le code, les journaux et lancent des scripts).

## 3. Principes fondamentaux

### 3.1 Finalités, base légale, minimisation
- **Finalités** déterminées et limitées au suivi de soin et à la facturation ; aucune revente, aucune publicité, pas d'IA appliquée aux données de patients (`lib/ai/protocol.ts` est une maquette non branchée).
- **Base légale** : consentement explicite recueilli dans le questionnaire (`health_data_consent_at`) — **à confirmer** face à l'art. 9.2.h (README question 2).
- **Minimisation** — bons points : pas de numéro de sécurité sociale, pas de documents médicaux (supprimés en `0056`), pas de pièces jointes, pas de vidéo du patient, notifications sans contenu, Clerk ne reçoit plus le rôle « patient » ni le nom du kiné. **À discuter** : la **date de naissance complète** (l'âge ou l'année suffiraient-ils ?), le **téléphone** (colonne existante, plus collectée par le questionnaire actuel — à supprimer ?), les textes libres « histoire de la blessure ».
- **Ordre des étapes** : le patient paie et donne nom + e-mail à Stripe **avant** de donner son consentement santé. Acceptable si le consentement ne porte que sur les données de santé, à valider.

### 3.2 Durées de conservation
Aucune purge automatique dans le code. À définir (registre, Partie B). Problème identifié : la suppression d'un patient efface en cascade les **notes d'honoraires** que le kiné doit conserver.

### 3.3 Droits des personnes

| Droit | État |
|---|---|
| Information | Politique de confidentialité en brouillon, plusieurs inexactitudes (voir `politique-confidentialite-changements.md`). |
| Accès / portabilité | Export JSON en libre-service (`/patient/compte/export`) : profil, fiche, ressentis, séances, résultats par exercice, messages, abonnement, suivi, notes. Manquent : jetons de notification, exercices réservés au patient, données détenues par Clerk et Stripe. |
| Rectification | Questionnaire modifiable par le patient ; e-mail non modifiable par lui (verrou `0063`) → passe par le support [à prévoir]. |
| Effacement | Suppression du compte en libre-service (résiliation Stripe + cascade + compte Clerk). Le client Stripe n'est pas supprimé. |
| Retrait du consentement | **Aucun moyen hors suppression complète du compte.** |
| Opposition / limitation | Pas de parcours ; par e-mail [contact à compléter]. |
| Kiné (responsable) | **Aucun export global** de ses patients pour lui (utile à la fin du contrat, art. 28.3.g). |

### 3.4 Sous-traitants et transferts
Voir `accord-sous-traitance-kine.md` §10. Transferts hors UE : Clerk, Expo (+ Apple / Google), Stripe en partie, Cloudflare selon bucket, Gmail (prospection). DPA à signer et archiver pour chacun.

## 4. Les risques

Échelles CNIL : **gravité** et **vraisemblance** de 1 (négligeable) à 4 (maximale).

### 4.1 Accès illégitime aux données (confidentialité)

| | |
|---|---|
| Impacts sur le patient | Révélation de sa pathologie, de sa douleur, de ses messages à son employeur, son entourage, un assureur ; gêne, discrimination ; perte de confiance dans le soin. |
| Sources de risque | (a) Pirate qui vole le mot de passe d'un **kiné** (accès à tous ses patients). (b) Faille dans une règle RLS ou dans une fonction `internal.*` (erreur de développement — le code est écrit très vite, en grande partie par une IA). (c) **Administrateur / outils** : Philippe a un accès direct à la base ; les fonctions « admin_read » lisent patients, séances, ressentis et bilans de tous les kinés (calcul de facturation, rappels) ; des sessions Claude Code peuvent lancer des scripts avec la connexion directe et lisent les journaux serveur. (d) Prestataires : Clerk et Stripe (USA, lois d'accès des autorités américaines), Expo. (e) **Faute de frappe** dans l'e-mail d'invitation : un inconnu reçoit l'accès au programme et voit le nom du kiné. (f) Téléphone perdu ou partagé. (g) Ancienne copie Supabase (USA) oubliée. (h) Hébergement actuel non HDS. (i) Mesure d'audience : nom de patient dans un message d'erreur, IP. |
| Mesures en place | RLS forcée sur chaque table ; schéma `internal` jamais exposé ; laissez-passer nommés par fonction ; kiné suspendu = plus aucune lecture (`0063`) ; champs sensibles verrouillés ; liens QR signés ; vidéos en liens signés ; Face ID dans l'appli ; PostHog exclu de l'espace patient + masquage ; métadonnées Clerk réduites au nom (cette branche) ; notifications génériques ; Clerk gère mots de passe et sessions. |
| Mesures prévues | Bascule `osc-secnum-fr1` + HDS ; suppression du projet Supabase ; **double authentification obligatoire** pour les kinés et l'administrateur (Clerk le permet — pas activé dans le code) ; règle écrite « aucune IA ne lit de vraies données patients » (scripts en mode comptage, sans nom ni e-mail — déjà le cas de `scripts/clerk-nettoyer-metadonnees.mjs`), journaux serveur sans e-mail ; IP PostHog écartée ; confirmation de l'e-mail par le kiné avant invitation [à concevoir] ; journal des accès administrateur [à concevoir] ; tests automatiques des règles RLS. |
| Gravité | **3 (importante)** — données de santé, mais pas de diagnostic médical complet ni de documents. |
| Vraisemblance | **3 aujourd'hui** (non HDS, pas de 2FA, Supabase non supprimé) → **2 après les mesures prévues**. |

### 4.2 Modification non désirée des données (intégrité)

| | |
|---|---|
| Impacts | Programme faux (exercice inadapté → douleur, aggravation de la blessure) ; historique de douleur faussé → mauvaise décision du kiné ; prélèvement à tort. |
| Sources | Bug ou migration appliquée par erreur (le journal `schema_migrations` de Scalingo est incomplet : risque de rejouer un fichier) ; compte kiné piraté ; kiné qui ajuste la séance du mauvais patient ; frein de progression automatique mal calibré. |
| Mesures en place | Écriture limitée par RLS (patient : ses lignes ; kiné : ses patients) ; résultats par exercice non modifiables après coup ; montants et numéros de note écrits par le serveur seul ; `migrate.mjs` sûr par défaut (liste sans appliquer) ; essais « à blanc » annulés avant chaque migration ; message automatique au patient quand sa séance est ajustée. |
| Mesures prévues | 2FA ; journal des modifications de programme [à concevoir] ; relecture clinique des exercices et du frein par le kiné partenaire avant lancement. |
| Gravité | **3** | Vraisemblance | **2** |

### 4.3 Disparition des données (disponibilité)

| | |
|---|---|
| Impacts | Perte de l'historique de suivi ; le kiné perd ses notes d'honoraires (obligation comptable) ; interruption du suivi. |
| Sources | Suppressions en cascade (un kiné supprimé efface tous ses patients ; un patient supprimé efface les notes du kiné) ; erreur humaine sur la base ; panne Scalingo ; perte du compte Clerk (plus de connexion possible) ; conteneurs Scalingo sans disque persistant. |
| Mesures en place | Sauvegardes de l'addon PostgreSQL Scalingo [à vérifier : fréquence, durée, test de restauration] ; confirmation « SUPPRIMER » avant suppression patient ; suppression kiné traitée à la main par Philippe. |
| Mesures prévues | Offre PostgreSQL Business (sauvegardes, haute dispo) ; garder les notes d'honoraires après suppression du patient (séparées, au nom du kiné) ; export complet pour le kiné avant suppression ; test de restauration documenté. |
| Gravité | **2 (limitée)** | Vraisemblance | **2** |

## 5. Cartographie (avant → après les mesures prévues)

| Risque | Gravité | Vraisemblance actuelle | Vraisemblance visée |
|---|---|---|---|
| Accès illégitime | 3 | 3 | 2 |
| Modification non désirée | 3 | 2 | 1–2 |
| Disparition | 2 | 2 | 1 |

## 6. Risque résiduel

Après les mesures prévues, le risque principal restant est la **présence hors UE de l'identité des patients** (Clerk, Stripe) et le **pouvoir d'accès de l'administrateur**. Jugé [à valider : acceptable / non acceptable] par le juriste. S'il est jugé non acceptable : fournisseur d'identité hébergé HDS en France, ou consultation préalable de la CNIL (art. 36).

## 7. Conditions de lancement proposées

**Ne pas ouvrir les invitations patients (`PATIENT_INVITATIONS_OPEN`) avant** : bascule HDS faite et vérifiée ; Supabase supprimé ; 2FA kinés et admin ; politique de confidentialité corrigée et validée ; accord de sous-traitance kiné en place ; DPA signés ; base légale tranchée.

## 8. Plan d'action

| # | Action | Qui | Échéance | État |
|---|---|---|---|---|
| 1 | Bascule vers Scalingo `osc-secnum-fr1` + option HDS + PostgreSQL Business, PostgREST dans la même région ; obtenir le périmètre écrit du certificat | Philippe (+ Claude pour la bascule) | Avant lancement | Prévu |
| 2 | Retirer le rôle « patient » et le nom du kiné chez Clerk (code + nettoyage des comptes existants) | Claude / Philippe | Cette branche | En cours |
| 3 | Supprimer le projet Supabase (USA) | Philippe | Après 1 | À faire |
| 4 | Activer la double authentification (obligatoire kinés + admin) | Claude + Philippe | Avant lancement | À faire |
| 5 | PostHog : écarter l'IP, rétention ≤ 13 mois, vérifier qu'aucun nom de patient ne part dans les erreurs de l'espace kiné | Philippe / Claude | Avant lancement | À faire |
| 6 | Durées de conservation + purge automatique (inactivité, journaux, liste d'attente) | Juriste puis Claude | Avant lancement | À faire |
| 7 | Conserver les notes d'honoraires du kiné après suppression du patient | Claude | Avant lancement | À faire |
| 8 | Retrait du consentement sans supprimer le compte (si consentement retenu) ; parcours mineurs | Juriste puis Claude | Avant lancement | À faire |
| 9 | Export complet pour le kiné ; compléter l'export patient (jetons, exercices réservés) ; supprimer le client Stripe à l'effacement | Claude | Avant lancement | À faire |
| 10 | Règle écrite : aucune IA (Claude) ne lit de vraies données patients ; scripts en comptage seulement ; journaux serveur sans e-mail | Philippe + Claude | Avant lancement | Partiel |
| 11 | Procédure de violation de données (détection, registre des violations, notification kiné ≤ 48 h, CNIL ≤ 72 h) | Juriste + Philippe | Avant lancement | À faire |
| 12 | Signer / archiver les DPA (Scalingo, Clerk, Stripe, Expo, Cloudflare, PostHog) | Philippe | Avant lancement | À faire |
| 13 | Tests automatiques des règles RLS (un kiné ne lit jamais le patient d'un autre) | Claude | Avant lancement | À faire |
| 14 | Relecture clinique (exercices, frein de progression) ; question dispositif médical | Kiné partenaire, juriste | Avant lancement | À faire |

## 9. Validation

| | Date | Avis |
|---|---|---|
| Juriste | [à compléter] | [à compléter] |
| DPO (si désigné) | [à compléter] | [à compléter] |
| Responsable (Philippe) | [à compléter] | [à compléter] |

Révision : à chaque changement important (nouvelle donnée, nouveau prestataire, ouverture à l'étranger) et au moins une fois par an.
