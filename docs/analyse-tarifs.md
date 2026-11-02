# Analyse des tarifs — comparaison avec la concurrence

Recherche du 2026-11-02 (prix publics ; sources en bas). « non trouvé » = pas vérifiable.

## 1. Les concurrents

| Outil | Prix | Essai | Modèle | Le patient paie ? | Bibliothèque |
|---|---|---|---|---|---|
| **Andrew** | Lite 34,90 €/mois ; Coach 49,90 €/mois (« 19,90 € après remboursement FAMI ») ; −20 % à l'année | 15 jours, **carte demandée à l'inscription** ; parrainage 1 mois offert aux deux | Fixe par kiné, patients illimités | Oui avec Coach (frais de plateforme, % non publié) | « 75 h+ » de vidéo |
| **Fullphysio** | 25 €/mois ou 249 €/an (20,75 €/mois) | Offre gratuite limitée à 3 patients | Fixe | Non | 2 000 à 3 500 exercices |
| **Physitrack** | 18,99 $/mois par praticien | 2 semaines | Par praticien | Non (appli patient gratuite) | 18 000+ |
| **Wibbi** | 29 $ le 1er, 25 $ le 2e, 15 $ du 3e au 15e | gratuit (selon sites tiers) | Par praticien, dégressif | Non | 20 000+ |
| **Doctolib kiné** | 69 € TTC/mois (offre Facturation) | non trouvé | — | — | pas d'exercices à domicile confirmés |

## 2. Le modèle EasyPhysio aujourd'hui (main, 2026-11-02 au soir)

- **Kiné → EasyPhysio : gratuit.** L'abonnement kiné est arrêté (`KINE_SUBSCRIPTION_BILLING = false`, `lib/launchFlags.ts`). Les formules 1/3/6/12 mois, l'offre fondateur et les cabinets restent dans le code mais ne facturent personne.
- **Patient → kiné** : tarif libre du programme mensuel (0 € = gratuit, sinon 1 à 500 €, conseillé 20 €), prélevé seulement les mois où le kiné ajuste le programme.

### ⚠️ Incohérence à trancher
Le commit du 2 novembre dit « EasyPhysio se rémunère sur les formules payées par
les patients », **mais le code envoie 100 % du paiement patient au kiné** (aucune
commission Stripe, `lib/billing/followUp.ts`). En l'état, **EasyPhysio ne gagne
rien**. Deux façons de le corriger (décision de Philippe, pas faite ici) :
1. **Commission sur le paiement patient** (ex. 10-15 % via `application_fee_amount` de Stripe Connect). Simple, aligné avec « on gagne quand le kiné gagne ». Il faut alors retirer partout la mention « 0 % pour EasyPhysio » (accueil, FAQ, praticiens, CGU).
2. **Revenir à un abonnement kiné**, mais moins cher (voir §3).

## 3. Ce que dit la comparaison

1. **Un kiné gratuit est un vrai argument** face à Andrew (34,90 €) et Fullphysio (20,75 €) — tant que la bibliothèque est petite (63 vidéos), c'est même ce qui rend l'offre crédible.
2. **Si un abonnement kiné revient** : 39,99 €/mois est au-dessus d'Andrew Lite avec beaucoup moins de vidéos. Mettre en avant l'annuel (« dès 25-29 €/mois »), ou passer le mensuel à ~34,99 €.
3. **Carte à l'inscription + 1er mois offert** : c'est la norme (Andrew : 15 jours avec carte). Prévenir par e-mail avant le premier prélèvement.
4. **Parrainage** : Andrew et Fullphysio en ont un ; « 1 mois offert aux deux » est le standard.
5. **Points forts à mettre en avant** : vidéos filmées par un kiné partenaire et validées cliniquement, encaissement des patients intégré, hébergement en France (HDS).

## 4. Le paiement patient « hors nomenclature » — risques à faire valider

- Article R.4321-98 du CSP (cité dans des décisions de l'Ordre) : honoraires fixés « avec tact et mesure », réclamés seulement pour des **actes réellement effectués**, annoncés à l'avance, affichés sur tout site public.
  - Facturer seulement les mois où le kiné ajuste le programme va dans ce sens.
  - **Risque** : un ajustement trivial (un clic) pourrait être jugé « non réellement effectué » → définir un ajustement minimum.
- Un kiné conventionné ne peut facturer hors nomenclature que des actes **absents** de la NGAP ; savoir si un programme à distance asynchrone en est un : **non trouvé**.
- **Bloquer l'appli** d'un patient en rééducation remboursée tant qu'il n'a pas payé pourrait être vu comme un dépassement déguisé.
- **Recommandation : demander un avis écrit au CNOMK (ou à la FFMK) avant d'ouvrir les invitations patients.**

## Sources
- Andrew : https://www.andrewapp.com/
- Fullphysio : https://www.fullphysio.com/fr/tarifs
- Physitrack : https://www.physitrack.com/physitrack-pricing , https://support.physitrack.com/article/160-how-much-does-physitrack-cost-my-patients
- Wibbi : https://book.wibbi.com/jane-wibbi-pricing
- Medbridge : https://www.medbridge.com/pricing/business
- Doctolib kiné (source tierce) : https://tool-advisor.fr/metier/masseur-kinesitherapeute/
- Décision de l'Ordre citant R.4321-98 : https://jurisprudence.ordremk.fr/wp-content/uploads/2026/08/CDN-31-juillet-2026-n°023-2025.pdf
- Hors nomenclature : https://appines.fr/guide/emploi/kinesitherapeutes/liberal/hors-nomenclature
