# Corrections proposées — politique de confidentialité et liste des sous-traitants

> **BROUILLON rédigé par Claude — à faire valider par un juriste (Stanislas de Saint-Romain) avant usage. Rien ici n'est validé.**

_Ce n'est **pas** une nouvelle politique : c'est la liste des écarts entre les textes et la réalité du code au 2026-11-08, avec une formulation de remplacement pour chacun. Rien n'est encore modifié dans `legal/` ni sur le site._

## 0. À savoir avant de corriger

- **Il existe deux textes différents.** `legal/politique-confidentialite.md` (brouillon de travail) et la page en ligne `/confidentialite`, écrite en dur dans `app/confidentialite/page.tsx` (« Keep the two in sync by hand »). Ils ne disent **pas** la même chose (ex. hébergement : « hébergées par un prestataire certifié HDS » dans le `.md`, « en cours de migration » en ligne ; PostHog absent du `.md`, présent en ligne). Chaque correction ci-dessous doit être reportée **dans les deux**, ou mieux : ne garder qu'une source.
- **Bilingue.** Le site doit devenir français / anglais : toute version corrigée aura besoin d'un brouillon anglais, lui aussi à faire relire. Non fait ici.
- **Rôle d'EasyPhysio.** Plusieurs corrections dépendent de la réponse à la question 1 du `README.md` (sous-traitant du kiné / responsable / conjoint). Les formulations ci-dessous supposent la proposition du README : sous-traitant pour le suivi, responsable pour le reste.
- **Bandeau cookies** (`components/CookieBanner.tsx`) : il dit « aucun cookie publicitaire ou de mesure d'audience ». C'est exact (PostHog sans cookie), mais il faudra le relire si PostHog change de réglage.

---

## A. `legal/politique-confidentialite.md` (et page `/confidentialite`)

### A1. §1 « Qui sommes-nous » — identité et rôle
**Actuel (`.md`)** : « [Raison sociale / nom du responsable de traitement] … *(Point à trancher avec l'avocat : qui est responsable de traitement…)* » — la page en ligne ne donne **aucune** identité ni contact.
**Problème** : obligation d'identifier le responsable et ses coordonnées (art. 13.1.a).
**Proposé** :
> « EasyPhysio est édité par [raison sociale], [forme], SIRET [à compléter], [adresse]. Contact données personnelles : [e-mail].
> Pour le suivi de vos exercices (programme, séances, douleur, messages), **votre kinésithérapeute** est responsable du traitement ; EasyPhysio agit pour son compte, comme sous-traitant. Pour votre abonnement d'accès à l'application, la sécurité du service et la mesure d'audience, **EasyPhysio** est responsable du traitement. »

### A2. §2 « Données que nous collectons » — documents médicaux et liste réelle
**Actuel (`.md`)** : « Documents médicaux éventuellement déposés (imagerie, comptes rendus) » ; « Ressenti : douleur, difficulté perçue, notes libres par séance et par exercice ».
**Problème** : les documents et pièces jointes ont été supprimés du produit (migration `0056`). Manquent : zones du corps, matériel disponible, raison d'un exercice passé, jeton de notification, données de paiement de l'abonnement, vidéos des kinés.
**Proposé** : remplacer la liste « Données de santé » par :
> « Pathologie et phase de rééducation, zones du corps concernées, histoire de la blessure, date de naissance, taille, poids, niveau d'activité, matériel dont vous disposez ; séances recommandées et réalisées ; pour chaque séance et chaque exercice : douleur, difficulté, exercice fait ou passé (et pourquoi, si vous le dites), notes ; messages échangés avec votre kinésithérapeute. Nous ne recueillons ni numéro de sécurité sociale, ni documents médicaux, ni photo ou vidéo de vous. »
Ajouter : « **Appli mobile** : si vous acceptez les notifications, un identifiant technique de votre téléphone (jeton) et son système (iPhone / Android). Le déverrouillage par Face ID ou empreinte se fait sur votre téléphone : EasyPhysio ne reçoit aucune donnée biométrique. »

### A3. §3 « Base légale »
**Actuel** : « Consentement explicite (art. 9.2.a RGPD) pour les données de santé … Exécution du contrat (art. 6.1.b) … Intérêt légitime (art. 6.1.f) pour … sécurité ».
**Problème** : à revoir selon la question 2 du README (consentement ou art. 9.2.h). Manquent : obligation légale (factures), intérêt légitime pour la mesure d'audience, consentement pour la liste d'attente.
**Proposé** : tableau finalité → base légale, repris du registre (A1–A7, B1–B5). [Base légale santé : à compléter après décision du juriste.]

### A4. §4 « Qui a accès » — accès d'EasyPhysio
**Actuel** : « L'équipe technique d'EasyPhysio, en accès minimal et **journalisé**, pour la maintenance. »
**Problème** : aucun journal des accès administrateur n'existe aujourd'hui dans le code ; l'administrateur a un accès direct à la base.
**Proposé** : « Le dirigeant d'EasyPhysio, seul habilité, uniquement lorsque c'est nécessaire (maintenance, facturation, demande de votre kinésithérapeute), et tenu à la confidentialité. » — et ne réintroduire « journalisé » qu'une fois un journal mis en place (AIPD, action 10).

### A5. §5 « Hébergement et sécurité » — **affirmation fausse aujourd'hui**
**Actuel (`.md`)** : « Les données de santé **sont hébergées** par un prestataire certifié Hébergeur de Données de Santé (HDS) … [Scalingo, certificat HDS n°38436 …] »
**Problème** : l'app tourne sur Scalingo `osc-fr1`, région **non certifiée HDS**. La page en ligne (« en cours de migration ») est exacte.
**Proposé (avant la bascule)** : garder la formulation de la page en ligne.
**Proposé (après la bascule, à publier le jour même)** :
> « Vos données de santé sont hébergées en France par Scalingo SAS, hébergeur certifié Hébergeur de Données de Santé (certificat n° 38436), conformément à l'article L.1111-8 du Code de la santé publique. Chaque kinésithérapeute ne voit que ses patients et chaque patient que ses propres données : cette séparation est appliquée par la base de données elle-même. »
Retirer « Les mots de passe sont chiffrés (hash) » au profit de : « Votre mot de passe est géré par notre prestataire d'authentification (Clerk) ; EasyPhysio ne le voit ni ne le stocke. »

### A6. §6 « Sous-traitants » — **liste fausse**
**Actuel (`.md`)** : Scalingo ; « [Outscale] Stockage des documents médicaux » ; « [prestataire emailing, ex. Brevo] » ; « [Stripe] … UE/US ».
**Actuel (en ligne)** : « Clerk …, Stripe …, et notre hébergeur de base de données ».
**Problèmes** : Outscale n'est pas utilisé et il n'y a plus de documents médicaux ; il n'y a pas de Brevo (les e-mails d'invitation et de mot de passe sont envoyés par Clerk) ; manquent Clerk (dans le `.md`), Expo / Apple / Google, Cloudflare R2, PostHog (dans le `.md`). L'ancien Supabase (USA) existe encore mais ne doit plus être cité une fois supprimé.
**Proposé** :

| Prestataire | Rôle | Données | Pays |
|---|---|---|---|
| Scalingo | Hébergement de l'application et de la base (HDS après bascule) | Toutes, y compris santé | France |
| Clerk | Connexion, comptes, e-mails d'invitation et de réinitialisation | Nom, e-mail, connexion (IP, appareil) | États-Unis |
| Stripe | Paiement de l'abonnement d'accès et des honoraires du kiné | Nom, e-mail, paiement (carte chez Stripe seulement) | Irlande / États-Unis |
| Expo, Apple, Google | Notifications de l'appli mobile | Jeton du téléphone, texte sans nom ni contenu | États-Unis |
| Cloudflare (R2) | Vidéos de démonstration des exercices | Aucune donnée vous concernant | [à vérifier] |
| PostHog | Mesure d'audience du site public et de l'espace kiné | Pages vues, clics, sans identification ; jamais l'espace patient | Union européenne |

### A7. Nouveau § « Transferts hors de l'Union européenne » — **absent**
**Problème** : obligation d'information (art. 13.1.f).
**Proposé** :
> « Certains prestataires sont établis aux États-Unis (Clerk, Expo, et Stripe pour une partie de ses opérations). Ils ne reçoivent aucune donnée de santé (votre programme, vos séances, votre douleur et vos messages restent en France). Ces transferts sont encadrés par le cadre de protection des données UE–États-Unis (Data Privacy Framework) et/ou les clauses contractuelles types de la Commission européenne. [à vérifier pour chaque prestataire] »
⚠ « aucune donnée de santé » dépend de la réponse du juriste à la question 3 du README (nom + e-mail d'un patient d'un service de soin).

### A8. §7 « Durée de conservation »
**Actuel (`.md`)** : « [À définir avec l'avocat — proposition …] Après suppression du compte ou [X mois] d'inactivité : suppression ou anonymisation … Documents médicaux : … »
**Actuel (en ligne)** : « Vos données sont conservées pendant la durée de votre suivi. En cas de suppression de votre compte, elles sont supprimées ou anonymisées … »
**Problèmes** : rien n'est supprimé pour inactivité dans le code ; « anonymisées » ne correspond à rien (c'est une suppression) ; la ligne « Documents médicaux » est à retirer ; les factures (10 ans) et les données chez Stripe / Clerk ne sont pas mentionnées.
**Proposé** (une fois les durées décidées) : tableau par catégorie — suivi de soin : [à compléter] ; compte : jusqu'à suppression ; factures d'accès : 10 ans ; notes d'honoraires : conservées pour votre kinésithérapeute [à compléter] ; jetons de notification : jusqu'à déconnexion ou désinstallation ; liste d'attente : jusqu'à un an après le lancement ; journaux : [à compléter] ; sauvegardes : [à compléter].

### A9. §8 « Consentement » — **retrait impossible en pratique**
**Actuel** : « Ce consentement est horodaté et **peut être retiré à tout moment** (voir section 9) ».
**Problème** : aucun bouton ne permet de retirer le consentement ; seule la suppression complète du compte existe.
**Proposé (en attendant un bouton)** : « Vous pouvez retirer ce consentement à tout moment en supprimant votre compte depuis « Mon compte », ou en nous écrivant à [e-mail] : vos données de santé seront alors effacées et vous ne pourrez plus utiliser le suivi. » — à revoir si la base légale devient l'art. 9.2.h.

### A10. §9 « Vos droits » — renvoi à une fonction « à construire »
**Actuel (`.md`)** : « … directement depuis votre compte, section [à construire — voir la fonctionnalité d'export/suppression en cours de développement] ».
**Problème** : l'export et la suppression **existent** (`/patient/compte`). Manque l'adresse de contact (la page en ligne dit seulement « contactez-nous depuis votre compte », sans moyen réel).
**Proposé** :
> « Depuis « Mon compte » : **Télécharger mes données** (fichier complet) et **Supprimer mon compte** (immédiat ; votre abonnement est résilié). Pour les autres droits (rectification de votre e-mail, opposition, limitation) : [e-mail]. Pour les données de suivi, vous pouvez aussi vous adresser à votre kinésithérapeute. Réponse sous un mois. »
Ajouter : droit de définir des directives post-mortem (présent dans le `.md`, absent en ligne) et coordonnées CNIL.

### A11. Nouveau § ou §11 « Cookies et mesure d'audience »
**Actuel (`.md`)** : « [À compléter selon ce qui est effectivement utilisé …] ». **En ligne** : « nous mesurons de façon **anonyme** … ».
**Problèmes** : « anonyme » n'est pas établi tant que l'IP peut arriver chez PostHog via `/ingest` (vérifier l'option « Discard client IP data ») ; ne pas oublier les cookies de connexion Clerk et le stockage local (bandeau « Compris », appli).
**Proposé** :
> « **Cookies** : uniquement ceux nécessaires à votre connexion (Clerk) et un mémo local indiquant que vous avez fermé le bandeau. **Mesure d'audience** : sur le site public et l'espace kiné uniquement, avec PostHog (serveurs dans l'UE), sans cookie ni stockage sur votre appareil ; les adresses de pages sont réduites, le texte affiché masqué, aucun visiteur identifié, [votre adresse IP n'est pas conservée]. L'espace patient n'est jamais mesuré. « Do Not Track » est respecté. »

### A12. Nouveau § « Appli mobile et notifications »
**Problème** : l'appli (Expo) et ses notifications ne sont mentionnées nulle part.
**Proposé** :
> « Si vous l'acceptez, l'appli vous envoie des notifications (« Nouveau message de votre kiné. », rappel de séance quotidien). Leur texte ne contient jamais votre nom ni le contenu des messages. Elles transitent par Expo puis Apple ou Google. Vous pouvez les couper à tout moment dans les réglages de votre téléphone. »

### A13. Nouveau § « Vidéos d'exercices filmées par les kinés »
**Proposé** : « Un kiné peut filmer une personne pour illustrer un exercice, avec son accord, jamais un patient. Une personne filmée peut demander le retrait de la vidéo à [e-mail]. »

### A14. Nouveau § « Liste d'attente » (absent du `.md`, présent en ligne)
Reprendre le texte de la page en ligne ; ajouter que la suppression « un an après le lancement » sera faite à la main [ou automatisée].

### A15. §10 « Intelligence artificielle » — OK
Exact aujourd'hui (`lib/ai/protocol.ts` est une maquette). Proposé, à ajouter : « Les outils d'aide au développement d'EasyPhysio n'ont pas accès à vos données de santé. » — **seulement** une fois la règle de l'AIPD (action 10) en place.

### A16. Nouveau § « Mineurs »
[à compléter selon la décision du juriste — README question 7.]

---

## B. `legal/sous-traitants.md`

| Ligne actuelle | Problème | Proposé |
|---|---|---|
| « Scalingo … HDS : ✅ Oui — ils le sont (cert. n°38436) » | Exact pour la société, **faux pour l'offre utilisée** (`osc-fr1`). | « HDS : ✅ après bascule vers `osc-secnum-fr1` + option HDS ; aujourd'hui `osc-fr1` non certifié. Demander le périmètre écrit (activités 1–6). » |
| « Outscale — Stockage des documents médicaux » | Plus de documents (migration `0056`), Outscale non utilisé (`lib/storage/s3.ts` dormant). | Supprimer la ligne (ou « non utilisé »). |
| « Prestataire emailing (ex. Brevo) » | Pas de Brevo : Clerk envoie les e-mails. | Remplacer par une ligne **Clerk** : « Connexion + e-mails d'invitation/réinitialisation — nom, e-mail, journaux de connexion — USA, pas d'hébergement UE — DPF + clauses types — DPA à accepter — rôle « patient » et nom du kiné retirés (2026-11-08) ; question ouverte : identité des patients = donnée de santé ? » |
| « Stripe — Paiement des abonnements » | Incomplet : deux flux (accès sur le compte EasyPhysio, honoraires sur le compte Connect du kiné, carte clonée). | « Stripe — abonnement d'accès (compte EasyPhysio) + honoraires du kiné (compte Connect du kiné) — nom, e-mail, paiement, libellé « Programme mensuel hors nomenclature » — Irlande/USA — DPA Stripe à accepter. » |
| « Anthropic (Claude) — Aucune actuellement » | Exact pour le produit. Mais Claude Code lit les journaux serveur et le code, et peut lancer des scripts avec l'accès base. | Ajouter : « Outil de développement : ne doit jamais lire de vraies données patients (règle à écrire, AIPD action 10). » |
| _(absent)_ | — | Ajouter : **Expo** (+ Apple APNs, Google FCM) — notifications — jeton, texte générique, identifiant interne du patient dans le lien des notifications au kiné — USA — DPA à vérifier. |
| _(absent)_ | — | Ajouter : **Cloudflare R2** — vidéos d'exercices (dont vidéos filmées par les kinés) — personnes filmées — localisation du bucket à vérifier — DPA Cloudflare. |
| _(absent)_ | — | Ajouter : **PostHog** — mesure d'audience + erreurs — UE (Francfort) — vérifier « Discard client IP data » et la rétention — DPA PostHog. |
| _(absent)_ | — | Ajouter : **Supabase** — ancien hébergement (USA), plus utilisé — **à supprimer**. |
| _(absent)_ | — | Ajouter : **Gmail** (prospection kinés) et **API Annuaire santé / ANS** (RPPS) — pour mémoire, pas de donnée patient. |
| « Le registre des traitements … pas encore rédigé » ; « Une analyse d'impact … » | Rédigés en brouillon. | Renvoyer vers `docs/rgpd/registre-des-traitements.md` et `docs/rgpd/aipd.md` (brouillons à valider). |

---

## C. Ailleurs (hors de ces deux fichiers, pour mémoire)

- **`legal/cgu.md` §5** : « Vérification du diplôme/n° ADELI ou RPPS … actuellement non vérifié techniquement » — exact (le RPPS est facultatif et ne sert qu'au pré-remplissage) ; il manque l'annexe « accord de sous-traitance » (`accord-sous-traitance-kine.md`) et une **acceptation horodatée des CGU par le kiné** (rien n'est enregistré aujourd'hui à l'inscription kiné).
- **`legal/mentions-legales.md`** : hébergeur à préciser (« Scalingo SAS … à confirmer une fois le compte créé » → le compte existe ; ajouter la mention HDS après bascule).
- **Fiche « App Privacy » / « Sécurité des données »** des stores (`mobile/README.md`) : doit rester cohérente avec la politique corrigée.
