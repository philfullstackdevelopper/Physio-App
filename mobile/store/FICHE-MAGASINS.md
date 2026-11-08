# EasyPhysio — fiches App Store et Google Play (prêtes à copier-coller)

Préparé le 2026-11-08. Tout ce qui est ici se copie tel quel dans App Store Connect et dans la Google Play Console, une fois les comptes créés. Les éléments entre `[crochets]` dépendent de la société (pas encore créée) et sont à remplir par Philippe.

Images prêtes dans ce dossier :

| Fichier | Où il va |
|---|---|
| `icons/app-store-icon-1024.png` | App Store Connect (Expo l'envoie aussi automatiquement avec l'appli) |
| `icons/play-store-icon-512.png` | Google Play → Fiche principale → Icône |
| `icons/easyphysio-icon.svg` | Icône source en vecteur (redessinée à l'identique du logo du site) |
| `screenshots/app-store-6.9/*.png` (7 images, 1320 × 2868) | App Store → iPhone 6,9 pouces (Apple réduit lui-même pour les autres tailles) |
| `screenshots/google-play/*.png` (7 images, 1080 × 2160) | Google Play → Captures d'écran du téléphone |
| `screenshots/google-play/feature-graphic-1024x500.png` | Google Play → Image de présentation |

Les captures viennent de la démo publique (`/demo`), avec des patients fictifs. La démo n'est pas encore traduite : les captures sont en français, y compris pour la fiche anglaise (acceptable au lancement en France). Pour les refaire après un changement d'écran : demander à Claude « refais les captures des magasins ».

---

## 1. Réglages généraux

| Champ | Valeur |
|---|---|
| Nom de l'appli | **EasyPhysio** |
| Identifiant (iPhone et Android) | `fr.easyphysio.app` |
| Catégorie principale | **Médecine** (Apple : Medical ; Google : Médecine) |
| Catégorie secondaire (Apple) | Forme et santé (Health & Fitness) |
| Prix | Gratuite, sans achat intégré |
| Pays | France pour commencer (Belgique, Suisse, Luxembourg plus tard) |
| Langues de la fiche | Français (principale), anglais |
| iPad | Non (l'appli est réservée à l'iPhone) |
| Âge (questionnaire Apple) | Répondre « oui, peu fréquent » à « informations médicales ou de traitement » ; « non » à tout le reste → classement attendu **12+** (ou 4+ selon la grille du moment) |
| Âge (questionnaire Google, IARC) | Catégorie « Référence, actualités ou éducation » / santé ; aucune violence, aucun achat, communication entre utilisateurs **oui** (messagerie kiné ⇄ patient, non publique) |
| Chiffrement (export) | Seulement le HTTPS standard → « non » (déjà déclaré dans `app.json` : `usesNonExemptEncryption: false`) |
| URL de confidentialité | `https://easyphysio.fr/confidentialite` |
| URL d'assistance | `https://easyphysio.fr/mentions-legales` **à condition** qu'elle affiche une vraie adresse de contact (aujourd'hui : `[email de contact]`, voir §7) |
| URL marketing | `https://easyphysio.fr` |
| Droits d'auteur (Apple) | `2026 [Nom de la société]` |
| Contact de la fiche Google | `[adresse e-mail de la société]` (publique) |

---

## 2. App Store — fiche en français

**Sous-titre** (30 caractères max) :
```
Rééducation guidée par le kiné
```

**Texte promotionnel** (170 max, modifiable à tout moment sans nouvelle version) :
```
Vos exercices de rééducation, préparés par votre kiné, toujours dans votre poche : séance guidée, vidéos, suivi de la douleur et messages.
```

**Mots-clés** (100 max, séparés par des virgules, sans espace) :
```
kiné,kinésithérapie,rééducation,exercices,physiothérapie,programme,douleur,lombalgie,genou,épaule
```

**Description** :
```
EasyPhysio relie le patient et son kinésithérapeute entre les séances au cabinet.

POUR LES PATIENTS
• Votre programme du jour, préparé par votre kiné, dès l'ouverture de l'appli.
• Une séance guidée, exercice par exercice : dessin animé ou vidéo de démonstration, nombre de séries et de répétitions, consignes claires.
• Vous indiquez votre douleur à la fin de la séance : votre kiné la voit et adapte le programme si besoin.
• Vos progrès sur plusieurs semaines : séances réalisées, évolution de la douleur.
• Une messagerie directe avec votre kiné.
• Un rappel quotidien pour ne pas oublier votre séance.

POUR LES KINÉSITHÉRAPEUTES
• Tous vos patients au même endroit, avec ceux qui ont besoin de vous en premier : douleur signalée, séances oubliées, messages non lus.
• Une bibliothèque d'exercices illustrés et filmés, et des séances prêtes à l'emploi par pathologie.
• « Ajuster la séance » : ajoutez ou retirez un exercice pour un seul patient, en quelques secondes.
• Vos propres exercices, filmés avec votre téléphone.

VOS DONNÉES
• Les données de santé sont hébergées en France.
• Votre kiné est le seul professionnel à voir votre programme et vos résultats.
• Accès protégé par Face ID ou empreinte digitale.
• Vous pouvez exporter ou supprimer votre compte à tout moment, depuis l'appli.

L'accès patient se fait sur invitation de votre kinésithérapeute.

EasyPhysio n'est pas un dispositif médical : l'appli ne pose pas de diagnostic et ne remplace pas votre kinésithérapeute. En cas de douleur vive, arrêtez l'exercice et parlez-en à votre praticien.
```

**Nouveautés de cette version** :
```
Première version d'EasyPhysio sur iPhone.
```

## 3. App Store — fiche en anglais

**Subtitle**:
```
Rehab guided by your physio
```

**Promotional text**:
```
Your rehab exercises, prepared by your physiotherapist, always in your pocket: guided sessions, videos, pain tracking and messages.
```

**Keywords**:
```
physio,physiotherapy,rehab,exercises,home exercise,pain,back pain,knee,shoulder,recovery
```

**Description**:
```
EasyPhysio connects patients and their physiotherapist between clinic visits.

FOR PATIENTS
• Today's programme, prepared by your physio, as soon as you open the app.
• A guided session, one exercise at a time: animated drawing or demo video, sets and reps, clear instructions.
• Rate your pain at the end of each session: your physio sees it and adjusts the programme if needed.
• Your progress over several weeks: sessions completed, pain trend.
• Direct messaging with your physio.
• A daily reminder so you don't miss your session.

FOR PHYSIOTHERAPISTS
• All your patients in one place, with the ones who need you first: pain reported, missed sessions, unread messages.
• A library of illustrated and filmed exercises, and ready-made sessions by condition.
• "Adjust session": add or remove an exercise for one patient in seconds.
• Your own exercises, filmed with your phone.

YOUR DATA
• Health data is hosted in France.
• Your physio is the only professional who sees your programme and results.
• Access protected by Face ID or fingerprint.
• Export or delete your account at any time, from within the app.

Patient access is by invitation from your physiotherapist.

EasyPhysio is not a medical device: it does not diagnose and does not replace your physiotherapist. If you feel sharp pain, stop the exercise and talk to your practitioner.
```

## 4. Google Play — textes

**Description courte** (80 max) :
```
Vos exercices de rééducation, préparés et suivis par votre kiné.
```
English: `Your rehab exercises, prepared and followed by your physio.`

**Description complète** : la même que la description App Store (§2 et §3).

---

## 5. Confidentialité — réponses aux questionnaires

### Apple « App Privacy » (Confidentialité de l'app)

Pas de suivi publicitaire (« Tracking » : **non**). Données collectées :

| Type Apple | Exemple dans EasyPhysio | Lié à la personne | Usage |
|---|---|---|---|
| Health & Fitness → Health | programme, séances faites, douleur, réponses du questionnaire | Oui | Fonctionnement de l'appli |
| Contact Info → Name, Email Address | compte patient et kiné | Oui | Fonctionnement, gestion du compte |
| User Content → Other User Content (messages) | messagerie kiné ⇄ patient | Oui | Fonctionnement |
| User Content → Photos or Videos | vidéos d'exercices filmées par les kinés | Oui | Fonctionnement |
| Identifiers → Device ID | jeton de notification (pour envoyer les rappels) | Oui | Fonctionnement |
| Usage Data → Product Interaction | mesure d'audience anonyme, **espace kiné et site public seulement** (PostHog, sans cookie, jamais l'espace patient) | **Non** | Analyse |
| Diagnostics → Crash Data | erreurs du navigateur, mêmes pages | **Non** | Analyse |

Paiement : **non collecté par l'appli** (aucun paiement dans l'appli).

### Google « Sécurité des données »

- Données chiffrées en transit : **oui**.
- Possibilité de demander la suppression : **oui** — dans l'appli (patient : Paramètres → Supprimer mon compte ; kiné : Mes informations → Supprimer mon compte) et lien web : `https://easyphysio.fr/patient/compte` (patient) — Google demande une adresse web de suppression accessible sans l'appli : `[à confirmer : page ou adresse e-mail de suppression]`.
- Données partagées avec des tiers : **non** (les sous-traitants techniques ne comptent pas comme « partage » chez Google).
- Collectées : Santé et remise en forme (infos de santé, remise en forme), Infos personnelles (nom, e-mail), Messages (autres messages dans l'appli), Photos et vidéos (vidéos), Activité dans les applis (interactions, anonymes), Infos et performances de l'appli (journaux de plantage), Identifiants de l'appareil (jeton de notification).

### Google — déclaration « Applis de santé »

Cocher : « Gestion des soins / suivi par un professionnel de santé » et « Activité physique / exercice ». Préciser que l'appli **n'est pas** un dispositif médical réglementé. Google peut demander une preuve que l'éditeur est une organisation : c'est la raison du compte d'organisation (D-U-N-S).

---

## 6. Notes pour les testeurs Apple et Google (en anglais, c'est ce qu'ils lisent)

Champs « App Review Information » (Apple) et « Accès à l'appli » (Google) :

```
EasyPhysio is a companion app for physiotherapists (kinésithérapeutes) in France and their patients.

Demo accounts (both fully active, no payment needed):
- Physiotherapist: [kiné test e-mail] / [password]
- Patient (with an active exercise programme): [patient test e-mail] / [password]

How it works:
- A physiotherapist builds an exercise programme for each patient. The patient opens the app, follows a guided session (animated drawings and demo videos), rates their pain, and can message their physiotherapist.
- Patient accounts are created only by invitation from their physiotherapist; there is no public sign-up for patients.
- Native features: push notifications (new message, daily session reminder), Face ID / fingerprint lock (health data), offline screen, universal links.
- Account deletion is available in the app: Patient > Settings > Delete my account (immediate). Physiotherapist > My information > Delete my account.

Payments: the app contains no purchase, price, payment button or link to an external purchase. Physiotherapists subscribe to a professional web tool outside the app (guideline 3.1.3(f): free companion app to a paid web-based professional tool). When a physiotherapist charges their patient a fee for their own follow-up, that is a payment from patient to a licensed healthcare professional for their professional service, handled entirely outside the app; EasyPhysio takes no commission on it.

EasyPhysio is not a medical device and does not diagnose. Health data is hosted in France.

Contact: [name, phone, e-mail]
```

Les comptes de démonstration : les créer depuis `/admin` → comptes de test (kiné avec accès actif + patient avec un programme). Les mettre en français ou en anglais au choix ; le testeur Apple lit l'anglais, donc choisir **English** dans les réglages des deux comptes.

---

## 7. Ce qui bloque encore côté textes légaux (à faire avant la soumission)

Apple et Google ouvrent la page de confidentialité. Aujourd'hui `legal/politique-confidentialite.md` et `legal/mentions-legales.md` contiennent encore des trous : `[email de contact]`, `[adresse]`, `[SIREN/SIRET]`, `[montant]`, `[TVA]`. Ils se remplissent dès que la société existe.

À ajouter à la politique de confidentialité (brouillon, **à faire relire** — ce n'est pas un texte validé par un juriste) :

> **Appli mobile EasyPhysio.** L'appli iPhone et Android affiche les mêmes écrans que le site et ne stocke aucune donnée de santé sur le téléphone. Elle utilise :
> – les **notifications** : pour vous prévenir d'un nouveau message et vous rappeler votre séance du jour. Un identifiant technique de notification est enregistré avec votre compte ; les notifications passent par le service Expo (Expo, 650 Castro St, Mountain View, États-Unis), puis Apple ou Google. Elles ne contiennent jamais le contenu d'un message, un nom de patient ni une donnée de santé. Vous pouvez les couper dans les réglages du téléphone ;
> – **Face ID / l'empreinte** : la vérification se fait uniquement dans le téléphone ; EasyPhysio ne reçoit jamais votre visage ni votre empreinte ;
> – l'**appareil photo et le micro** (kinés seulement) : uniquement quand vous filmez un exercice pour votre bibliothèque.
>
> **Mesure d'audience.** Sur le site public et l'espace kiné uniquement (jamais l'espace patient), nous utilisons PostHog (serveurs dans l'Union européenne), sans cookie et sans identifier les visiteurs : nombre de pages vues et clics, avec le texte des écrans masqué, pour améliorer le service.

Et ajouter PostHog et Expo à `legal/sous-traitants.md`.
