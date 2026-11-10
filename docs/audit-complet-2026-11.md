# Audit complet d'EasyPhysio avant lancement — 10 novembre 2026

Audit en **lecture seule** : aucun code modifié, aucune migration, aucun déploiement, aucune écriture dans la base, Stripe, Clerk, R2 ou Scalingo, aucun e-mail envoyé. Code audité : branche `main`, commit `8bf881c`.

**Comment lire ce rapport.** Chaque point dit : ce qui ne va pas, où, un exemple concret du dégât, mon degré de certitude, et la correction proposée. « Vérifié » = j'ai suivi le code de bout en bout (ou testé sur le site public). « Suspecté » = le code le laisse penser, mais il faudrait un compte connecté, le tableau de bord Stripe/Clerk ou la base pour trancher. Rien n'a été « attaqué » pour de vrai sur le site en production.

Petit lexique : **RLS** = les règles de la base de données qui décident qui peut lire/écrire quelle ligne (c'est le vrai cloisonnement entre kinés). **PostgREST** = la porte d'entrée de la base, joignable depuis Internet ; un utilisateur un peu technique peut lui parler directement, sans passer par les écrans du site. **Webhook** = le message que Stripe envoie au site quand un paiement réussit ou échoue.

---

## Résumé

### Bloquant avant lancement (à régler avant d'ouvrir les invitations patients)

| # | Problème | Certitude |
|---|---|---|
| B1 | Un kiné peut **effacer le compte d'un autre kiné et tous ses patients** en parlant directement à la base | Vérifié à la lecture du code |
| B2 | Un kiné peut offrir l'**accès gratuit à vie** à ses patients et **cocher les CGU à leur place** | Vérifié à la lecture |
| B3 | La version de Next.js installée (16.3.8) a une **faille critique connue** ; le correctif existe (16.4.6) | Vérifié (`npm audit`) |
| B4 | Le **paiement et le consentement ne sont contrôlés que par l'écran**, pas par le serveur : un patient non payé peut suivre ses séances et voir les vidéos | Vérifié à la lecture |
| B5 | Supprimer un patient **efface les notes d'honoraires** du kiné, et un numéro de note peut être **réutilisé** | Vérifié |
| B6 | **Mentions légales en ligne avec des champs vides** (« [Raison sociale à compléter] »), CGU/confidentialité en « Brouillon », promesses fausses aujourd'hui (« hébergement sécurisé des données de santé »), **témoignages inventés** sur la page d'accueil | Vérifié sur le site |
| B7 | La migration **0087 n'est pas appliquée** alors que le code appelle des fonctions qu'elle crée (inscription par QR code) ; réglages Stripe (webhooks, mode réel) pas faits | 0087 : d'après les notes ; Stripe : non vérifiable |
| B9 | Une simple **panne passagère de la base** peut amener un patient à **effacer lui-même tout son dossier** (annexe A, point A1) | Vérifié à la lecture, non reproduit |
| B8 | Hébergement **pas encore HDS** (déjà traité dans l'audit du 8 novembre — rappel seulement) | Connu |

Bonne nouvelle : tant que `PATIENT_INVITATIONS_OPEN = false`, aucun chemin trouvé ne permet à un vrai patient d'entrer. **Mais B1 est exploitable dès aujourd'hui**, parce que l'inscription des kinés est ouverte et approuvée automatiquement : il suffit de créer un compte kiné. Aujourd'hui les seules victimes possibles sont le compte de Philippe et les comptes de test.

### À corriger vite (avant ou juste après l'ouverture)

- S1. Aucun en-tête de sécurité (le site peut être affiché dans une page piégée).
- S2. La bibliothèque de séances est lisible **sans se connecter** (vérifié : 172 séances, 71 pathologies).
- S3. Un compte invité peut être rattaché à une adresse e-mail non vérifiée ; l'admin est reconnu par son e-mail seulement.
- S4. La base de production fait aussi confiance aux clés Clerk **de développement**.
- S5. Rien n'oblige dans les migrations le « verrou RLS forcé » sur les tables principales (fait à la main sur Scalingo).
- M1. Les 10 jours gratuits peuvent être repris à l'infini.
- M2. L'engagement 3/6 mois se contourne ; résilier pendant l'essai d'une offre engagée fait payer 3 ou 6 mois ; le droit de rétractation promis n'est pas codé.
- M3. Un mois payé à la main par le patient peut être **payé plusieurs fois** si le webhook Connect n'est pas réglé.
- M4. L'accord écrit du patient sur les deux montants **n'est pas enregistré**.
- M5. Deux abonnements ouverts en double : l'ancien continue d'être prélevé sans être vu.
- M6. Le kiné peut encore prélever 6 € après que le patient a résilié.
- M7. Les abonnements créés du 4 au 8 novembre portent encore la TVA 20 %.
- C1. La suppression d'un compte laisse des données chez Stripe (et parfois Clerk) ; les vidéos R2 ne sont jamais supprimées.
- C2. La suppression d'un compte kiné n'a **aucune procédure**.
- C3. Le badge « RPPS vérifié » s'obtient avec le nom et le numéro publics de n'importe quel kiné.
- C4. Les invitations permettent de savoir si une adresse est déjà patiente, et d'envoyer des e-mails EasyPhysio à n'importe qui.
- C5. Un patient peut se créer une fiche kiné (double rôle).

### À améliorer

Qualité du code (2 erreurs de lint, code mort des anciens modèles de prix), SEO (pas de titre propre par page, pas d'adresse canonique, site en double sur `scalingo.io`), dérives de `CLAUDE.md`, détails d'accessibilité. Voir sections 4 et 5.

---

## 1. Cloisonnement des données et sécurité

### B1 — Un kiné peut effacer un autre kiné (critique, vérifié à la lecture)

- **Ce qui ne va pas.** La règle qui autorise un kiné à créer une fiche patient vérifie seulement « ce patient est à moi » ; elle ne vérifie pas *qui* est ce patient. Et la fonction de suppression efface n'importe quel compte sans contrôle.
- **Où.** `supabase/migrations/0031_rls_clerk_identity.sql:82-85` (règle `patients_insert_by_instructor`) ; aucun garde-fou à la création — les protections `0061_security_lockdown.sql:210` et `0063_audit_lockdown.sql:173` ne jouent qu'à la *modification* ; `internal.delete_app_user_by_id` (`0061_security_lockdown.sql:131`) ; `app/dashboard/patients/[id]/actions.ts:109` et `:144`.
- **Scénario.** Un attaquant crée un compte kiné (ouvert, approuvé d'office). Il récupère l'identifiant interne du kiné B (il figure dans le lien/QR code `/rejoindre/<identifiant>.…` de B, et sur ses exercices publiés). Avec sa propre session, il envoie directement à la base « nouveau patient : identifiant = B, kiné = moi ». Puis il clique « Supprimer le patient ». Le site supprime la fiche, puis le compte interne de B : la fiche kiné de B et **tous ses patients, profils, séances, messages** partent en cascade. S'il a mis l'e-mail de B, le compte de connexion Clerk de B est supprimé aussi.
- **Correction proposée.** (1) Ne plus laisser les kinés créer une fiche patient directement : passer par une fonction serveur, ou ajouter un garde-fou « à la création » qui refuse un identifiant déjà kiné ou déjà rattaché à un compte de connexion. (2) Faire refuser à la suppression tout identifiant présent dans `instructors`. C'est une migration qui touche au cloisonnement : à expliquer et tester à blanc avant application, comme d'habitude.

### B2 — Accès gratuit et CGU cochées à la place du patient (élevé, vérifié à la lecture)

- **Où.** Même règle d'insertion ; `trial_ends_at` et `terms_accepted_at` ne sont protégés qu'à la modification (`0061:196-213`, `0063:153-176`) ; l'accès gratuit est lu dans `app/patient/layout.tsx:98`.
- **Scénario.** Le kiné invite un patient normalement, supprime sa fiche par la base puis la recrée avec « essai jusqu'en 2099 » et « CGU acceptées ». Le patient ne paie jamais EasyPhysio, et la preuve d'acceptation des CGU est fausse.
- **Correction.** Le même garde-fou de création force ces champs à vide.

### B4 — Paiement et consentement contrôlés seulement par l'écran (élevé pour l'argent et la conformité, vérifié à la lecture)

- **Ce qui ne va pas.** Le contrôle « a-t-il payé ? a-t-il accepté les CGU ? » est fait dans le cadre commun des pages patient (`app/patient/layout.tsx:116-127`). Dans Next.js, ce cadre n'est pas rejoué à chaque page, et il ne protège jamais les actions serveur ni la base.
- **Où.** `lib/patient/requirePatientAccess.ts:7` (ne vérifie que le consentement santé) ; `app/patient/actions.ts:62` (`sendPatientMessage`) ; `app/patient/onboarding/actions.ts:13` ; `lib/storage/video-actions.ts:21-24` (`signExerciseVideo` : n'importe quel compte connecté) ; `components/WorkoutSession.tsx:519-604` (écritures directes en base).
- **Scénario.** Un patient dont la carte est refusée (ou qui n'a jamais payé) demande directement la page de séance : il reçoit la séance guidée et des liens vidéo valables 6 heures. Il peut aussi envoyer des messages et des notes de douleur sans avoir accepté ni CGU ni consentement santé. Toute personne ayant un compte Clerk, même sans fiche, peut faire signer les vidéos de la plateforme.
- **Correction.** Une seule fonction « accès patient complet » (CGU + consentement + paiement) appelée dans chaque page patient, chaque action patient et `signExerciseVideo` ; idéalement, une condition dans les règles de la base pour les écritures du patient.

### S1 — Aucun en-tête de sécurité (moyen, vérifié sur le site)

- **Constat.** Les réponses du site ne portent ni `Content-Security-Policy`, ni `X-Frame-Options`, ni `X-Content-Type-Options`, ni `Referrer-Policy`. Seul HSTS est présent (ajouté par Scalingo, sans `includeSubDomains`). L'en-tête `X-Powered-By: Next.js` est affiché.
- **Où.** `next.config.ts:41` (seul un cache d'images y est réglé).
- **Scénario.** Un site piégé affiche `/admin` ou `/dashboard` dans un cadre invisible et fait cliquer Philippe sur « Suspendre » ou « Supprimer » (« clickjacking »).
- **Correction.** Ajouter dans `next.config.ts` : `frame-ancestors 'none'`, `nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `poweredByHeader: false`, puis une CSP.

### S2 — Bibliothèque lisible sans connexion (moyen, vérifié)

- **Test fait** (simple lecture, sans compte, sur `easyphysio-postgrest.osc-fr1.scalingo.io`) : `conditions` → 71 lignes, `workouts` → 172 (dont 3 créées par des kinés), `workout_exercises` → 281. En revanche **0 ligne** pour `patients`, `patient_profiles`, `workout_logs`, `patient_messages`, `patient_feedback`, `subscriptions`, `monthly_reviews`, `push_tokens`, `cabinet_members`, `instructors`, `exercises`, et aucune séance propre à un patient. `waitlist` est bien introuvable (404).
- **Où.** `0001_initial_schema.sql:141`, `0032:66,76`, `0044_patient_workouts.sql:28,57` — même trou que celui fermé pour `exercises` par 0067.
- **Dégât.** Le contenu de la bibliothèque (et les titres de séances écrits par des kinés) peut être aspiré par un concurrent. Pas de donnée de santé.
- **Correction.** Ajouter « utilisateur connecté » à ces cinq règles. `CLAUDE.md` §3 dit d'ailleurs « lisible par les utilisateurs connectés » : le code s'en écarte.

### S3 — Identité fondée sur l'e-mail (moyen, dépend des réglages Clerk)

- **Où.** `0076_relink_verified_email.sql:43-45` (le rattachement d'un compte invité ne demande pas que l'e-mail soit vérifié) ; `lib/supabase/require-user.ts:142` et `lib/admin.ts` (l'administrateur = une liste d'e-mails).
- **Scénario.** Si un jour Clerk laisse entrer quelqu'un avec un e-mail non vérifié, il lui suffit de s'inscrire avec l'adresse d'un patient invité pour devenir ce patient ; avec l'adresse de Philippe, pour devenir admin.
- **Correction.** Exiger « e-mail vérifié » partout avant de reconnaître quelqu'un ; reconnaître l'admin par son identifiant Clerk en plus de l'e-mail. **À vérifier dans Clerk** : vérification d'e-mail obligatoire à l'inscription.

### S4 — La production fait confiance aux clés Clerk de développement (moyen)

- **Où.** `infra/postgrest/README.md:24`. Quiconque détient la clé secrète de l'instance de développement (présente dans des `.env.local` de PC) peut fabriquer une session pour tout compte encore rattaché à un identifiant de développement.
- **Correction.** Au lancement, retirer les clés de développement de `PGRST_JWT_SECRET` et nettoyer les anciens identifiants.

### S5 — « RLS forcé » non garanti par les migrations (élevé si faux, non vérifiable sans la base)

- **Constat.** Tout le site utilise un seul rôle Postgres, propriétaire des tables. Le cloisonnement ne tient que si chaque table est en « FORCE ROW LEVEL SECURITY ». Les migrations ne le posent que sur certaines tables ; pour `patients`, `patient_profiles`, `workout_logs`, `patient_messages`, `subscriptions`… les commentaires (`0058:17`, `0061:7`) disent que c'est fait à la main sur Scalingo.
- **Indice rassurant.** Mon test anonyme renvoie 0 ligne sur ces tables : le verrou est très probablement en place aujourd'hui.
- **Risque.** Lors de la reconstruction pour la région HDS, l'oublier rendrait ces tables lisibles par tout Internet.
- **Correction.** Une migration qui force RLS sur toutes les tables publiques ; requête de contrôle : `select relname, relrowsecurity, relforcerowsecurity from pg_class where relnamespace='public'::regnamespace and relkind='r';`

### Points plus petits (faible à moyen)

- **Kiné suspendu pas bloqué partout** : la règle de blocage (`0063:131-135`) ne couvre pas `workouts`, `workout_exercises`, `monthly_reviews`, `patient_follow_ups`, `exercises` ; un kiné suspendu peut encore lire des séances de patients et ajouter du contenu de bibliothèque via la base.
- **Règles de modification incomplètes** : `workouts_update_owner` (`0031:153`) ne revérifie pas `patient_id` ; `workout_ex_write_owner` (`0031:160`) accepte n'importe quel exercice (combiné à `0085:431`, permet de lire un exercice privé dont on connaît l'identifiant) ; un kiné peut **supprimer** le profil santé et le consentement d'un patient (`0031:177`, la protection `0063:201` ne couvre pas la suppression).
- **`exercises.media_url` libre** (`0061:222`, `lib/storage/r2-videos.ts:51-53`) : un kiné peut y mettre une adresse externe (pixel de pistage chargé par ses patients et par Philippe dans `/admin`) ou viser la vidéo d'un autre. Un exercice « en attente » peut être modifié entre la relecture de Philippe et le clic « Publier ».
- **Fonction `cabinet_of`** (`0085:129`) appelable par n'importe qui : donne le cabinet d'un kiné.
- **Le patient voit toute la fiche de son kiné** (SIRET, téléphone, statut) : `0031:61`.
- **Recherche de cabinets et RPPS sans limite ni connexion** (`app/signup/kine/actions.ts:9,20`) : on peut lister tous les cabinets ; l'appel à l'Annuaire Santé n'a pas de délai maximum (`lib/instructor/rppsLookup.ts:51`).
- **Messages d'erreur bruts de la base renvoyés au navigateur** : `app/dashboard/patients/[id]/actions.ts:389,428`, `app/dashboard/seances/actions.ts`.
- **Secret du rappel quotidien** comparé sans protection « temps constant » (`app/api/cron/rappels/route.ts:14`) ; un secret absent est bien refusé.
- **Pas de longueur maximale** sur les messages.
- **`lib/requestOrigin.ts:13`** : si `NEXT_PUBLIC_SITE_URL` venait à manquer, un lien d'invitation pourrait pointer vers un site pirate. Faire échouer plutôt.

### Vérifié et correct

- Toutes les actions `/admin` vérifient l'admin côté serveur ; toutes les actions `/dashboard` exigent un kiné approuvé ; l'identité vient toujours de la session, jamais du navigateur.
- Un kiné ne peut pas s'approuver, lever sa suspension, se donner « RPPS vérifié », changer son compte Stripe, publier lui-même un exercice.
- Un patient ne peut modifier ni son kiné, ni son essai, ni son e-mail, ni son consentement.
- Cloisonnement entre kinés correct sur : profils, ressentis, séances faites, messages, séances recommandées, notes d'honoraires, abonnements, jetons de notification, cabinets (un collègue ne voit jamais les patients d'un autre).
- Le schéma `internal` n'est pas exposé ; aucune injection SQL (requêtes paramétrées partout) ; aucune vue.
- Notes d'honoraires, CSV, export de données : pas d'accès possible en changeant un identifiant dans l'adresse.
- Lien QR code signé correctement ; envoi de vidéo limité à l'exercice du kiné ; pas de redirection ouverte ; pas de secret dans le code envoyé au navigateur.
- `/demo` et `/prototypes/*` sont publics mais ne montrent que des données fictives.
- `/admin`, `/dashboard`, `/patient`, `/documents` renvoient bien vers `/login` sans session (testé).

---

## 2. Argent

### B5 — Supprimer un patient efface les notes d'honoraires (élevé, vérifié)

- **Où.** `supabase/migrations/0071_monthly_review_billing.sql:92` (suppression en cascade) et `:247` (numéro = plus grand numéro + 1) ; déclenché par `app/dashboard/patients/[id]/actions.ts:109` et `app/patient/compte/actions.ts:67`.
- **Scénario.** Un patient paie 6 € en octobre (note 2026-0007) puis supprime son compte. La note disparaît du récapitulatif et du CSV du kiné alors que l'argent est sur son compte Stripe ; le patient suivant reçoit de nouveau le numéro 2026-0007. La politique de confidentialité promet pourtant « supprimées ou anonymisées, sauf obligation légale de conservation ».
- **Correction.** Garder la ligne de facturation (patient anonymisé, nom figé sur la note) et numéroter avec un compteur par kiné et par année. À valider avec un comptable.

### M1 — Essai gratuit reprenable à l'infini (vérifié à la lecture)

- **Où.** `app/patient/suivi/actions.ts:111` (`firstTime = !sub`).
- **Scénario.** Le patient supprime son compte, rescanne le QR code avec le même e-mail : 10 nouveaux jours gratuits, indéfiniment — et le kiné ne touche jamais ses 6 € (pas de prélèvement pendant l'essai). Même ligne : si la lecture de l'abonnement échoue, le site croit que c'est une première fois.
- **Correction.** Garder une trace côté serveur de l'essai déjà consommé (empreinte de l'e-mail) ; refuser en cas d'erreur de lecture.

### M2 — Engagement contournable, résiliation pendant l'essai, rétractation (vérifié)

- Sortir d'un engagement 6 mois : supprimer son compte (`compte/actions.ts:47`), se faire supprimer par le kiné, ou laisser la carte échouer puis se réabonner (`suivi/actions.ts:90-92`). On peut donc toujours prendre 2,99 € et partir au bout d'un mois.
- À l'inverse, résilier le premier jour de l'essai d'une offre 3 ou 6 mois fixe la fin à « fin d'essai + 3 ou 6 mois » (`suivi/actions.ts:193-207`) : le patient est prélevé chaque mois.
- Les CGU et la case à cocher promettent qu'en cas de rétractation sous 14 jours seule la période utilisée est due (`legal/cgu.md:73`, `messages/fr/billing.json:192`) : **aucun code ne le fait**.
- **Correction.** Décider la règle avec un juriste ; au minimum, résilier pendant l'essai doit arrêter à la fin de l'essai.

### M3 — Double paiement possible d'un mois réglé à la main (vérifié dans le code)

- **Où.** `app/patient/suivi/actions.ts:346`, `lib/billing/followUp.ts:177`, `:142-156`.
- **Scénario.** Si le point d'entrée Stripe « Connect » ne reçoit pas `payment_intent.succeeded` (encore à régler d'après `CLAUDE.md`), le mois reste « refusé », le bouton « Payer » reste affiché, et le patient peut payer 6 € plusieurs fois. Deux onglets ouverts font aussi payer deux fois.
- **Correction.** Vérifier le paiement au retour de Stripe (comme pour l'abonnement) et relire le paiement existant avant d'en créer un nouveau.

### M4 — L'accord écrit du patient n'est pas conservé (vérifié)

- **Où.** `app/patient/suivi/actions.ts:71` : on teste que la case est cochée, rien n'est enregistré (ni date, ni montants, ni version du texte). `patient_follow_ups.consented_at` est posé par le serveur au moment de la copie de carte (`0071:205`). Si le patient change de kiné, la carte est copiée chez le nouveau sans nouvel accord (`lib/billing/autoReview.ts:66-79`).
- **Dégât.** En cas de contestation (art. R.4321-98 CSP, information préalable sur le prix), aucune preuve.
- **Correction.** Enregistrer date, offre, les deux montants et la version des CGU ; redemander l'accord en cas de changement de kiné.

### M5 — Abonnements en double (suspecté)

- **Où.** `app/patient/suivi/actions.ts:80,91`, `0086_stripe_audit.sql:98-104`. Deux paiements Checkout terminés dans deux onglets : la base garde le plus récent, l'ancien continue d'être prélevé chez Stripe sans que le site le voie.
- **Correction.** Avant chaque paiement et à chaque synchronisation, lister les abonnements du client chez Stripe et arrêter les doublons.

### M6 — 6 € prélevés après résiliation (vérifié — décision de Philippe)

- **Où.** `lib/billing/patientPlans.ts:205` : la règle ignore « résilié, court jusqu'à la fin ». Avec un engagement 6 mois, jusqu'à 5 prélèvements kiné après la résiliation, alors que `CLAUDE.md` dit « résilier arrête les deux paiements » et que `app/dashboard/facturation/page.tsx:53` exclut déjà ces patients du revenu attendu. À noter aussi : une mise à jour le 30 novembre et une le 1er décembre = deux prélèvements en deux jours (conforme au modèle, mais surprenant pour le patient).

### M7 — TVA : restes de l'ancien réglage

- `legal/cgu.md:59` dit encore « TVA 20 % incluse » (les textes affichés sur le site sont corrects) ; `legal/mentions-legales.md:12` garde un champ « Numéro de TVA ».
- Les abonnements créés du 4 au 8 novembre portent encore le taux de 20 % (le commit `8bf881c` ne change que les nouveaux) : leurs factures afficheraient une TVA qu'une micro-entreprise en franchise ne doit pas facturer. **À vérifier dans Stripe.**

### Points plus petits

- Un plantage entre l'enregistrement de la note et le prélèvement laisse une note numérotée « en attente » pour toujours, sans relance (`lib/billing/autoReview.ts:83-96`). Une note est numérotée même quand le paiement échoue (`lib/billing/feeNotes.ts:92`).
- « Refuser » un kiné dans `/admin` (`app/admin/actions.ts:34`) donne l'accès gratuit à ses patients sans arrêter leurs abonnements, contrairement à la suspension.
- Fin d'engagement calculée au mois calendaire en heure de Paris (`lib/billing/patientPlans.ts:126`) : un départ le 31 ou un changement d'heure peut créer une petite facture au prorata (suspecté).
- `lib/billing/signing.ts:17` utilise la clé Stripe si `STRIPE_SIGNING_SECRET` manque : fonctionne, mais mieux vaut une clé dédiée.
- Une ancienne formule sur le compte d'un kiné reste acceptée si elle est signée (`lib/billing/patientSubscription.ts:52`) : refuser celles créées après le 4 novembre.

### Vérifié et correct

- Webhook : signature vérifiée sur le contenu brut, pour les deux points d'entrée ; refus si le secret manque ; erreurs renvoyées à Stripe pour nouvelle tentative ; rejouer un événement ne casse rien.
- Aucun `application_fee` nulle part : EasyPhysio ne prend rien sur le paiement du kiné.
- Les prix viennent toujours du serveur (`lib/billing/patientPlans.ts`), jamais du navigateur ; la signature empêche de réutiliser un paiement pour un autre patient ou une autre offre.
- Carte refusée, impayé, incomplet, en pause : accès coupé tout de suite.
- Les 6 € : une seule fois par patient et par mois (contrainte en base + verrou + clé anti-doublon Stripe), jamais pendant l'essai, mois calculé en heure de Paris.
- Suppression de compte, suppression de patient, suspension : l'abonnement est arrêté chez Stripe d'abord, et tout s'arrête si Stripe échoue.
- `app/api/cron/facturation` n'existe plus et plus rien n'y fait référence.
- 180 tests automatiques passent (0 échec).

### À vérifier dans Stripe (impossible pour moi)

Mode réel ; les deux points d'entrée webhook et leurs événements ; les secrets sur Scalingo ; abonnements encore à 20 % ; mention « TVA non applicable, art. 293 B du CGI » visible sur les factures ; copie de carte vers les comptes des kinés en mode réel ; e-mails de reçu activés. Mentions des notes d'honoraires (`components/FeeNoteSheet.tsx`, exonération art. 261-4-1° CGI, pas de SIRET/ADELI) : à faire valider par un comptable.

---

## 3. Comptes et conformité

### B6 — Pages légales (vérifié sur le site ; à confier à un avocat, je n'ai rien réécrit)

- **Mentions légales en ligne** : « [Raison sociale à compléter], [forme juridique]. Siège social : [adresse]. Directeur de la publication : [nom]. Contact : [email de contact] » (`messages/fr/legal.json`, `app/mentions-legales/page.tsx:33`). Obligatoire pour tout site (loi LCEN) ; le SIREN 132628306 existe maintenant.
- **CGU et confidentialité** affichent « Brouillon… pas encore validé par un avocat » ; aucun e-mail de contact (« contactez-nous depuis votre compte »), pas de médiateur de la consommation, pas de durées de conservation, droit de rétractation absent de la page CGU en ligne.
- **Promesses inexactes aujourd'hui** : CGU « hébergement sécurisé des données de santé », accueil « Vos données sont hébergées en France » (`messages/fr/home.json:18,123`) alors que l'hébergement n'est pas HDS et que Clerk et les notifications passent par les États-Unis. La liste des sous-traitants ne cite ni Scalingo, ni Cloudflare R2, ni Expo/Apple/Google.
- **Témoignages inventés** : « Julien M., kinésithérapeute, Lyon », « Claire D., patiente », « Nadia B. » — le code le dit lui-même (`components/Testimonials.tsx:22-23` : à remplacer « when the testimonials are real »). De faux avis sont une pratique commerciale trompeuse : à retirer ou à remplacer par de vrais avis consentis avant de communiquer.
- Les fichiers `legal/*.md` sont en retard sur les pages affichées (Outscale, Brevo, « documents médicaux », HDS affirmé).
- Français et anglais existent avec les mêmes clés ; l'anglais porte bien le bandeau « traduction provisoire ».

### C1 — La suppression laisse des données chez les prestataires (vérifié dans le code)

- **Où.** `app/patient/compte/actions.ts:38-58`, `app/dashboard/patients/[id]/actions.ts:88-107`. Seul l'abonnement est arrêté. Restent : le client Stripe (nom, e-mail) chez EasyPhysio et sa copie avec la carte sur le compte du kiné ; le compte Clerk si trois tentatives échouent, sans alerte. Aucun appel de suppression R2 n'existe : les vidéos filmées par un kiné restent après suppression de l'exercice.
- **Correction.** Détacher la carte et supprimer/anonymiser les deux clients Stripe ; signaler dans `/admin` les nettoyages incomplets ; supprimer les vidéos R2.

### C2 — Suppression d'un compte kiné : pas de procédure (vérifié)

- `/admin#suppressions` est une simple liste (`app/admin/page.tsx:361-380`). Une suppression faite à la main en base emporterait tous ses patients sans arrêter leurs abonnements Stripe ni supprimer les comptes Clerk ni les vidéos. Un kiné suspendu ne peut pas demander la suppression (`app/dashboard/informations/actions.ts:14`). Exigé par Apple et par le RGPD : écrire la procédure pas à pas avant le lancement.

### Autres points

- **Preuve de consentement faible** (`0018`, `0019`) : seulement une date, pas la version du texte ni la langue ; aucun moyen de retirer le consentement santé sans supprimer le compte, alors que la politique le promet « à tout moment ». Les kinés n'acceptent ni CGU ni contrat de sous-traitance à l'inscription.
- **C3 — Badge « RPPS vérifié »** (`lib/instructor/rppsVerification.ts:53-81`, `app/signup/finalize/page.tsx:113-124`) : simple comparaison du nom choisi avec l'annuaire public. Quelqu'un s'inscrit « Jean Dupont » avec le RPPS public de Jean Dupont et obtient le badge. Avec l'approbation automatique, un faux kiné pourrait recevoir des patients et des paiements au lancement. Renommer en « RPPS déclaré » ou ajouter un vrai contrôle.
- **C4 — Invitations** (dormant tant que les invitations sont fermées) : `addPatient` répond différemment selon que l'adresse est déjà patiente, kiné ou inconnue (`app/dashboard/patients/actions.ts:71,80,111`) — révèle qu'une personne est suivie par un kiné ; pas de limite d'envoi ; la limite par adresse IP se contourne peut-être (`lib/rateLimit.ts:39`). La limite de 20 inscriptions par jour est dans la migration 0087, non appliquée.
- **C5 — Double rôle** : la règle `instructors_insert_self` (`0061:168`) laisse un patient se créer une fiche kiné ; s'il supprime ensuite son compte, la fiche kiné et ses patients partent avec.
- **Export de données** (`app/patient/compte/export/route.ts`) : il manque les jetons de notification, la langue, les exercices réservés au patient, les identifiants Stripe.
- **Notifications** : le texte « message de votre kiné » (`lib/push/notify.ts:23`) révèle à Expo/Apple/Google que la personne a un kiné ; l'adresse envoyée au kiné contient l'identifiant du patient (déjà noté le 8 novembre).
- Les comptes de test envoient encore `role: "patient"` à Clerk (`app/admin/testAccountActions.ts:102`) — personnes fictives, mais contraire à la règle de `CLAUDE.md` §8.

### Vérifié et correct

- `PATIENT_INVITATIONS_OPEN` est respecté côté serveur partout (ajout, réactivation, QR code) ; `SIGNUPS_OPEN` aussi.
- Les invitations Clerk n'envoient plus que le nom (pas de rôle, pas de nom du kiné).
- PostHog : sans cookie, sans identification, sans enregistrement d'écran, espace patient exclu, « Do Not Track » respecté. Le bandeau cookies du site est donc exact. Reste à cocher « ne pas conserver l'adresse IP » dans PostHog.
- Les métadonnées Stripe ne contiennent aucune information de santé.

---

## 4. Solidité et qualité

- **B3 — Next.js 16.3.8 : faille critique** (`npm audit` : exécution de code à distance par le service d'optimisation d'images avec des fichiers SVG, et blocage du site par les actions serveur). Correctif : `next` 16.4.6, mise à jour mineure. Je n'ai pas vérifié si le site est réellement exposé (le service d'images répond bien sur `/_next/image`) : dans le doute, mettre à jour et retester. Aussi : `zod` (élevé, dépendance indirecte, correctif disponible) et 8 alertes modérées dans les outils de développement (sans effet sur le site).
- **Vérification des types** (`tsc`) : 0 erreur. **Tests** : 180 réussis. **Lint** : 2 erreurs (`components/DemoShell.tsx:120`, `components/KineWeekProgramme.tsx:192` — mise à jour d'état dans un effet, risque de double affichage) et 2 avertissements.
- **Build complet** : non lancé (il a besoin des variables d'environnement, que je ne devais pas lire).
- **Dépendances en retard** sans urgence : Clerk 7.8 → 7.9, Stripe 22.3 → 22.6, supabase-js, lucide.
- **Code mort des anciens modèles** : dans `lib/billing/reviewModel.ts` (`followUpSetupMetadata`, `patientMustAcceptFollowUp`, `effectiveReviewPrice`, `REVIEW_PRICE_*`) ; dans `lib/db/admin.ts:296-361` (`platformBillingList`, `platformInvoicesList`, `platformPlans`, `platformInvoicesWithEnd` — les deux dernières appellent des fonctions de la migration 0078 jamais appliquée) ; `review_price_cents` encore lu dans `app/patient/layout.tsx:38` ; `vercel.json` ; `lib/storage/s3.ts` (Outscale, en sommeil).
- **`lib/db/admin.ts:487,496`** appellent `join_link_pending_patient_name` et `join_link_undo`, créées par la migration **0087 non appliquée** (B7) : l'inscription par QR code plantera sur ces chemins. À appliquer avant d'ouvrir les invitations.
- **Dérives de `CLAUDE.md`** (à corriger dans le fichier) : « `proxy.ts` limite les requêtes à 10 Mo » — `proxy.ts` ne contient rien de tel ; « taux de TVA 20 % `platformVatRateId` » — supprimé par le dernier commit ; §3 « conditions/workouts lisibles par les utilisateurs connectés » — lisibles par tous (S2) ; §7 « ce qui reste » périmé (déjà noté le 8 novembre) ; la consigne reçue pour cet audit disait `SIGNUPS_OPEN = false`, le code dit `true`.

Le détail (pannes mal gérées, textes en dur, code mort, tests) est en annexe A ci-dessous.

### Annexe A — Détail qualité (sous-audit du code)

**A1 — Une panne de lecture peut finir en dossier patient effacé (élevé, vérifié à la lecture, non reproduit).**
- **Où.** `app/patient/layout.tsx:36-50` : la lecture de la fiche patient ignore l'erreur ; si la base ne répond pas (redémarrage de PostgREST, souci de clés Clerk), le site conclut « aucune fiche » et affiche l'écran « compte orphelin » qui propose de supprimer l'identifiant. `deleteOrphanIdentity` (`app/patient/compte/actions.ts:92-116`) refait la même lecture sans regarder l'erreur, puis appelle `deleteAppUserById` — par l'autre connexion, qui, elle, fonctionne — et tout le dossier du patient part en cascade.
- **Scénario.** PostgREST redémarre 30 secondes ; un patient ouvre l'appli, lit « votre compte n'est rattaché à aucun kiné », clique « supprimer » : séances, ressentis, messages perdus.
- **Correction.** S'arrêter avec un message « réessayez » quand la lecture échoue ; et faire refuser à `internal.delete_app_user_by_id` tout identifiant qui a une fiche patient ou kiné (ce qui ferme aussi B1).

**A2 — Suppression de compte sans arrêt de l'abonnement** (`app/patient/compte/actions.ts:39-43`, `app/dashboard/patients/[id]/actions.ts:88-92`) : la lecture de l'abonnement n'est pas vérifiée ; si elle échoue, l'arrêt Stripe est sauté, les données sont supprimées et le patient continue d'être prélevé. Correction : abandonner si la lecture échoue.

**A3 — Aucune page d'erreur maison** : pas de `error.tsx` ni `global-error.tsx`. À la moindre erreur imprévue, l'utilisateur voit la page d'erreur brute de Next.js, en anglais. Ajouter `app/global-error.tsx` et un `error.tsx` dans `app/dashboard`, `app/patient`, `app/admin` ; un `loading.tsx` dans `app/dashboard`.

**A4 — Ressenti de douleur perdu sans prévenir** : `components/WorkoutSession.tsx:543,554` ignorent l'échec d'enregistrement ; l'alerte douleur du kiné et le frein de progression manquent alors des données.

**A5 — Lectures sans limite à chaque page kiné** : `lib/dashboard/homeData.ts:121`, `lib/dashboard/patientRows.ts:175` chargent toutes les séances de tous les patients depuis toujours ; aussi `app/dashboard/patients/[id]/page.tsx:91,93,103`, `app/patient/progres/page.tsx:20`. Le tableau de bord ralentira avec le temps : limiter à une fenêtre de dates.

**A6 — Écritures non vérifiées** : date d'accord de la personne filmée (`app/dashboard/exercises/actions.ts:188` — c'est la preuve légale) ; « Ajuster la séance » sans transaction, peut laisser une séance vide (`app/dashboard/patients/[id]/actions.ts:404-424`) ; changement de pathologie à moitié appliqué (`:181`) ; création Stripe Connect (`app/dashboard/connect/actions.ts:26-30`, risque d'un second compte). 71 lectures au total ne regardent pas l'erreur.

**A7 — Double clic** : pas d'état « en cours » sur supprimer un patient (`components/PatientActionsMenu.tsx:391-395`), attribuer une pathologie, envoyer un message kiné (`components/KineMessagesView.tsx` — messages en double), `app/signup/onboarding/SignupOnboardingView.tsx`, approuver/suspendre dans `/admin`. `components/SubmitButton.tsx` existe déjà pour ça.

**A8 — Langues.** Très propre : 1 974 clés, aucune manquante en anglais, toutes les clés utilisées existent. Restes en français seul : messages d'erreur venant de la base (`lib/format/dbError.ts:35`), image de partage (`app/opengraph-image.tsx:56,59,76`), « vidéo trop lourde » (`components/KineVideoUpload.tsx:58`), « Prélèvement SEPA » (`lib/billing/followUp.ts:58`, `lib/billing/patientSubscription.ts:117`), `/admin` entier (acceptable : un seul lecteur).

**A9 — Code mort supplémentaire** : `app/api/protocol/route.ts` + `lib/ai/protocol.ts` (protocole inventé, appelable par tout kiné approuvé, aucun écran ne l'utilise — à supprimer ou réserver à l'admin, cf. `CLAUDE.md` §7) ; ancien envoi de vidéos vers Supabase encore branché pour l'admin (`components/ExerciseLibraryGrid.tsx:459` → `lib/supabase/admin.ts`, clé `SUPABASE_SERVICE_ROLE_KEY`) ; `lib/patient/historyWindow.ts` jamais importé ; `app/signup/pending` probablement inutile ; variables d'environnement obsolètes (`S3_*`, `STORAGE_PROVIDER`, `SUPABASE_*STORAGE*`) et variables utilisées mais absentes de `.env.example` (`STRIPE_CONNECT_WEBHOOK_SECRET`, `CRON_SECRET`, `EXPO_ACCESS_TOKEN`, `APP_STORE_URL`, `PLAY_STORE_URL`, `APPLE_TEAM_ID`, `ANDROID_CERT_SHA256`).

**A10 — Autres dérives de `CLAUDE.md`** : « `CRON_SECRET` désormais inutile » et « `cron.json` supprimé » sont faux (le rappel quotidien les utilise) ; §3 dit `subscriptions` « inutilisée » alors que c'est la table vivante de l'abonnement d'accès ; `components/PricingSection.tsx` cité mais inexistant ; montants nets calculés avec TVA ; 307 noms d'exercices et non 306 ; l'en-tête de `lib/launchFlags.ts` décrit encore `SIGNUPS_OPEN = false`.

**A11 — Tests manquants sur le plus sensible** : signatures des paiements (`lib/billing/subscriptionSignature.ts`, `signing.ts`), synchronisation des abonnements, prélèvement des 6 € (`followUp.ts`, `autoReview.ts`), lien QR code, ordre des barrières patient, suppressions de compte, route webhook. Aucun test d'écran ni de parcours complet.

---

## 5. Le site public vu par un visiteur

Testé sans connexion, sans envoyer aucun formulaire.

**Ce qui marche**
- Les quatre domaines : `http://` → `https://` (301) ; `www.easyphysio.fr`, `easy-physio.fr`, `www.easy-physio.fr` → `https://easyphysio.fr` (301, chemin et paramètres conservés). Certificats valides.
- Aucune erreur dans la console sur l'accueil, `/demo`, `/signup/kine`, `/mentions-legales`, `/confidentialite` (un simple avertissement Clerk sans conséquence).
- Rapidité correcte : première réponse ≈ 0,2 s, page chargée ≈ 1,3 s, ≈ 1,4 Mo ; les vidéos ne se chargent qu'à la demande.
- Téléphone (375 px) : pas de défilement horizontal, mise en page propre. Une page inconnue renvoie bien une erreur 404. `/.env` et `/.git` introuvables.
- Un seul titre principal, toutes les images ont un texte alternatif, tous les boutons ont un nom, `lang="fr"`.

**À corriger**
- **Titre identique sur presque toutes les pages** (« EasyPhysio, suivi d'exercices de rééducation » sur `/login`, `/signup`, `/cgu`, `/confidentialite`, `/mentions-legales`) : donner un titre par page.
- **Pas d'adresse canonique**, et le site répond en entier sur `https://easyphysio.osc-fr1.scalingo.io/` (nécessaire pour Stripe) : Google peut voir deux sites identiques. Ajouter `<link rel="canonical">` vers `easyphysio.fr`, ou « noindex » sur l'hôte Scalingo.
- **Plan du site** : contient `/login` et `/signup` (peu utiles) ; pas de données structurées (schema.org) ; `/praticiens` redirige vers l'accueil.
- **En-têtes de sécurité absents** (voir S1).
- **Liens d'application mobile** : `/.well-known/apple-app-site-association` et `assetlinks.json` renvoient 404 (normal tant que les variables ne sont pas posées — à faire avant de publier l'appli).
- Les vidéos de démonstration (`/videos-demo/*.mp4`, ≈ 0,5 Mo chacune) sont servies sans mise en cache (`max-age=0`) : chaque visite les retélécharge.
- Sur téléphone : 14 zones cliquables de moins de 32 px de haut et 21 textes sous 12 px (lisibilité et confort du doigt).
- Page d'accueil : un lien sortant vers `injurymap.com` (comparaison) — vérifier que la comparaison avec un concurrent nommé est exacte et à jour (publicité comparative).
- Écran d'ouverture animé (logo sur fond bleu) avant l'accueil sur téléphone : retarde d'environ 2 s l'affichage du contenu.

---

## 6. Ce que je n'ai pas pu vérifier

- Tout ce qui demande un compte connecté en production (parcours kiné et patient réels, écrans après connexion).
- La base réelle : quelles migrations sont vraiment appliquées (le journal est incomplet), verrou RLS forcé table par table, règles réellement en place (`pg_policies`).
- Le tableau de bord Stripe (mode, webhooks, factures, TVA), Clerk (vérification d'e-mail, réglages d'inscription), PostHog (adresse IP), Cloudflare R2 (pays de stockage, CORS), les variables d'environnement de Scalingo.
- Les failles B1, B2, B4 n'ont **pas été essayées en vrai** (cela aurait écrit dans la base de production) : elles sont établies par la lecture du code et des migrations. Un essai sur une copie de la base les confirmerait en quelques minutes.
- L'application mobile (`mobile/`) n'a pas été auditée en détail.

---

## 7. Ordre de travail proposé

1. **Tout de suite** (même avant le lancement, car exploitable aujourd'hui) : B1 + B2 (une migration « garde-fou à la création d'un patient » + refus de supprimer un kiné par ce chemin), B9/A1 et A2 (ne jamais supprimer quand une lecture a échoué), B3 (mise à jour de Next.js).
2. **Avant d'ouvrir les invitations patients** : B4 (contrôle serveur du paiement et du consentement), B5 (notes d'honoraires conservées), B7 (migration 0087, réglages Stripe), B6 (mentions légales, textes relus par un avocat, témoignages retirés), M1 à M4, S1 à S5, C1 à C3, puis B8 (HDS).
3. **Ensuite** : M5 à M7, C4, C5, points plus petits, section 4 et 5.

Rien n'a été corrigé : chaque correction est à décider par Philippe.
