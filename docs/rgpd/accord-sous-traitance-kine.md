# Accord de sous-traitance de données personnelles (article 28 RGPD) — Kinésithérapeute / EasyPhysio

> **BROUILLON rédigé par Claude — à faire valider par un juriste (Stanislas de Saint-Romain) avant usage. Rien ici n'est validé.**

_Destiné à être annexé aux CGU kiné et accepté à l'inscription (case à cocher distincte, horodatée — [à construire : aucune date d'acceptation des CGU kiné n'est enregistrée aujourd'hui dans la table `instructors`]). Suppose que le juriste confirme qu'EasyPhysio est **sous-traitant** du kiné pour le suivi de soin (README question 1). Si une responsabilité conjointe est retenue pour une partie, il faudra un accord art. 26 à la place ou en plus._

---

**Entre**

le masseur-kinésithérapeute utilisateur de la plateforme, identifié par son compte EasyPhysio (nom, adresse du cabinet, RPPS le cas échéant), ci-après **« le Responsable »** ;

**et**

[à compléter : raison sociale], [forme juridique], SIRET [à compléter], siège [à compléter], éditeur de la plateforme EasyPhysio, ci-après **« le Sous-traitant »**.

## 1. Objet

Le présent accord fixe les conditions dans lesquelles le Sous-traitant traite, pour le compte du Responsable, les données personnelles de ses patients via la plateforme EasyPhysio, conformément à l'article 28 du RGPD.

## 2. Description du traitement confié

| | |
|---|---|
| Nature des opérations | Hébergement (via un hébergeur certifié HDS, art. 5), enregistrement, consultation, mise à disposition, modification, effacement ; envoi d'invitations et de notifications ; prélèvement des honoraires du Responsable sur son compte Stripe et production de ses notes d'honoraires. |
| Finalités | Suivi à distance des programmes d'exercices prescrits par le Responsable ; messagerie Responsable ⇄ patient ; facturation des honoraires du Responsable. |
| Personnes concernées | Patients du Responsable. |
| Données | Identité (nom, e-mail) ; données de santé : pathologie, phase de rééducation, zones du corps, histoire de la blessure, date de naissance, taille, poids, niveau d'activité, matériel disponible, séances recommandées et réalisées, douleur, difficulté, exercices passés et leur raison, notes, messages ; données d'honoraires (tarif accepté, mois facturés, statut de paiement, numéros de notes). |
| Durée | Durée d'utilisation de la plateforme par le Responsable, puis art. 11. |

Les traitements que le Sous-traitant réalise **pour son propre compte** (abonnement d'accès vendu au patient, mesure d'audience, sécurité, compte du Responsable lui-même) ne relèvent pas du présent accord ; ils sont décrits dans la politique de confidentialité d'EasyPhysio.

## 3. Obligations du Sous-traitant

Le Sous-traitant s'engage à :
1. traiter les données **uniquement** pour les finalités ci-dessus et sur instruction documentée du Responsable ; les fonctionnalités de la plateforme et les actions du Responsable dans son tableau de bord valent instructions. Il informe le Responsable s'il estime qu'une instruction viole le RGPD ;
2. ne **jamais** utiliser les données de santé des patients à d'autres fins (ni publicité, ni revente, ni entraînement ou utilisation d'une intelligence artificielle, ni statistiques commerciales). Exception, à valider : des statistiques **agrégées et anonymes** de fonctionnement [à décider] ;
3. garantir la **confidentialité** : seules les personnes habilitées (à ce jour : le dirigeant [à compléter]) peuvent accéder aux données, dans la stricte mesure nécessaire (maintenance, support à la demande du Responsable, facturation), et sont soumises à une obligation de confidentialité ;
4. mettre en œuvre les **mesures de sécurité** de l'art. 6 ;
5. respecter les conditions de recours aux **sous-traitants ultérieurs** (art. 9 et 10) ;
6. **aider le Responsable** à répondre aux demandes d'exercice des droits des patients (art. 7), à garantir la sécurité, à notifier les violations (art. 8) et à réaliser une analyse d'impact (le Sous-traitant met à disposition son AIPD) ;
7. tenir le **registre** des catégories de traitements effectués pour le compte du Responsable (art. 30-2) ;
8. mettre à disposition les informations nécessaires pour démontrer le respect de ces obligations et permettre des **audits** (art. 12).

## 4. Obligations du Responsable

Le Responsable :
1. choisit la base légale du traitement et informe ses patients [à compléter selon la décision du juriste : modèle de note d'information fourni par EasyPhysio] ;
2. ne saisit dans la plateforme que des données nécessaires au suivi, vérifie l'adresse e-mail avant d'inviter un patient, et n'invite un mineur que [à compléter] ;
3. protège ses identifiants de connexion et active la double authentification [quand disponible] ;
4. ne filme jamais un patient pour un exercice et ne met en ligne une vidéo qu'avec l'accord de la personne filmée ;
5. reste responsable du contenu clinique du programme et de la conservation de son dossier patient hors plateforme.

## 5. Hébergement des données de santé

1. Les données de santé sont hébergées en France chez **Scalingo SAS**, hébergeur certifié HDS (certificat n° 38436, valable jusqu'au 11/09/2028), région `osc-secnum-fr1`, conformément à l'article L.1111-8 du Code de la santé publique.
2. **[À supprimer avant signature si la bascule est faite]** Avant l'ouverture aux patients, la plateforme fonctionne dans une région Scalingo **non certifiée HDS** (`osc-fr1`) ; aucune donnée de patient réel n'y est traitée et les invitations patients sont fermées.
3. Les données de santé ne sont pas stockées en dehors de l'hébergeur certifié. Les prestataires listés à l'art. 10 ne reçoivent aucune donnée de santé au sens strict, sous réserve de la position du juriste sur l'identité des patients et les paiements (README question 3).
4. [À compléter : périmètre des activités HDS (1 à 6) couvertes par le certificat pour l'offre souscrite, et position sur l'activité 5 « administration et exploitation » exercée par EasyPhysio (README question 4).]

## 6. Sécurité

Mesures techniques et organisationnelles minimales (détail : `registre-des-traitements.md` §C) :
- isolation des données par la base elle-même (Row-Level Security forcée) : un kiné ne voit que ses patients, un patient que sa fiche ; un kiné suspendu n'a plus accès ;
- aucune clé d'accès global exposée ; opérations serveur limitées à des fonctions dédiées non exposées ;
- chiffrement des échanges (HTTPS) ; [à compléter : chiffrement au repos de la base et des sauvegardes, selon l'offre Scalingo] ;
- mots de passe gérés par le prestataire d'authentification, jamais stockés par EasyPhysio ; [double authentification : à venir] ;
- sauvegardes : [à compléter : fréquence, durée, lieu, tests de restauration] ;
- journaux : [à compléter : durée] ;
- verrouillage biométrique de l'appli mobile ; notifications sans contenu ni nom ;
- pas d'outil de mesure d'audience dans l'espace patient.

## 7. Droits des patients

Le patient peut, depuis son compte, **télécharger** ses données (JSON) et **supprimer** son compte. Pour toute autre demande (rectification de l'e-mail, opposition, limitation, retrait du consentement), le Sous-traitant transmet au Responsable, **sous [5] jours ouvrés**, toute demande reçue directement, et l'aide à y répondre dans le délai légal d'un mois.

## 8. Violation de données

1. Le Sous-traitant notifie au Responsable toute violation de données personnelles **dans les meilleurs délais et au plus tard 48 heures** après en avoir pris connaissance [délai à valider], par e-mail à l'adresse du compte, afin de permettre au Responsable de notifier la CNIL dans les 72 heures (art. 33) et, le cas échéant, d'informer les patients (art. 34).
2. La notification contient au minimum : nature de la violation, catégories et nombre approximatif de patients et d'enregistrements concernés, conséquences probables, mesures prises ou proposées, contact.
3. Si toutes les informations ne sont pas disponibles, elles sont transmises par étapes.
4. [À décider : le Sous-traitant peut-il, sur mandat du Responsable, notifier lui-même la CNIL ? Cela simplifierait la vie des kinés pour une violation touchant la plateforme entière.]

## 9. Sous-traitants ultérieurs — autorisation générale

1. Le Responsable autorise le recours aux sous-traitants ultérieurs listés à l'art. 10.
2. Le Sous-traitant informe le Responsable de tout ajout ou remplacement **au moins [30] jours** à l'avance (e-mail + bandeau dans le tableau de bord) ; le Responsable peut s'y opposer pour un motif légitime, et à défaut d'accord, résilier sans frais.
3. Chaque sous-traitant ultérieur est lié par un contrat imposant les mêmes obligations ; le Sous-traitant reste responsable de leur exécution.

## 10. Liste des sous-traitants ultérieurs (au 2026-11-08)

| Sous-traitant | Service | Données du Responsable concernées | Pays | Garanties |
|---|---|---|---|---|
| Scalingo SAS | Hébergement de l'application et de la base de données | Toutes, y compris santé | France | Certificat HDS n° 38436 (région `osc-secnum-fr1`, après bascule) ; DPA Scalingo [à signer] |
| Clerk Inc. | Authentification, comptes, e-mails d'invitation et de réinitialisation | Nom et e-mail du patient, identifiants de connexion, journaux de connexion (IP, appareil). Plus de rôle ni de nom du kiné. | USA | DPF UE-USA [à vérifier] + clauses contractuelles types ; DPA Clerk [à signer] |
| Stripe (Stripe Payments Europe Ltd, Irlande, et Stripe Inc.) | Prélèvement des honoraires sur le compte Stripe Connect du Responsable | Nom, e-mail, carte (chez Stripe seulement), montants, libellé « Programme mensuel hors nomenclature » | Irlande + USA | DPF + clauses types ; DPA Stripe. Le Responsable a aussi un contrat direct avec Stripe (compte Connect) — [à clarifier : qui est sous-traitant de qui pour ce flux] |
| Expo (650 Industries Inc.), puis Apple (APNs) et Google (FCM) | Acheminement des notifications de l'appli mobile | Jeton du téléphone, texte générique (« Nouveau message de votre kiné. », rappel de séance), lien contenant l'identifiant interne du patient pour les notifications au kiné | USA | [à vérifier : DPA Expo, DPF] |
| Cloudflare Inc. (R2) | Stockage des vidéos d'exercices créées par le Responsable | Vidéo d'une personne filmée (jamais le patient) ; aucun lien avec un patient dans le stockage | [à vérifier : localisation du bucket] | DPF + clauses types ; DPA Cloudflare [à vérifier] |

**Ne sont pas sous-traitants pour les données des patients** : PostHog (mesure d'audience — jamais dans l'espace patient ; dans l'espace kiné, adresses réduites à « :id » et textes masqués), Gmail (prospection), l'API Annuaire santé (vérification du RPPS du kiné seulement).

## 11. Fin du contrat : restitution et suppression

1. À la fin de l'utilisation (résiliation, suppression du compte du Responsable), le Sous-traitant, au choix du Responsable :
   a. **restitue** les données de ses patients dans un format lisible et réutilisable [à construire : il n'existe pas aujourd'hui d'export global pour le kiné, seulement l'export individuel du patient], puis
   b. les **supprime**, y compris dans les comptes Clerk des patients et les jetons de notification, dans un délai de [30] jours, et dans les sauvegardes au terme de leur cycle de rotation ([à compléter] jours).
2. Les patients sont prévenus [à compléter : par qui, avec quel délai] et peuvent exporter leurs données avant suppression.
3. Exception : les pièces que la loi oblige à conserver (notes d'honoraires, factures) sont conservées [à compléter : par qui et combien de temps — aujourd'hui, la suppression d'un patient efface ses notes d'honoraires].
4. Le Sous-traitant fournit sur demande une attestation écrite de suppression.

## 12. Audits

Le Sous-traitant met à disposition du Responsable, sur demande écrite : le présent accord, son registre (art. 30-2), la synthèse de son AIPD, les certificats et DPA de ses sous-traitants ultérieurs. Un audit sur place ou documentaire peut être mené par le Responsable ou un auditeur indépendant tenu au secret, [une fois par an], avec un préavis de [30] jours, à la charge du Responsable, sans accès aux données des patients des autres kinés.

## 13. Responsabilité, durée, droit applicable

[À compléter par le juriste : responsabilité, durée identique aux CGU, droit français, juridiction.]
