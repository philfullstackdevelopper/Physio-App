# Politique de confidentialité — Physio-App

> **⚠️ BROUILLON — NE PAS PUBLIER EN L'ÉTAT.**
> Ce document est une base de travail rédigée pour accélérer une revue
> juridique, pas un document juridique validé. Les champs entre crochets
> `[...]` sont à compléter. À faire relire et valider par un avocat
> spécialisé en droit de la santé / RGPD avant toute publication ou avant
> d'inscrire un vrai patient.

_Dernière mise à jour : [date]_

## 1. Qui sommes-nous

[Raison sociale / nom du responsable de traitement], [forme juridique],
immatriculé sous le SIRET [SIRET], dont le siège est situé [adresse].
Contact : [email de contact], [adresse].

Physio-App est un outil mis à disposition des masseurs-kinésithérapeutes
pour le suivi d'exercices de leurs patients. Le kinésithérapeute reste le
professionnel de santé responsable du suivi clinique ; Physio-App est
l'éditeur de l'outil logiciel.

*(Point à trancher avec l'avocat : qui est responsable de traitement pour
les données du patient — Physio-App, le kinésithérapeute, ou les deux
conjointement ? La réponse détermine plusieurs sections ci-dessous.)*

## 2. Données que nous collectons

**Compte et identification** : nom, email, mot de passe (jamais stocké en
clair — voir section Sécurité).

**Données de santé du patient** (catégorie particulière au sens de
l'article 9 du RGPD) :
- Condition/pathologie déclarée, stade de récupération, historique de
  blessure
- Profil physique : âge, taille, poids, niveau d'activité
- Ressenti : douleur, difficulté perçue, notes libres par séance et par
  exercice
- Séances réalisées, adhérence au programme
- Documents médicaux éventuellement déposés (imagerie, comptes rendus)
- Messages échangés avec le kinésithérapeute

**Données de facturation** (patients et kinésithérapeutes abonnés) :
gérées par Stripe, voir section Sous-traitants — Physio-App ne stocke pas
les numéros de carte.

## 3. Pourquoi nous collectons ces données (base légale)

- **Consentement explicite** (art. 9.2.a RGPD) pour les données de santé —
  recueilli à l'inscription du patient, voir section 8.
- **Exécution du contrat** (art. 6.1.b) pour les données de compte et de
  facturation.
- **Intérêt légitime** (art. 6.1.f) pour les mesures de sécurité et la
  lutte contre la fraude.

## 4. Qui a accès à ces données

- **Le kinésithérapeute qui suit le patient** — jamais un autre
  kinésithérapeute, jamais un autre patient (isolation technique appliquée
  au niveau de la base de données, pas seulement de l'interface).
- **L'équipe technique de Physio-App**, en accès minimal et journalisé,
  pour la maintenance.
- **Nos sous-traitants techniques**, listés en section 6, qui n'ont accès
  qu'à ce qui est strictement nécessaire à leur prestation et n'utilisent
  jamais la donnée à d'autres fins.

Physio-App ne vend ni ne loue aucune donnée à des tiers.

## 5. Hébergement et sécurité

Les données de santé sont hébergées par un prestataire certifié
**Hébergeur de Données de Santé (HDS)**, conformément à l'article
L.1111-8 du Code de la santé publique. [Détail technique : Scalingo,
certificat HDS n°38436 — à confirmer que l'offre souscrite est bien dans
le périmètre certifié avant publication de cette section.]

Les mots de passe sont chiffrés (hash), jamais stockés en clair. L'accès
entre patients et entre kinésithérapeutes est isolé au niveau de la base
de données (Row-Level Security), pas seulement filtré côté interface.

## 6. Sous-traitants (destinataires de la donnée)

| Prestataire | Rôle | Donnée concernée | Localisation |
|---|---|---|---|
| [Scalingo] | Hébergement application + base de données | Toutes | France (UE) |
| [Outscale] | Stockage des documents médicaux | Documents patients | France (UE) |
| [prestataire emailing, ex. Brevo] | Envoi des emails d'invitation/réinitialisation | Email uniquement, pas de donnée de santé | UE |
| [Stripe] | Paiement des abonnements | Données de facturation | UE/US (clauses contractuelles types) |

*(Chaque ligne nécessite un contrat de sous-traitance (DPA) signé — voir
la liste de suivi séparée. Compléter ce tableau au fur et à mesure.)*

## 7. Durée de conservation

[À définir avec l'avocat — proposition de départ à valider :]
- Compte actif : conservation pendant toute la durée de la relation.
- Après suppression du compte ou [X mois] d'inactivité : suppression ou
  anonymisation des données de santé, sauf obligation légale de
  conservation plus longue.
- Documents médicaux : [durée à définir, potentiellement alignée sur les
  obligations de conservation des dossiers de santé].

## 8. Consentement

Lors de son inscription, le patient donne un consentement explicite et
spécifique au traitement de ses données de santé, distinct de
l'acceptation générale des CGU. Ce consentement est horodaté et peut être
retiré à tout moment (voir section 9), sans remettre en cause la licéité
du traitement effectué avant le retrait.

## 9. Vos droits

Conformément au RGPD, vous disposez des droits suivants sur vos données :
accès, rectification, effacement, limitation, portabilité, opposition, et
retrait du consentement à tout moment. Vous pouvez également définir des
directives sur le sort de vos données après votre décès.

Pour exercer ces droits : [email dédié], ou directement depuis votre
compte, section [à construire — voir la fonctionnalité d'export/suppression
en cours de développement].

Vous disposez également du droit d'introduire une réclamation auprès de la
CNIL (cnil.fr).

## 10. Intelligence artificielle

Physio-App n'utilise actuellement aucune intelligence artificielle
générative traitant vos données de santé personnelles. Si cette
fonctionnalité était activée à l'avenir, cette politique serait mise à
jour au préalable pour en détailler le fonctionnement et recueillir, le
cas échéant, un consentement spécifique.

## 11. Cookies

[À compléter selon ce qui est effectivement utilisé — cookies de session
d'authentification a minima, à documenter précisément.]

## 12. Contact

Pour toute question sur cette politique ou vos données : [email de
contact].
