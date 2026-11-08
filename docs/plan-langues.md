# EasyPhysio en français et en anglais — plan (proposition du 2026-11-06)

Rien n'est encore modifié dans l'application. Ce document propose comment faire ; Philippe valide avant toute étape.

## 1. Ce qui existe aujourd'hui

- **Tout le texte est écrit en dur, en français**, directement dans le code : environ **4 000 lignes de texte** réparties dans **~260 fichiers**.
  - Composants partagés (`components/`, 81 fichiers) : ~1 850 lignes — la plus grosse part (page d'accueil, assistant d'inscription, fiche patient, séance guidée…).
  - `lib/` (calculs, facturation, exercices) : ~900 lignes, dont ~190 pour la facturation (`lib/billing/*`).
  - App patient : ~420 · tableau de bord kiné : ~400 · `/admin` : ~120 · inscription : ~90 · pages légales (CGU, confidentialité, mentions) : ~100 · démo et maquettes (`/demo`, `app/prototypes/*`) : ~210.
- **Le contenu des exercices n'est pas dans le code mais dans la base** : noms, consignes, pathologies (« Lombalgie chronique »), noms de séances. ~300 exercices plateforme. Ça demande un traitement à part (voir §5).
- **Dates et montants** : 25 fichiers forcent le format français (`"fr-FR"`). Il faudra passer par un petit outil commun qui suit la langue choisie.
- **Clerk** (connexion / création de compte) est réglé en dur sur le français (`frFR` dans `app/layout.tsx`). Clerk fournit aussi l'anglais : il suffit de choisir le bon pack selon la langue de l'utilisateur.
- **Next.js 16** (doc lue dans `node_modules/next/dist/docs/`) propose deux façons : mettre la langue dans l'adresse (`/en/...`, `/fr/...`) ou la garder hors de l'adresse. Il ne fournit pas les dictionnaires lui-même et renvoie vers des bibliothèques comme **next-intl**.

## 2. Ce que je recommande

### a) Où garder la langue choisie : en base **et** dans un cookie

- **En base** : une colonne `locale` (`'fr'` ou `'en'`, `'fr'` par défaut) sur la table `app_users`, qui existe déjà pour tout le monde (kiné, patient, admin). C'est la référence : la langue suit la personne sur tous ses appareils.
- **Dans un cookie** (`NEXT_LOCALE`) : une copie rapide, lue à chaque page sans interroger la base. Elle sert aussi avant la connexion, sur l'accueil et l'inscription.
- À la connexion, le cookie est remis à jour depuis la base.

**Règle de sécurité (RLS) proposée, en clair :**
- *Lire* sa langue : déjà permis. La règle actuelle `app_users_select_own` laisse chaque personne lire **sa propre ligne et rien d'autre**. Aucune nouvelle règle.
- *Modifier* sa langue : **aucune règle ouverte à l'API**. Le changement passe par une petite fonction côté serveur, `internal.set_app_user_locale`, rangée dans le schéma `internal` que l'API ne montre jamais (même méthode que les autres, migration 0057). Le serveur vérifie d'abord qui est connecté (Clerk). La fonction ne peut écrire que `'fr'` ou `'en'`, et uniquement sur la ligne de cette personne.
- Pourquoi : `app_users` est la table qui relie un compte Clerk à son identifiant interne. Y ouvrir une règle d'écriture, même pour une seule colonne, ferait courir un risque inutile sur l'isolation entre comptes.

### b) Avec quoi : la bibliothèque **next-intl** (pas de dictionnaire maison)

- Elle marche dans les deux types de composants de l'app : serveur, et « client » (63 fichiers interactifs). Un dictionnaire maison devrait réinventer ça.
- Elle gère les pluriels (« 1 séance / 3 séances »), les dates et les montants selon la langue.
- Elle sait fonctionner **sans changer les adresses**.
- Ajouter l'allemand ou le néerlandais plus tard = ajouter un fichier `messages/de.json`, rien d'autre.
- Les textes iront dans `messages/fr.json` et `messages/en.json`, rangés par écran (`patient.compte…`, `dashboard.facturation…`).

### c) **Pas** de `/en/` dans les adresses

- Mettre la langue dans l'adresse obligerait à déplacer **tout** le dossier `app/` sous `app/[lang]/`. Ce gros déménagement risquerait d'abîmer les écrans téléphone, les liens Clerk et les liens de retour Stripe.
- L'app est derrière une connexion : la langue suit la personne, pas l'adresse.
- Seul inconvénient : Google ne référence pas une version anglaise séparée de la page d'accueil. On pourra ajouter plus tard une page d'accueil `/en` à part si la prospection en a besoin.

### d) Où on choisit / change la langue

- **Accueil et inscription** : un petit sélecteur « FR · EN » en haut de page (il règle le cookie). Le compte créé hérite de ce choix.
- **Patient** : dans `/patient/compte`, une ligne « Langue ».
- **Kiné** : dans `/dashboard/informations`, une ligne « Langue ».
- **Disposition des écrans téléphone : inchangée.** On remplace les mots, on ne touche pas aux mises en page. Un mot anglais plus long sera vérifié à 375 px et à 1262×549.

## 3. Étapes, chacune vérifiable dans le navigateur

1. **Mettre à jour CLAUDE.md** (§1 et §5), avec le texte proposé plus bas. Rien ne change dans l'app.
2. **Socle** : installer next-intl, créer `messages/fr.json` et `messages/en.json`, brancher la langue via le cookie. Clerk suit la langue. → *À vérifier : tout est identique en français.*
3. **Sélecteur sur l'accueil et l'inscription** + traduction de ces pages (hors textes juridiques). → *Cliquer « EN », l'accueil passe en anglais ; la connexion Clerk aussi.*
4. **Migration** de la colonne `locale` + réglage « Langue » côté patient et côté kiné. Elle est d'abord testée « à blanc » (transaction annulée), puis appliquée seulement après ton accord. → *Changer la langue, se déconnecter, se reconnecter : le choix est gardé.*
5. **App patient**, écran par écran : accueil, programme, séance, historique, messages, compte, assistant de démarrage.
6. **Tableau de bord kiné**, écran par écran : patients, fiche patient, séances, exercices, messages, facturation.
7. **Dates et montants** selon la langue (25 fichiers).
8. **Contenu des exercices en anglais** : nouvelle table de traductions (voir §5), brouillon anglais à faire relire.
9. **Démo `/demo`** et `/admin` (l'admin peut rester en français : c'est toi qui l'utilises).

Chaque étape fait l'objet d'un commit séparé. En français, rien ne doit changer pour quelqu'un qui ne touche pas au sélecteur.

## 4. À ne PAS traduire automatiquement sans relecture humaine

Ces textes seront marqués « traduction à relire » (repère `needsReview` dans les fichiers de langue et bandeau « version de travail » à l'écran) tant qu'un humain ne les a pas validés :

- **Juridique** : CGU, politique de confidentialité, mentions légales, consentement aux données de santé (assistant de démarrage). À faire relire par un juriste. Et attention : pour un patient en Belgique ou en Suisse, c'est le droit local qui s'applique, pas seulement une traduction.
- **Facturation** : libellés des notes d'honoraires, « hors nomenclature », référence à l'art. R.4321-98 CSP, acceptation écrite du prix. Ces mentions sont propres au droit français. En anglais, on garde la mention légale française et on ajoute une explication, sans « adapter » le droit.
- **Clinique** : consignes des exercices, noms des exercices et des pathologies, messages liés à la douleur (« frein de phase »). Relecture par le kiné partenaire, comme pour le français.
- **Messages automatiques envoyés au patient** (« Ajuster la séance ») : écrits dans la langue **du patient**, pas du kiné.

## 5. Contenu des exercices (en base)

- Nouvelle table `exercise_translations` (exercice, langue, nom, consignes), et la même chose pour pathologies et séances. Elle ne touche pas les tables existantes et marche pour n'importe quelle langue future.
- S'il n'existe pas de traduction, l'app affiche le français : rien ne casse.
- **RLS proposée** : lecture pour toute personne connectée (même règle que `exercises`, migration 0067), écriture uniquement par le serveur. Expliquée en détail avant application.
- Les exercices créés par un kiné restent dans la langue où il les a écrits.

## 6. Points d'attention

- **E-mails Clerk** (invitation patient, codes de vérification) : leur langue se règle dans le tableau de bord Clerk, pas dans le code. À vérifier avec toi.
- **Stripe Checkout** : on lui passera la langue du patient (`locale: 'en'`), une seule ligne.
- **Travail en cours** : la branche `site/nouveau-modele-tarifs` a beaucoup de fichiers modifiés non enregistrés (commit). La traduction touche presque tous les fichiers : il faut d'abord enregistrer ce travail, puis faire la traduction sur sa propre branche, pour ne rien écraser.

## 7. Texte proposé pour CLAUDE.md

**§1, remplacer le 2e paragraphe par :**

> The default interface language is French. Since 2026-11-06 (Philippe) the app is bilingual French / English, and is built to take more languages later: every user picks a language at signup and can change it anytime (patient: `/patient/compte`; kiné: `/dashboard/informations`). UI strings live in `messages/<locale>.json` and are read through next-intl (no locale in URLs; the choice is stored in `app_users.locale` and mirrored in the `NEXT_LOCALE` cookie). Never hard-code new UI text in a component — add it to `messages/fr.json` (and `en.json`). Legal texts (CGU, privacy, health-data consent), billing wording (« hors nomenclature », art. R.4321-98 CSP) and clinical content (exercise names/instructions, condition names) must never be machine-translated and shipped as final: they are flagged `needsReview` until a human (lawyer / partner kiné) validates them. France-specific logic (RPPS check, euro amounts, legal wording) still stays in the places it already lives (`lib/billing/*`, signup/approval code); per-country settings (BE/CH/LU/QC) remain future work.

**§5, remplacer la ligne « Multi-language support… » par :**

> - Languages beyond French and English (the structure is ready — add a `messages/<locale>.json` — but none is started), and per-country legal/billing settings (BE/CH/LU/QC).
