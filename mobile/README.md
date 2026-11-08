# EasyPhysio — appli iPhone et Android

L'appli affiche le site **easyphysio.fr** (les mêmes écrans téléphone, kiné et patient) dans une vraie appli, avec en plus :

- **Notifications** : nouveau message (kiné ⇄ patient) et rappel « votre séance du jour vous attend » (chaque jour à 18 h, heure d'hiver). Jamais le contenu d'un message ni un nom de patient sur l'écran verrouillé.
- **Face ID / empreinte** : verrouillage au lancement et après 5 minutes en arrière-plan (si le téléphone a Face ID ou une empreinte enregistrée).
- **Écran hors connexion** natif, avec « Réessayer ».
- **Liens qui ouvrent l'appli** : la connexion et les espaces kiné et patient. **Pas** le lien ni le QR code d'invitation du kiné : ils s'ouvrent toujours sur le site, car le patient s'inscrit et paie sur le site (jamais dans l'appli), puis télécharge l'appli et s'y connecte avec son compte.
- **Aucun paiement dans l'appli** (choix de Philippe, 2026-11-07) : le patient s'inscrit et paie sur le site ; dans l'appli, l'écran « Mon suivi » dit seulement si l'accès est actif, sans prix ni lien de paiement.

Tout changement du site arrive dans l'appli **sans nouvelle publication** sur les magasins. Une nouvelle version de l'appli n'est nécessaire que si on change ce dossier `mobile/`.

Outil : **Expo** (SDK 58), qui construit l'appli iPhone sur ses propres Mac, dans le cloud : pas besoin de Mac.

---

## Où on en est (2026-11-08)

| Étape | Qui | État |
|---|---|---|
| Code de l'appli (dossier `mobile/`) | Claude | ✅ fait ; vérifié le 2026-11-08 : 20/20 contrôles Expo, l'appli se compile pour iPhone et Android |
| Icône et écran de démarrage | Claude | ✅ redessinés en vecteur à partir du logo du site (`assets/`, source `store/icons/easyphysio-icon.svg`) |
| Textes des fiches, réponses confidentialité, notes pour les testeurs | Claude | ✅ `store/FICHE-MAGASINS.md` |
| Captures d'écran App Store et Google Play, image de présentation Google | Claude | ✅ `store/screenshots/` |
| 1. Créer la société (SIRET) | Philippe | ⏳ pas encore fait |
| 2. Numéro D-U-N-S (gratuit, dnb.com, avec le SIREN) | Philippe | ⏳ 1 à 4 semaines après le SIRET |
| 3. Compte **Apple Developer** en tant qu'**organisation** (99 $/an). Apple exige qu'une appli de santé soit publiée par une société, pas par un particulier (règle 5.1.1 ix). | Philippe | ⏳ ~1 semaine après le D-U-N-S |
| 4. Compte **Google Play Console** en tant qu'organisation (25 $ une fois). Un compte d'organisation évite les 14 jours de test obligatoires avec 12 testeurs. | Philippe | ⏳ quelques jours après le D-U-N-S |
| 5. Compte **Expo** gratuit (expo.dev) | Philippe | ⏳ 5 minutes, possible dès maintenant |
| 6. Adresse e-mail de contact + trous des textes légaux (`[SIREN]`, `[email de contact]`…), ajout de l'appli, de PostHog et d'Expo dans la politique de confidentialité | Philippe (+ relecture juriste) | ⏳ dès que la société existe ; brouillon dans `store/FICHE-MAGASINS.md` §7 |
| 7. Deux comptes de démonstration pour les testeurs (kiné + patient avec programme) | Philippe, depuis `/admin` | ⏳ 2 minutes, juste avant la soumission |

Sans attendre la société, avec un compte Expo, on peut déjà **essayer l'appli sur un téléphone Android** (commande « Essayer sur son téléphone » ci-dessous). Pour l'iPhone, il faut le compte Apple Developer.

## Les commandes, dans l'ordre (dans ce dossier `mobile/`)

```bash
npm install
npx eas-cli login
npx eas-cli init
```
`eas init` crée le projet chez Expo et ajoute son identifiant dans `app.json` (nécessaire aux notifications).

**Essayer sur son téléphone, avant les magasins :**
```bash
npx eas-cli build --profile preview --platform android
```
Expo envoie un lien : on installe l'appli sur un téléphone Android. Pour l'iPhone, il faut le compte Apple Developer ; la même commande avec `--platform ios` propose d'enregistrer l'iPhone de test.

**Version magasins :**
```bash
npx eas-cli build --profile production --platform all
npx eas-cli submit --platform ios
npx eas-cli submit --platform android
```

## Réglages sur le serveur (Scalingo), une fois les comptes créés

- `APPLE_TEAM_ID` : identifiant d'équipe Apple (10 caractères, page « Membership » du compte développeur).
- `ANDROID_CERT_SHA256` : empreinte SHA-256 du certificat de l'appli (Google Play Console → Intégrité de l'appli → Signature).
- `APP_STORE_URL` et `PLAY_STORE_URL` : adresses de l'appli dans les magasins, une fois publiée (ex. `https://apps.apple.com/fr/app/easyphysio/id1234567890`). Elles font apparaître l'écran « Votre programme est prêt — téléchargez l'appli » à la fin de l'inscription du patient sur le site (`/patient/appli`, seulement le bon magasin selon son téléphone) et la bannière « Ouvrir dans l'App Store » de Safari. **Redéployer** le site après les avoir renseignées.
- `EXPO_ACCESS_TOKEN` (facultatif) : jeton d'accès Expo, pour des envois de notifications signés.

Sans `APPLE_TEAM_ID` et `ANDROID_CERT_SHA256`, ces liens s'ouvrent simplement dans le navigateur.

## À préparer pour la validation Apple / Google

- **Deux comptes de démonstration** pour le testeur : un kiné et un patient avec un programme (créés depuis `/admin` → comptes de test, avec « accès gratuit »).
- **Fiche de confidentialité** (« App Privacy » chez Apple, « Sécurité des données » chez Google) : données de santé (programme, douleur, séances), coordonnées (nom, e-mail), liées à la personne, jamais utilisées pour de la publicité.
- **Déclaration « appli de santé »** chez Google, et dans la description : « EasyPhysio n'est pas un dispositif médical ; il ne pose pas de diagnostic et ne remplace pas votre kinésithérapeute ».
- **Suppression du compte** dans l'appli : patient (Paramètres → supprimer mon compte, immédiat), kiné (Mes informations → Supprimer mon compte : demande traitée sous 30 jours depuis `/admin`).
- Logo, captures d'écran et textes des fiches : prêts dans `store/` (voir `store/FICHE-MAGASINS.md`).

## Le risque connu

Parcours choisi (Philippe, 2026-11-07, « comme Netflix ») : le patient scanne le QR code du kiné, s'inscrit (et, si son kiné fait payer son suivi, accepte le prix et enregistre sa carte) **sur le site**, puis télécharge l'appli et s'y connecte. L'appli ne montre jamais de prix, de bouton « payer » ni de phrase « payez sur le site » ; un patient non activé lit seulement « votre kiné peut vous aider ».

Avec le modèle de facturation du 2026-11-01, il y a deux flux d'argent, tous les deux **hors de l'appli** :
- **Kiné → EasyPhysio** : abonnement à un outil professionnel, acheté sur le site. Règle Apple 3.1.3 (f) : une appli gratuite qui accompagne un outil web payant n'a pas besoin d'achat intégré, tant qu'elle ne pousse pas à acheter.
- **Patient → kiné** : honoraires du kiné pour son suivi (programme mensuel « hors nomenclature »), 0 % pour EasyPhysio. C'est le paiement d'un service rendu par un professionnel de santé, pas un contenu numérique vendu par EasyPhysio (règles 3.1.3 (d) et 3.1.5).

Le risque est plus faible qu'avec l'ancien modèle (accès patient payé à EasyPhysio), mais pas nul : un testeur peut estimer que l'accès patient est « débloqué » par un paiement fait ailleurs. Les arguments sont déjà dans les notes pour le testeur (`store/FICHE-MAGASINS.md` §6).

Second risque : Apple refuse parfois une appli qui « n'est qu'un site dans une appli » (règle 4.2). Nos réponses : notifications, Face ID, écran hors connexion, liens qui ouvrent l'appli, caméra pour filmer les exercices.

Si Apple refuse, dans l'ordre :
1. Répondre au testeur / faire appel avec ces arguments.
2. En France (Union européenne, loi DMA) : demander à Apple le droit d'afficher un lien vers le paiement sur le site (« External Purchase Link »), avec des frais réduits (à vérifier au moment de la demande).
3. En dernier recours : l'abonnement en achat intégré Apple (15 % pour les petites entreprises) ; les honoraires du kiné restent hors appli.

Google accepte une appli « connexion seule » sans paiement intégré.
