# Lancement public d'EasyPhysio — ce qu'il reste, et qui le fait

*État au 2026-10-31.* « Philippe » = ce que seul Philippe peut faire (compte, paiement, signature, identité, avis juridique). « Claude » = ce que Claude fait ensuite, avec l'accord de Philippe pour tout ce qui touche au site en ligne.

> **Règle bloquante :** aucun vrai patient tant que l'hébergement n'est pas certifié HDS (art. L.1111-8 du code de la santé publique). Les inscriptions et invitations restent fermées (`lib/launchFlags.ts`) jusqu'à l'étape 4.

## 1. Juridique (avant tout)
| Étape | Qui |
|---|---|
| Avis de l'Ordre / d'un avocat en droit de la santé sur le modèle (paiement du patient à l'inscription, 3 € liés au paiement, prépaiement) — `docs/messages-validation-juridique.md` | Philippe |
| Appel avec Stanislas de Saint-Romain (élu Ordre Gironde, droit de la santé) | Philippe |
| Société : raison sociale, forme, SIRET, adresse, TVA, directeur de publication — **encore « [à compléter] » dans les mentions légales et les CGU** | Philippe fournit → Claude complète |
| Question « dispositif médical » (règlement européen, règle 11) à poser au juriste | Philippe |
| Assurance responsabilité civile professionnelle (éditeur de logiciel santé) | Philippe |

## 2. Contenu
| Étape | Qui |
|---|---|
| Relecture par Jules des consignes, du matériel et des dessins (banque de 292 + 13 exercices) | Jules |
| Vidéos : version légère prête (`scripts/videos-preparer.mjs`), envoi et liaison (`scripts/videos-envoyer.mjs`) | Claude, dès que le stockage Outscale existe |
| 2 exercices de step filmés sans dessin validé | Philippe valide → Claude |

## 3. Comptes et paiements
| Étape | Qui |
|---|---|
| Compte **Outscale** + clés d'accès (`docs/outscale-mise-en-place.md`) | Philippe |
| Préparation du stockage, puis activation sur le site | Claude |
| **Stripe en mode réel** : vérification d'identité, coordonnées bancaires, activation de Connect | Philippe |
| Webhooks Stripe et prélèvement SEPA (script `scripts/configurer-stripe.mjs`) en mode réel | Claude, avec les clés réelles mises par Philippe dans Scalingo |

## 4. Hébergement certifié santé (HDS)
| Étape | Qui |
|---|---|
| Demande à Scalingo d'ouvrir la région certifiée **osc-secnum-fr1** + contrat HDS (offre payante) | Philippe |
| Créer l'application, la base de données et PostgREST dans cette région, copier les données, basculer les variables | Claude, avec Philippe connecté à Scalingo |
| Test complet (kiné, patient, paiement, facture) dans la nouvelle région | Claude |

## 5. Connexion des utilisateurs (Clerk)
| Étape | Qui |
|---|---|
| Passer Clerk en « production » pour easyphysio.fr (dans le tableau de bord Clerk) | Philippe |
| Ajouter chez OVH les enregistrements DNS que Clerk demande | Philippe (Claude prépare la liste) |
| Mettre les nouvelles clés Clerk dans Scalingo, redéployer, tester | Claude |

## 6. Ouverture
| Étape | Qui |
|---|---|
| Ouvrir les inscriptions et les invitations (`SIGNUPS_OPEN`, `PATIENT_INVITATIONS_OPEN` = true) | Claude, sur le feu vert de Philippe une fois 1 à 5 terminés |
| Écrire à la liste d'attente | Philippe |
| Migration 0063 (verrouillage de sécurité de la base) : décision | Philippe |
