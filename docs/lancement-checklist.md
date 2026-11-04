# Lancement public d'EasyPhysio — ce qu'il reste, et qui le fait

*État au 2026-11-04.* « Philippe » = ce que seul Philippe peut faire (compte, paiement, signature, identité, avis juridique). « Claude » = ce que Claude fait ensuite, avec l'accord de Philippe pour tout ce qui touche au site en ligne.

> **Règle bloquante :** aucun vrai patient tant que l'hébergement n'est pas certifié HDS (art. L.1111-8 du code de la santé publique). Les inscriptions et invitations restent fermées (`lib/launchFlags.ts`) jusqu'à l'étape 4.

## 1. Juridique (avant tout)
| Étape | Qui |
|---|---|
| Modèle aligné sur Andrew depuis le 2026-11-01 (abonnement fixe du kiné, 0 % sur les honoraires, prélèvement seulement le mois où le programme est ajusté) : plus de question de commission. Un seul point diffère d'Andrew : au-dessus de 0 €, le patient accepte le tarif avant d'accéder à l'appli (Andrew laisse l'appli gratuite). À évoquer si l'occasion se présente. | Philippe |
| Appel avec Stanislas de Saint-Romain (élu Ordre Gironde, droit de la santé) | Philippe |
| Société : raison sociale, forme, SIRET, adresse, TVA, directeur de publication — **encore « [à compléter] » dans les mentions légales et les CGU** | Philippe fournit → Claude complète |
| Question « dispositif médical » (règlement européen, règle 11) à poser au juriste | Philippe |
| Assurance responsabilité civile professionnelle (éditeur de logiciel santé) | Philippe |

## 2. Contenu
| Étape | Qui |
|---|---|
| Relecture par Jules des consignes, du matériel et des dessins (banque de 292 + 13 exercices) | Jules |
| Vidéos : fait le 2026-10-31 — 63 vidéos chez Cloudflare R2 (`scripts/videos-r2-preparer.mjs`, `scripts/videos-r2-envoyer.mjs`) | Fait |
| 2 exercices de step filmés sans dessin validé | Philippe valide → Claude |

## 3. Comptes et paiements
| Étape | Qui |
|---|---|
| Modèle définitif (2026-11-04) : gratuit pour le kiné ; le patient paie 12,99 € / 9,99 € / 8,99 € par mois selon l'engagement (accès EasyPhysio + 6 € au kiné), 10 jours d'essai | Fait |
| Migration `0077_review_price_free.sql` | Fait (2026-11-01) |
| Secret `CRON_SECRET` sur Scalingo | Fait (Philippe, 2026-11-01) |
| **Stripe en mode réel** : compte activé, clés réelles sur Scalingo | Fait (2026-11-02) |
| Webhooks Stripe en mode réel (Connect : + customer.subscription.*, 2026-11-02) ; ajouter aussi customer.subscription.* sur l'endpoint PLATEFORME (accès 3,99 €) | Claude, sur l'accord de Philippe |

## 4. Hébergement certifié santé (HDS)
| Étape | Qui |
|---|---|
| Demande à Scalingo d'ouvrir la région certifiée **osc-secnum-fr1** + contrat HDS (offre payante) | Philippe |
| Créer l'application, la base de données et PostgREST dans cette région, copier les données, basculer les variables | Claude, avec Philippe connecté à Scalingo |
| Test complet (kiné, patient, paiement, facture) dans la nouvelle région | Claude |

## 5. Connexion des utilisateurs (Clerk)
| Étape | Qui |
|---|---|
| Clerk en production pour easyphysio.fr | Fait (2026-10-31) |
| Enregistrements DNS Clerk chez OVH | Fait |
| Clés Clerk de production sur Scalingo | Fait |
| **Tester une vraie inscription kiné de bout en bout** : fenêtre privée, easyphysio.fr/signup/kine, 2e adresse e-mail (ex. philippe78m+kine1@gmail.com), code reçu par e-mail, arrivée directe dans le tableau de bord. Puis Claude vérifie les journaux, la fiche (validée d'office, bon cabinet), le QR code et « Suivi & facturation », et supprime le compte de test avec l'accord de Philippe. (Code corrigé le 2026-11-04 : plus de risque d'écran blanc après la création du compte.) | Philippe, puis Claude |
| Renommer l'application en « EasyPhysio » dans le tableau de bord Clerk (les e-mails de Clerk disent encore « My Application » ; les écrans du site sont déjà corrigés) | Philippe |

## 6. Ouverture
| Étape | Qui |
|---|---|
| Ouvrir les inscriptions et les invitations (`SIGNUPS_OPEN`, `PATIENT_INVITATIONS_OPEN` = true) | Claude, sur le feu vert de Philippe une fois 1 à 5 terminés |
| Écrire à la liste d'attente | Philippe |
| Migration 0063 (verrouillage de sécurité de la base) | Fait (appliquée le 2026-11-01, gardée) |
