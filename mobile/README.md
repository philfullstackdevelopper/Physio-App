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

## Ce qu'il faut avant de publier

| Étape | Qui | Délai |
|---|---|---|
| 1. SIRET de la société | Philippe | — |
| 2. Numéro D-U-N-S (gratuit, dnb.com) | Philippe | 1 à 4 semaines |
| 3. Compte **Apple Developer** en tant qu'**organisation** (99 $/an). Apple exige qu'une appli de santé soit publiée par une société, pas par un particulier (règle 5.1.1 ix). | Philippe | ~1 semaine |
| 4. Compte **Google Play Console** en tant qu'organisation (25 $ une fois). Un compte d'organisation évite les 14 jours de test obligatoires avec 12 testeurs. | Philippe | quelques jours |
| 5. Compte **Expo** gratuit (expo.dev) | Philippe | 5 min |

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
- Logo et captures d'écran : à faire (les images de `assets/` sont celles d'Expo, provisoires).

## Le risque connu

Parcours choisi (Philippe, 2026-11-07, « comme Netflix ») : le patient scanne le QR code du kiné, s'inscrit et paie **sur le site**, puis télécharge l'appli et s'y connecte. L'appli ne montre jamais de prix, de bouton « payer » ni de phrase « payez sur le site » (Apple l'interdit, hors cas ci-dessous) ; un patient non activé lit seulement « votre kiné peut vous aider ».

Les 6 € du kiné ne posent pas de problème (prestation d'un professionnel de santé, règle 3.1.3 d). **L'accès à 2,99–6,99 € est le point délicat** : Apple demande qu'un abonnement acheté sur le site soit aussi proposé en achat intégré (règle 3.1.3 b). C'est souvent toléré pour une appli de connexion sans aucune mention de paiement, sans garantie. Dans les notes pour le testeur : comptes de démonstration déjà actifs, inscription uniquement sur invitation du kiné, honoraires du kiné payés au kiné.

Si Apple refuse, dans l'ordre :
1. Faire appel avec ces arguments.
2. En France (Union européenne, loi DMA) : demander à Apple le droit d'afficher un lien vers le paiement sur le site (« External Purchase Link »), avec des frais réduits (à vérifier au moment de la demande).
3. En dernier recours : l'accès en achat intégré Apple (15 % pour les petites entreprises), sur la seule part EasyPhysio ; les 6 € du kiné restent hors appli.

Google accepte une appli « connexion seule » sans paiement intégré.
