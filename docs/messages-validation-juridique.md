# Messages pour la validation juridique du modèle (2026-10-24)

## 1. Ordre des MK — conseil départemental des Yvelines
Brouillon prêt dans Gmail (à cdo78@ordremk.fr). À relire puis envoyer soi-même.
Si le cabinet de référence n'est pas dans les Yvelines, changer le destinataire pour le conseil du bon département.

## 2. G_NIUS — formulaire https://gnius.esante.gouv.fr/fr/contact
Pas d'adresse e-mail : copier-coller dans le formulaire.

**Objet :** Question réglementaire — modèle économique d'une application de suivi kiné (honoraires, commission, dispositif médical)

**Message :**

Bonjour,

Je lance EasyPhysio (easyphysio.fr), une application qui permet aux masseurs-kinésithérapeutes de prescrire des programmes d'exercices à domicile et de suivre leurs patients à distance (séances réalisées, douleur, ajustement du programme). Données hébergées chez un hébergeur certifié HDS.

Modèle économique, avec deux paiements séparés :
- le kinésithérapeute paie EasyPhysio un forfait fixe de 3 € HT par patient actif et par mois (indépendant de ses honoraires) ;
- le patient paie directement son kinésithérapeute, sur le compte de celui-ci, un « bilan de suivi à distance » mensuel non remboursable (analyse des données, ajustement du programme, retour écrit), au tarif fixé par le kiné et accepté à l'avance, prélevé seulement le mois où le bilan est fait. EasyPhysio ne prend rien sur ces honoraires.

Mes questions :
1. Ce bilan asynchrone peut-il être facturé par le kiné comme acte non remboursable (art. R.4321-98 CSP) ? Existe-t-il un cadre de télésoin ou de télésurveillance applicable aux kinés pour ce type de suivi ?
2. Le forfait par patient actif payé par le kiné à la plateforme est-il compatible avec l'interdiction des commissions et du partage d'honoraires (art. R.4321-70 et R.4321-72 CSP) ?
3. Une application qui affiche et organise les exercices choisis par le kiné, sans recommandation automatique fondée sur une pathologie, reste-t-elle hors du champ des dispositifs médicaux ?
4. Vers quel interlocuteur ou quelle ressource me conseillez-vous de me tourner pour une validation ?

Merci d'avance,
Philippe — fondateur d'EasyPhysio — philippe78m@gmail.com

## 3. Avocat en droit de la santé
Trouver un avocat titulaire de la spécialisation « droit de la santé » sur https://www.avocat.fr (annuaire du Conseil national des barreaux).
Lui envoyer : le brief « EasyPhysio — Business model brief », les captures des pages du site (section « Et moi, comment je suis payé ? »), et les questions ci-dessus, plus :
- les mentions de la note d'honoraires (dont l'exonération de TVA, art. 261-4-1° CGI) ;
- les CGU / CGV kiné et la définition de « patient actif » ;
- le contrat de sous-traitance RGPD avec chaque kiné.

## 4. Modèle DÉFINITIF du 2026-11-04 — points à faire valider (remplace les modèles précédents)

Audit complet : `reports/Frais plateforme patient kiné légalité.md` (verdict pour ce montage : 🟠 défendable, non validé).

Le montage : le patient paie au plus 9,99 € par mois, en deux services distincts, deux vendeurs, deux paiements, deux factures.
- **Accès à la plateforme EasyPhysio, 3,99 € TTC / mois**, vendu et facturé par EasyPhysio (TVA 20 %), prélevé chaque mois d'accès, que le kiné intervienne ou non. 10 jours d'essai gratuit.
- **Programme du kiné, 6,00 € / mois**, vendu par le kiné, prélevé directement sur son compte Stripe, 0 % pour EasyPhysio, uniquement les mois où il met à jour le programme, après la mise à jour ; note d'honoraires à son nom.
- Aucune commission, aucun prélèvement d'EasyPhysio sur le paiement du kiné ; rien n'est versé au kiné par EasyPhysio.

Questions à poser (Ordre départemental + avocat en droit de la santé), dossier à joindre : CGU, schéma des deux paiements, justification du coût de l'accès (hébergement HDS, vidéos, support) :
1. Un frais d'accès à la plateforme payé par le patient à EasyPhysio, fixe, identique pour tous les kinés, facturé chaque mois d'accès et séparément des honoraires, peut-il être regardé comme un partage d'honoraires (L.4113-5 via L.4321-19, R.4321-72 CSP) ?
2. Ce frais étant obligatoire pour accéder au suivi du kiné, pose-t-il un problème au regard du décret du 29/02/2024 (frais de service des plateformes de téléconsultation), de la proposition de loi n° 3232 (oct. 2026) ou du référentiel éthique de l'ANS (« choisi et non imposé ») ?
3. La mise à jour asynchrone d'un programme d'exercices par le kiné (sans visio) peut-elle donner lieu à honoraires au regard de R.4321-98 (« par correspondance… sous réserve du télésoin ») ? À quelles conditions (première séance en présentiel, bilan, visio) ?
4. Un prix de 6,00 € fixé par la plateforme pour tous les kinés est-il compatible avec la liberté et le « tact et mesure » des honoraires (R.4321-98) ? Faut-il laisser le kiné fixer son prix ?
5. La carte enregistrée obligatoire est-elle compatible avec « aucun mode particulier de règlement ne peut être imposé » (R.4321-98) ? Faut-il proposer une alternative (paiement au cabinet) ?
6. Les honoraires sont prélevés après la mise à jour du mois, jamais à l'avance : cela écarte-t-il l'interdiction du forfait et de la provision ?
7. Essai gratuit de 10 jours avec carte enregistrée : obligations d'information (date du premier prélèvement, rappel avant la fin, résiliation en 3 clics) — notre parcours est-il suffisant ?
8. Comptabilité / TVA : facturation de l'accès (TVA 20 %) et des honoraires (exonérés) sur deux documents distincts ; numérotation des notes d'honoraires générées par la plateforme au nom du kiné.
