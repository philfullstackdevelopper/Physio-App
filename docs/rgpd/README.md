# Dossier RGPD — EasyPhysio

> **BROUILLON rédigé par Claude — à faire valider par un juriste (Stanislas de Saint-Romain) avant usage. Rien ici n'est validé.**

_Rédigé le 2026-11-08 à partir du code de la branche `feat/hds-clerk-rgpd` (migrations `supabase/migrations/0001` à `0083`, `lib/`, `app/`). Quand le code change, ces documents doivent être relus._

## 1. Ce que contient ce dossier

| Fichier | À quoi il sert | Obligatoire ? |
|---|---|---|
| `registre-des-traitements.md` | La liste de tout ce qu'EasyPhysio fait avec des données personnelles : pourquoi, sur quelle base légale, quelles données, qui les voit, combien de temps, quelle sécurité. Deux parties : ce qu'EasyPhysio fait **pour son propre compte**, et ce qu'il fait **pour le compte de chaque kiné**. | Oui (art. 30 RGPD) — même sous 250 salariés, car il y a des données de santé (art. 30-5). |
| `aipd.md` | L'analyse d'impact : quels risques pour les patients si les données fuient, sont modifiées ou disparaissent, et ce qui est fait pour les réduire. Suit le plan de la méthode PIA de la CNIL. | Oui très probablement (données de santé + patients = personnes vulnérables : 2 critères sur 9 du G29 suffisent). |
| `accord-sous-traitance-kine.md` | Le contrat « article 28 » entre chaque kiné (responsable) et EasyPhysio (sous-traitant), à annexer aux CGU kiné. Contient la liste des sous-traitants ultérieurs. | Oui (art. 28 RGPD) si EasyPhysio est bien sous-traitant du kiné (voir question 1). |
| `politique-confidentialite-changements.md` | La liste des corrections à apporter à `legal/politique-confidentialite.md`, `legal/sous-traitants.md` et à la page en ligne `/confidentialite`, avec le passage actuel et la nouvelle formulation proposée. | Oui : plusieurs phrases actuelles sont fausses (voir §3). |

## 2. Qui fait quoi ensuite

**Philippe**
1. Remplir les « [à compléter] » qu'il est le seul à connaître : société (raison sociale, SIRET, adresse), contact RGPD, DPO éventuel, durées de conservation voulues.
2. Récupérer et signer / accepter les contrats de sous-traitance (DPA) des prestataires : Scalingo (avec l'option HDS), Clerk, Stripe, Expo, Cloudflare, PostHog. Garder une copie PDF datée de chacun.
3. Demander à Scalingo **par écrit** : périmètre exact du certificat HDS n° 38436 (activités 1 à 6 couvertes ?), pour la région `osc-secnum-fr1` + PostgreSQL Business + l'app PostgREST ; durée de conservation des sauvegardes et des journaux.
4. Vérifier dans Cloudflare la localisation du bucket R2 `easyphysio-videos` (juridiction UE possible ?) et dans PostHog que l'option « Discard client IP data » est activée.
5. Supprimer l'ancien projet Supabase (USA) une fois la bascule HDS faite et vérifiée.
6. Envoyer le dossier au juriste.

**Le juriste (Stanislas de Saint-Romain)**
1. Trancher les questions ouvertes du §4 (surtout la 1, la 2 et la 3 : elles changent la structure de tous les documents).
2. Valider ou corriger chaque document, puis la politique de confidentialité et les CGU qui en découlent.

**Claude (dans une prochaine session, sur demande de Philippe)**
1. Mettre à jour ces documents selon les réponses du juriste.
2. Appliquer les corrections validées dans `legal/*.md` et dans la page `/confidentialite` (aujourd'hui un texte séparé, écrit en dur dans `app/confidentialite/page.tsx`), puis rédiger les versions anglaises (le site doit devenir bilingue : toute nouvelle version juridique aura besoin d'un brouillon anglais, lui aussi à faire relire).
3. Combler les manques techniques listés dans le plan d'action de l'AIPD (§8 de `aipd.md`) — chacun après accord de Philippe.

## 3. Ce qui est faux aujourd'hui dans les textes en ligne ou en brouillon (résumé)

Détail et nouvelles formulations : `politique-confidentialite-changements.md`.

- `legal/politique-confidentialite.md` §5 affirme que les données de santé **sont** hébergées chez un hébergeur certifié HDS. C'est faux aujourd'hui : l'app tourne sur Scalingo `osc-fr1`, **non certifié HDS**. (La page en ligne `/confidentialite` dit, elle, « en cours de migration » : c'est exact.)
- `legal/politique-confidentialite.md` §2 et §6, `legal/sous-traitants.md` : mentionnent des **documents médicaux** stockés chez **Outscale** et un prestataire d'e-mails **Brevo**. Les documents médicaux ont été supprimés du produit (migration `0056`), Outscale n'est pas utilisé, et il n'y a pas de Brevo : ce sont **Clerk** qui envoie les e-mails d'invitation / de mot de passe.
- Sous-traitants **absents** des textes : Expo (notifications de l'appli mobile, USA), Cloudflare R2 (vidéos), PostHog (absent du `.md`, présent sur la page en ligne), Apple / Google (acheminement des notifications), API Annuaire santé.
- Aucun texte ne parle des **transferts hors UE** (Clerk et Expo aux USA, Stripe en partie).
- La page en ligne parle de « mesure anonyme » avec PostHog : l'adresse IP du visiteur peut encore arriver chez PostHog (la réécriture `/ingest` de `next.config.ts` relaie la requête ; l'option « ne pas garder l'IP » de PostHog est notée « à faire » dans les notes de Philippe). « Anonyme » est donc trop fort tant que ce n'est pas vérifié.
- Le texte dit que le consentement aux données de santé « peut être retiré à tout moment » : il n'existe **aucun bouton** pour le retirer, seulement la suppression complète du compte.
- Aucun texte ne parle de l'**appli mobile** (notifications, Face ID / empreinte — qui restent sur le téléphone) ni des **vidéos filmées par les kinés**.
- Le §7 « durées de conservation » n'est qu'une proposition ; dans le code, **rien n'est supprimé automatiquement** (ni patients inactifs, ni journaux applicatifs). Et quand un patient supprime son compte, ses **notes d'honoraires** (`monthly_reviews`) partent avec lui, alors que le kiné doit probablement les garder pour sa comptabilité.

## 4. Questions juridiques ouvertes (à trancher par le juriste)

1. **Rôle d'EasyPhysio.** Proposition retenue dans ces brouillons :
   - **sous-traitant de chaque kiné** pour le suivi de soin (programme, séances, douleur, messagerie, honoraires du kiné) ;
   - **responsable de traitement** pour ses propres finalités : comptes kinés, abonnement d'accès que le patient paie à EasyPhysio (modèle du 2026-11-04), mesure d'audience, liste d'attente, prospection des kinés, sécurité / journaux, publication d'exercices.
   À valider. Points qui font douter : c'est EasyPhysio, et non le kiné, qui définit le questionnaire, les écrans, le consentement, l'ordre des étapes (le patient paie EasyPhysio **avant** de donner son consentement santé) et vend un abonnement au patient → risque de requalification en **responsables conjoints** (art. 26) pour une partie du suivi.
2. **Base légale des données de santé.** Les textes actuels reposent sur le **consentement** (art. 9.2.a). Si le kiné est responsable, la base naturelle serait plutôt la **prise en charge sanitaire** (art. 9.2.h, avec secret professionnel du kiné). Le consentement oblige à pouvoir le **retirer** sans tout perdre, ce que l'appli ne permet pas aujourd'hui. Lequel retenir ?
3. **Clerk (USA, non HDS) et Stripe : détiennent-ils des données de santé ?** Selon la CNIL, les données collectées lors de l'inscription à un service de soins sont des données de santé. Clerk conserve le nom + l'e-mail de chaque patient sur un service dédié au suivi kiné (le rôle « patient » et le nom du kiné sont en cours de retrait dans cette branche, script `scripts/clerk-nettoyer-metadonnees.mjs`). Stripe sait qu'une personne paie un « programme mensuel hors nomenclature » à un kiné nommé. Est-ce acceptable hors HDS et hors UE (avec DPF / clauses types), ou faut-il un fournisseur d'identité HDS en France ?
4. **EasyPhysio doit-il être lui-même certifié HDS** (activité 5 « administration et exploitation du système d'information ») ? Philippe administre l'app et la base (déploiements, migrations, accès `db-tunnel`). Tout dépend des activités couvertes par le certificat Scalingo pour l'offre souscrite.
5. **Dispositif médical ?** L'appli affiche les exercices choisis par le kiné, mais fait aussi avancer **automatiquement** la phase de rééducation suggérée au fil des semaines, avec un « frein » qui la ralentit selon la douleur déclarée (`lib/exercise/stageProgress.ts`). Cela peut-il la faire entrer dans le règlement (UE) 2017/745 ? (Question déjà posée au G_NIUS, `docs/messages-validation-juridique.md`.)
6. **Conservation.** Combien de temps garder : les données de suivi après la fin du suivi ou l'inactivité ? Les notes d'honoraires (obligation comptable du kiné, pas d'EasyPhysio) ? Les factures d'accès d'EasyPhysio (10 ans, art. L.123-22 C. com.) ? Faut-il qu'EasyPhysio conserve le suivi pour le compte du kiné au titre de son dossier patient ?
7. **Mineurs.** Rien n'empêche un kiné d'inviter un patient mineur (la date de naissance accepte 0 à 120 ans). Faut-il un parcours avec titulaire de l'autorité parentale, ou interdire les moins de 15 ans ?
8. **Vidéos filmées par les kinés** (migration `0081`) : la case « la personne filmée a donné son accord » suffit-elle comme preuve du droit à l'image, et qui est responsable quand un exercice est publié pour tous les kinés ?
9. **Prospection des kinés par Gmail** (adresses professionnelles collectées) : information à donner, droit d'opposition, durée — et Gmail (Google, USA) comme outil.
10. **Mesure d'audience sans consentement** : PostHog sans cookie ni stockage sur l'appareil échappe à l'art. 82 de la loi Informatique et Libertés, mais traite quand même des données (IP, appareil). Le régime d'exemption CNIL est-il rempli (finalité strictement statistique, pas de recoupement, IP tronquée) ? L'espace kiné mesuré (adresses du type `/dashboard/patients/:id`) pose-t-il problème ?
