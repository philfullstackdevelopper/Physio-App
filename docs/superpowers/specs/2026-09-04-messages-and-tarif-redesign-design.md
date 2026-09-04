# Messages et Tarif & paiements — refonte d'après les maquettes du 4 septembre 2026

Source : deux maquettes ChatGPT téléchargées le 2026-09-04 (11:48 Messages, 11:43 Tarif et paiements).
Hors périmètre : les trois maquettes de page d'accueil du même jour (témoignages, trois étapes, tableau comparatif).

## Modèle économique (confirmé par Philippe le 2026-09-04)

Le patient paie au kiné un tarif mensuel fixe que le kiné choisit (via Stripe Connect, l'argent arrive sur le compte Stripe du kiné). Le kiné paie à EasyPhysio 15 % de ce tarif par patient inscrit. C'est ce que `lib/billing/platformFee.ts` implémente déjà ; la page Tarif reprend ce vocabulaire tel quel.

---

## 1. Page Messages (`/dashboard/messages`)

### Mise en page
- En-tête : titre « Messages », sous-titre « Vos échanges avec chaque patient. », à droite un champ « Rechercher un patient… ».
- Deux cartes côte à côte (`lg:grid-cols-[360px_1fr]`), hauteur plein écran (`h-[calc(100vh-…)]`), chacune avec défilement interne. Mobile : une seule colonne, la liste puis le fil.
- Carte gauche : barre d'onglets **Tous / Non lus / Avec suivi** + bouton « nouveau message » (icône `SquarePen`), puis la liste des conversations (avatar initiales, nom, aperçu, heure/jour relatif, pastille non-lus, icône `Bookmark` si suivi).
- Carte droite : en-tête (avatar, nom, `condition · phase`, lien « Voir la fiche »), fil de messages avec séparateurs de jour, zone de saisie en bas (textarea, « Joindre un fichier », « Ajouter un suivi » / « Retirer le suivi », bouton envoyer rond).

### Fonctionnalités
| Élément | Comportement |
|---|---|
| Onglets | Filtre côté client. Non lus = `unread > 0`. Avec suivi = `followUp === true`. Onglet persistant dans l'URL (`?tab=`). |
| Recherche | Filtre côté client sur le nom (insensible aux accents/casse). |
| Nouveau message | Ouvre un menu listant les patients sans aucun message ; choisir un patient sélectionne sa conversation vide. |
| Condition · phase | `conditions.name` + `STAGE_SHORT[injury_stage]` via les tables déjà lues par `patientRows`. |
| Séparateurs de jour | « Aujourd'hui », « Hier », sinon date longue fr-FR. Logique pure `groupByDay` testée. |
| Accusés de lecture | Sur mes messages : `Check` simple = envoyé, `CheckCheck` = `read_at` non nul (colonne existante, posée par le patient). |
| Ajouter un suivi | Bascule `patients.follow_up_at` (null ↔ now()). Action serveur `toggleFollowUp`. RLS existante : le kiné peut mettre à jour ses patients. |
| Joindre un fichier | Bucket privé `message-attachments`, chemin `<patient_id>/<uuid>-<nom>`. Colonnes `patient_messages.attachment_path`, `attachment_name`. Upload direct client (comme `DocumentUpload`), puis action serveur qui insère le message avec le chemin. Taille max 20 Mo. Un message peut n'avoir qu'une pièce jointe et un corps vide. Côté patient : lien signé 1 h. |
| Envoyer | Action existante `sendInboxMessage`, étendue aux pièces jointes. Corps ou pièce jointe obligatoire. |

### Base de données — migration `0045_messages_follow_up_and_attachments.sql`
```sql
alter table public.patients add column if not exists follow_up_at timestamptz;
alter table public.patient_messages
  add column if not exists attachment_path text,
  add column if not exists attachment_name text;
-- bucket privé + RLS : le patient et son kiné lisent/écrivent sous <patient_id>/ ;
-- même schéma que patient-documents (0006) avec en plus l'insert par le kiné.
```
Le trigger de 0039 (`patient_messages_guard_read_marker_only`) doit aussi interdire la modification de `attachment_path` / `attachment_name` : le recréer avec ces deux colonnes.

### Côté patient (`/patient`)
Afficher la pièce jointe (icône + nom, lien signé) sur les messages qui en ont une, et permettre au patient d'en joindre une. Pas d'autre changement.

---

## 2. Page Tarif et paiements (`/dashboard/facturation`)

Retokenisée sur la palette de l'app (DESIGN.md autorise dès que le contenu change). Barre latérale inchangée : une seule entrée « Tarif & paiements » (le doublon « Paiements » de la maquette est un artefact).

### Mise en page
- Titre + sous-titre « Définissez votre tarif mensuel et activez les paiements pour encaisser vos patients en toute simplicité. »
- Grille deux colonnes (`lg:grid-cols-[1fr_1fr]`), puis une carte pleine largeur, puis une ligne d'aide.

### Carte 1 — Votre tarif par patient
- Champ « Tarif mensuel par patient » avec suffixe €, bouton « Enregistrer » (action existante `setPatientPrice`).
- Note info : « Vos patients actifs vous coûtent 15 % de ce tarif, au prorata du nombre de jours du mois. »
- **Simulateur** (`components/FeeSimulator.tsx`, client) : « Votre coût estimé en fin de mois », stepper « Patients abonnés (mensuel) » (min 0, défaut 10), anneau SVG commission/reste, trois lignes : Tarif total (n × tarif), Votre commission (15 %), Vous recevez. Calcul pur `estimateMonth(priceCents, patients)` dans `lib/billing/platformFee.ts`, testé. Le simulateur suit la valeur du champ tarif en direct (pas seulement la valeur enregistrée). Si aucun tarif : anneau vide et « Indiquez un tarif pour voir l'estimation ».

### Carte 2 — Encaisser vos patients
- Trois lignes icône + titre + texte : Paiement 100 % sécurisé (Stripe) ; L'argent vous appartient ; EasyPhysio n'y touche jamais.
- Carte d'état : `active` → verte « Paiements activés — Vos patients peuvent payer leurs abonnements en ligne. » ; `onboarding` → orange « Inscription en cours » ; sinon neutre « Paiements non activés ».
- Bouton : `active` → « Gérer mon compte Stripe » (lien externe `https://dashboard.stripe.com/`, comptes Standard) ; sinon bouton existant « Activer les paiements » / « Reprendre l'inscription ».

### Carte 3 — Comment ça fonctionne ?
Quatre étapes avec flèches : Le patient s'abonne en ligne → Le paiement est sécurisé par Stripe → L'argent arrive sur votre compte → Vous ne payez que 15 % de commission. Pas d'illustration décorative.

### Aide
« Besoin d'aide ? Consultez notre guide d'activation ou contactez-nous. » — guide → `/#faq`, contact → `mailto:` existant du site.

---

## Tests
- `lib/dashboard/conversations.test.ts` : `followUp`, `conditionLabel`, filtre onglets/recherche (`filterConversations`).
- `lib/dashboard/messageDays.test.ts` : `groupByDay`.
- `lib/billing/platformFee.test.ts` : `estimateMonth`.
- `npm test`, `npx tsc --noEmit`, `npm run lint` verts. Vérification navigateur des deux pages.
