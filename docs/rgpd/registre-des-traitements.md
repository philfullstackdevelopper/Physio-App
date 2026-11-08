# Registre des activités de traitement — EasyPhysio

> **BROUILLON rédigé par Claude — à faire valider par un juriste (Stanislas de Saint-Romain) avant usage. Rien ici n'est validé.**

_Modèle : registre CNIL (art. 30 RGPD). Établi le 2026-11-08 d'après le code (migrations `0001` à `0083`). À relire à chaque nouvelle fonctionnalité qui touche des données personnelles._

## 0. Identité

| | |
|---|---|
| Organisme | [à compléter : raison sociale, forme juridique] |
| SIRET / adresse | [à compléter] |
| Représentant légal | Philippe Maupain [à confirmer] |
| Contact RGPD | [à compléter : adresse e-mail dédiée] |
| Délégué à la protection des données (DPO) | [à compléter : désigné ou non — question pour le juriste ; pas obligatoire a priori si le traitement à grande échelle de données de santé n'est pas établi] |

**Deux parties dans ce registre** (rôle à confirmer, voir `README.md` question 1) :
- **Partie A** — EasyPhysio **responsable de traitement** (ses propres finalités) : art. 30-1.
- **Partie B** — EasyPhysio **sous-traitant** de chaque kiné (le kiné est responsable) : art. 30-2.

**Sous-traitants cités ci-dessous** (détail et garanties : `accord-sous-traitance-kine.md` §10)

| Code | Prestataire | Pays des données | Garantie pour un transfert hors UE |
|---|---|---|---|
| SCA | Scalingo SAS — hébergement app, PostgREST, PostgreSQL | France. **Aujourd'hui** région `osc-fr1`, **non HDS** ; **prévu** : `osc-secnum-fr1` avec option HDS (certificat n° 38436, valable jusqu'au 2028-09-11) | Pas de transfert |
| CLK | Clerk Inc. — connexion, comptes, e-mails d'invitation et de mot de passe | USA (pas d'hébergement UE proposé) | Data Privacy Framework UE-USA [à vérifier : inscription de Clerk] + clauses contractuelles types du DPA Clerk |
| STR | Stripe — paiements, abonnements, factures | UE (Stripe Payments Europe, Irlande) + USA | DPF + clauses types (DPA Stripe) [à vérifier] |
| EXP | Expo (650 Industries Inc.) — envoi des notifications de l'appli ; puis Apple (APNs) et Google (FCM) | USA | [à vérifier : DPA Expo, DPF] |
| R2 | Cloudflare — stockage des vidéos d'exercices (bucket privé `easyphysio-videos`) | [à vérifier : localisation du bucket ; option « juridiction UE »] | DPF + clauses types (DPA Cloudflare) [à vérifier] |
| PH | PostHog Inc. — mesure d'audience, erreurs du navigateur | UE (Francfort, `eu.i.posthog.com`) | Pas de transfert prévu [à vérifier : accès support depuis les USA] |
| SUP | Supabase — **ancien** hébergement, plus utilisé par l'app, pas encore supprimé | USA [à confirmer] | À **supprimer** ; vérifier qu'il ne contient aucune donnée réelle |
| GML | Google (Gmail) — boîte de Philippe pour la prospection | USA / UE | DPF + clauses types (conditions Google Workspace / Gmail) [à vérifier : compte personnel ou professionnel] |

**Durées de conservation** : sauf mention contraire, **le code ne supprime rien automatiquement**. Les durées ci-dessous marquées « proposition » sont à décider.

---

# PARTIE A — EasyPhysio responsable de traitement

## A1. Comptes des kinésithérapeutes

| Rubrique | Contenu |
|---|---|
| Finalité | Créer et gérer le compte du kiné (inscription ouverte, validée automatiquement depuis le 2026-11-02), pré-remplir son cabinet depuis l'Annuaire santé à partir de son RPPS (badge « RPPS vérifié »), suspension par l'administrateur, demandes de suppression de compte (exigence Apple), cabinets (kinés rattachés pour la facturation). |
| Base légale | Exécution du contrat (CGU kiné) — art. 6.1.b. Intérêt légitime pour la vérification RPPS et la suspension (art. 6.1.f). |
| Personnes | Kinésithérapeutes inscrits ; confrères invités dans un cabinet. |
| Données | Nom, e-mail, identifiants de connexion (chez Clerk : mot de passe haché, sessions), nom et adresse du cabinet, téléphone, numéro RPPS, date de vérification RPPS, SIRET, statut (en attente / validé / refusé / suspendu), tarif choisi, compte Stripe Connect (identifiant), rattachement cabinet, demande de suppression et motif libre. Tables : `instructors`, `app_users`, `instructor_connect_accounts`, `instructor_blocks`, `cabinet_memberships`, `account_deletion_requests`, `instructor_fee_waivers`. Pas de donnée de santé. |
| Destinataires | Philippe (administrateur, `/admin`). Les patients du kiné voient son nom et son cabinet. |
| Sous-traitants | SCA, CLK, STR (Connect). Interrogation de l'API Annuaire santé (ANS, `gateway.api.esante.gouv.fr`) : le RPPS saisi y est envoyé. |
| Transferts hors UE | Clerk (USA), Stripe (en partie). |
| Conservation | Durée du compte. Après suppression : [à compléter — proposition : suppression immédiate du compte, conservation des seules pièces comptables 10 ans]. La demande de suppression est traitée à la main depuis `/admin#suppressions` : délai [à compléter — proposition : 30 jours max]. |
| Sécurité | Voir §C. |

## A2. Abonnement d'accès à la plateforme vendu au patient (modèle du 2026-11-04)

| Rubrique | Contenu |
|---|---|
| Finalité | Vendre et facturer au patient l'accès à l'application (6,99 € / 3,99 € / 2,99 € TTC par mois selon l'engagement, 10 jours d'essai), gérer les résiliations, les échecs de paiement (accès bloqué), la TVA. |
| Base légale | Exécution du contrat (art. 6.1.b) ; obligation légale pour la conservation des factures (art. 6.1.c). |
| Personnes | Patients abonnés. |
| Données | Nom, e-mail, identifiant client et abonnement Stripe, formule, statut, fin de période, résiliation demandée (`subscriptions`, `patients.trial_ends_at`, `patients.payment_lapsed_at`). Carte : chez Stripe seulement (EasyPhysio ne voit que la marque et les 4 derniers chiffres, `card_label`). **Attention** : le fait d'être abonné révèle qu'on est suivi par un kiné → donnée potentiellement **de santé** au sens CNIL (question 3 du README). |
| Destinataires | Philippe (administrateur), comptable [à compléter]. |
| Sous-traitants | STR, SCA. |
| Transferts hors UE | Stripe (USA, en partie). |
| Conservation | Factures et pièces comptables : 10 ans (art. L.123-22 C. com.) [à valider]. Ligne `subscriptions` : supprimée avec le compte patient (cascade) — **mais** Stripe garde ses propres données ; le code ne supprime pas le client Stripe [à décider]. |

## A3. Mesure d'audience et suivi des erreurs (PostHog)

| Rubrique | Contenu |
|---|---|
| Finalité | Statistiques de fréquentation et entonnoirs (pages vues, clics), détection des erreurs du navigateur pour la routine de correction des bugs (`docs/routine-bugs.md`). |
| Base légale | Intérêt légitime (art. 6.1.f). Pas de consentement demandé : aucun cookie ni stockage sur l'appareil (`persistence: "memory"`, `instrumentation-client.ts`) — à valider (README question 10). |
| Personnes | Visiteurs du site public ; kinés dans leur tableau de bord. **Jamais** l'espace patient (`lib/analytics/privacy.ts`, liste blanche). |
| Données | Adresse de la page (identifiants remplacés par « :id », sans paramètres), type de navigateur / appareil, clics (texte et attributs masqués), messages d'erreur (identifiants et e-mails masqués ; **un nom de patient présent dans un message d'erreur ne serait pas masqué**), événements nommés (`lib/analytics/track.ts`, sans nom ni e-mail). Adresse IP : relayée par `/ingest` (réécriture `next.config.ts`) → [à vérifier : option PostHog « Discard client IP data »]. Pas d'identification (`person_profiles: "never"`), respect de « Do Not Track ». |
| Destinataires | Philippe ; Claude (lecture des erreurs pour la routine de bugs, clé PostHog en lecture seule). |
| Sous-traitants | PH. |
| Transferts hors UE | Non prévu. |
| Conservation | [à compléter — réglage de rétention du projet PostHog ; proposition : 13 mois max, recommandation CNIL pour la mesure d'audience]. |

## A4. Liste d'attente du lancement

| Rubrique | Contenu |
|---|---|
| Finalité | Prévenir du lancement les visiteurs qui laissent leur e-mail (`components/WaitlistForm.tsx`). Philippe écrit lui-même ; aucun envoi automatique. |
| Base légale | Consentement (art. 6.1.a) — l'inscription est volontaire. |
| Personnes | Visiteurs (kinés ou patients). |
| Données | E-mail, « kiné » ou « patient », date (`internal.waitlist`, schéma jamais exposé par PostgREST). Pas de nom, pas d'IP. |
| Destinataires | Philippe (`/admin`). |
| Sous-traitants | SCA ; GML quand Philippe écrit depuis Gmail. |
| Transferts hors UE | Gmail [à vérifier]. |
| Conservation | Page en ligne : « supprimée sur simple demande ou au plus tard un an après le lancement ». **Rien dans le code ne l'applique** : suppression manuelle depuis `/admin`. |

## A5. Prospection commerciale des kinésithérapeutes

| Rubrique | Contenu |
|---|---|
| Finalité | Faire connaître EasyPhysio à des kinés (vagues d'e-mails, ~35 par jour). |
| Base légale | Intérêt légitime (art. 6.1.f) — prospection B2B par e-mail sans consentement préalable possible si le message concerne la profession et permet de s'opposer (art. L.34-5 CPCE, doctrine CNIL) [à valider]. |
| Personnes | Kinés (prospects), en France, Belgique, Luxembourg, Suisse. |
| Données | Nom, adresse e-mail professionnelle, cabinet, ville, source de l'adresse [à compléter : sources exactes utilisées], historique d'envoi et réponses. |
| Destinataires | Philippe. |
| Sous-traitants | GML. [à compléter : fichiers locaux ou tableur utilisés]. |
| Transferts hors UE | Gmail (Google, USA). Envoi vers la Suisse : pays adéquat. |
| Conservation | [à compléter — proposition : 3 ans après le dernier contact sans réponse (recommandation CNIL) ; opposition traitée immédiatement et gardée dans une liste « ne plus contacter »]. |

## A6. Sécurité, journaux techniques et support

| Rubrique | Contenu |
|---|---|
| Finalité | Faire fonctionner et sécuriser le service, diagnostiquer les erreurs serveur, répondre aux demandes (support, exercice des droits). |
| Base légale | Intérêt légitime (art. 6.1.f) ; obligation légale pour la sécurité (art. 32). |
| Personnes | Tous les utilisateurs. |
| Données | Journaux Scalingo (requêtes, erreurs serveur `console.error` qui peuvent contenir des identifiants internes ou Clerk, parfois une adresse e-mail [à vérifier]), journaux Clerk (connexions, IP, appareil), messages de support. |
| Destinataires | Philippe ; Claude lit les journaux pour la routine de bugs (`scalingo logs`). |
| Sous-traitants | SCA, CLK. |
| Transferts hors UE | Clerk (USA). |
| Conservation | [à compléter : rétention des journaux Scalingo et Clerk ; proposition CNIL : 6 mois à 1 an]. |

## A7. Bibliothèque d'exercices : vidéos et exercices publiés

| Rubrique | Contenu |
|---|---|
| Finalité | Montrer des vidéos de démonstration ; publier pour tous les kinés un exercice proposé par un kiné (`/admin`, migration `0081`), avec le nom d'auteur affiché. |
| Base légale | Contrat / autorisation de droit à l'image des personnes filmées (art. 6.1.a ou b) [à valider]. |
| Personnes | Personnes filmées (démonstrateur « Jules », personnes filmées par les kinés — **jamais le patient lui-même**, consigne de `components/KineVideoUpload.tsx`) ; kinés auteurs. |
| Données | Image et silhouette dans la vidéo, date de l'accord coché par le kiné (`exercises.filming_consent_at`), nom d'auteur affiché (`author_label`). Pas de donnée de santé si la consigne est respectée. |
| Destinataires | Kinés et patients connectés (lien signé valable 6 h). |
| Sous-traitants | R2, SCA. |
| Transferts hors UE | Selon localisation du bucket [à vérifier]. |
| Conservation | Tant que l'exercice existe ; un exercice privé est supprimé avec le compte du kiné, un exercice publié reste « au nom de la plateforme » (`0081`). [à compléter : retrait sur demande de la personne filmée]. |

---

# PARTIE B — EasyPhysio sous-traitant de chaque kiné

**Responsable de traitement** : chaque kiné utilisateur (un registre par kiné ; EasyPhysio tient la liste des catégories de traitements faits pour le compte de ses clients, art. 30-2).
**Personnes concernées** : les patients du kiné. **Catégorie particulière** : données de santé (art. 9).
**Base légale côté kiné** : [à trancher — consentement explicite art. 9.2.a, tel que recueilli aujourd'hui (`patient_profiles.health_data_consent_at`, case à cocher dans le questionnaire), **ou** prise en charge sanitaire art. 9.2.h + art. 6.1.b/e]. Voir README question 2.
**Isolation** : un kiné ne voit que ses patients, un patient que sa fiche — appliqué par la base de données (RLS forcée sur chaque table), voir §C.

## B1. Inscription du patient et consentements

| Rubrique | Contenu |
|---|---|
| Finalité | Créer la fiche du patient chez son kiné (invitation par e-mail ou QR code / lien personnel du kiné `/rejoindre/…`), envoyer l'invitation, enregistrer l'acceptation des CGU et le consentement santé. |
| Données | Nom, e-mail, kiné de rattachement, date d'acceptation des CGU (`patients.terms_accepted_at`), date du consentement santé, identifiant Clerk (`app_users`). |
| Sous-traitants | SCA ; CLK (reçoit e-mail + nom ; le rôle « patient » et le nom du kiné ne sont plus envoyés à partir de cette branche — script de nettoyage des anciens comptes `scripts/clerk-nettoyer-metadonnees.mjs`). |
| Transferts | Clerk (USA). |
| Point d'attention | L'e-mail est saisi par le kiné (ou le patient via QR) : une **faute de frappe** envoie l'invitation, avec le nom du kiné à l'écran, à un inconnu. |

## B2. Programme d'exercices, séances et ressenti

| Rubrique | Contenu |
|---|---|
| Finalité | Permettre au kiné d'attribuer une pathologie et des séances, d'ajuster une séance pour un patient, et de suivre l'adhérence, la douleur et la difficulté. |
| Données | Pathologie (`patients.condition_id`), phase de rééducation, zones du corps déclarées, matériel disponible, date de naissance, taille, poids, niveau d'activité, histoire de la blessure et avancement (texte libre), date de déclaration de la phase (`patient_profiles`) ; séances recommandées par semaine (`patient_recommended_workouts`), séances personnalisées (`workouts.patient_id`), exercices réservés à ce patient (`exercises.patient_id`) ; séances faites (`workout_logs`), douleur / difficulté / notes par séance (`patient_feedback`), résultat par exercice : fait / passé + raison, douleur, difficulté (`exercise_results`) ; date de dernière lecture par le kiné. |
| Sous-traitants | SCA (base), R2 (vidéos lues — pas de donnée patient envoyée), PH : **aucune** donnée (espace patient non mesuré ; dans l'espace kiné, adresses réduites à `:id`). |
| Transferts | Aucun. |

## B3. Messagerie kiné ⇄ patient et notifications

| Rubrique | Contenu |
|---|---|
| Finalité | Échanger des messages ; prévenir par notification de l'appli mobile (« Nouveau message de votre kiné. ») ; rappel quotidien « votre séance du jour vous attend » (cron 17 h UTC, `scripts/cron-rappels.mjs`). |
| Données | Texte des messages, expéditeur, dates d'envoi / lecture, date de relance (`patient_messages`) ; jetons de notification et système (iOS / Android) (`push_tokens`). Le **texte** des notifications ne contient ni nom ni contenu ; la notification envoyée au kiné contient dans son lien l'**identifiant interne du patient** (`/dashboard/messages?patient=<uuid>`). |
| Sous-traitants | SCA ; EXP (+ Apple / Google) pour les notifications. |
| Transferts | Expo, Apple, Google (USA) : jeton + texte générique + lien. |

## B4. Honoraires du kiné (programme mensuel)

| Rubrique | Contenu |
|---|---|
| Finalité | Pour le compte du kiné : enregistrer l'acceptation du tarif, cloner la carte du patient sur le compte Stripe Connect du kiné, prélever 6,00 € les mois où il met à jour le programme, numéroter et produire les notes d'honoraires, récapitulatif mensuel et CSV (`/documents/honoraires`). |
| Données | Tarif accepté, date d'acceptation, client et carte Stripe sur le compte du kiné (`patient_follow_ups`), mois, montant, statut du paiement, numéro de note, retour écrit (`monthly_reviews.feedback`, texte potentiellement clinique). |
| Sous-traitants | SCA ; STR — sur le **compte Connect du kiné** (Stripe est aussi le prestataire direct du kiné). Le libellé Stripe « Programme mensuel hors nomenclature » révèle la nature du paiement. |
| Transferts | Stripe (USA, en partie). |

## B5. Exercices créés par le kiné

| Rubrique | Contenu |
|---|---|
| Finalité | Le kiné crée un exercice (texte, zones, matériel, vidéo filmée au téléphone), pour sa banque, pour un seul patient, ou le propose à la publication. |
| Données | Contenu de l'exercice ; réservation à un patient (`exercises.patient_id`) ; vidéo d'une personne filmée (pas le patient). |
| Sous-traitants | SCA, R2 (envoi direct du téléphone vers R2 par lien signé 15 min, `lib/storage/r2-upload.ts`). |

## Durées de conservation (Partie B)

**Dans le code aujourd'hui** :
- Les données d'un patient restent tant que le kiné ou le patient ne les supprime pas. Aucune suppression automatique après la fin du suivi ou l'inactivité. Les patients « anciens » (accès arrêté) gardent toutes leurs données.
- Suppression par le patient (`/patient/compte`, mot « SUPPRIMER ») ou par le kiné (fiche patient) : abonnement Stripe résilié, puis effacement en cascade de **toutes** les tables du patient — **y compris les notes d'honoraires du kiné** — puis du compte Clerk.
- Suppression d'un kiné : par Philippe, après demande ; efface en cascade **tous ses patients**.
- Jetons de notification : supprimés à la déconnexion, quand Expo les refuse, ou avec le compte.
- Sauvegardes Scalingo : [à compléter].

**Proposition à valider par le juriste et chaque kiné** : [à compléter — ex. suivi conservé pendant la relation de soin, puis [X] ans après le dernier contact ; notes d'honoraires conservées au nom du kiné [10] ans même si le patient supprime son compte ; restitution au kiné avant toute suppression].

---

# C. Mesures de sécurité (communes)

**En place (vérifié dans le code)**
- Isolation par la base de données : Row-Level Security activée **et forcée** (`force row level security`) sur les tables, identité vérifiée par `current_app_user_id()` à partir du jeton Clerk ; un kiné suspendu ou non validé ne voit plus aucune donnée patient (`0063`).
- Pas de clé « passe-partout » : les opérations serveur passent par des fonctions étroites du schéma `internal`, jamais exposé par PostgREST, chacune avec son « laissez-passer » nommé (`0057`, `0061`).
- Champs sensibles verrouillés : un patient ne peut pas modifier son e-mail, ses dates de consentement, ni ses données de facturation ; « RPPS vérifié » écrit par le serveur seulement (`0063`).
- Bibliothèque d'exercices lisible seulement par des personnes connectées (`0067`).
- Mots de passe : gérés par Clerk (jamais stockés par EasyPhysio).
- Vidéos : bucket privé, liens signés (6 h en lecture, 15 min en envoi).
- Liens QR signés (HMAC) : impossible de fabriquer le lien d'un autre kiné.
- Appli mobile : verrou Face ID / empreinte à l'ouverture et après 5 min en arrière-plan (la biométrie reste sur le téléphone, rien n'est envoyé).
- Mesure d'audience exclue de l'espace patient, texte masqué, pas de cookie.
- Droits des patients : export JSON de leurs données et suppression du compte en libre-service (`/patient/compte`).
- Webhooks Stripe signés ; métadonnées d'abonnement signées (HMAC).

**À faire** : voir le plan d'action de `aipd.md` §8 (bascule HDS, double authentification, suppression de Supabase, IP PostHog, durées, procédure de violation, règle « pas d'accès de l'IA aux données réelles », etc.).
