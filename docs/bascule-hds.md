# Bascule vers la région certifiée santé (HDS) — procédure pas à pas

*Préparée le 2026-11-08.* À dérouler dès que Scalingo a ouvert l'accès à
`osc-secnum-fr1` (relance envoyée à Mickaël le 8/11, fil Gmail « Accès à la
région osc-secnum-fr1 (HDS) pour EasyPhysio »). Durée : une demi-journée,
dont 15 à 60 min de coupure. **Philippe** = tableau de bord, case HDS,
OVH, Stripe. **Claude** = commandes. Rien d'irréversible avant l'étape 9.

Ce que Scalingo a confirmé par écrit (2 et 3 nov.) : pas d'outil
automatique ; annexe HDS acceptée en cochant la case HDS à la création de
l'app ; 2 conteneurs web minimum et base Business imposés ; PostgREST dans la
même région que la base ; 75,84 € HT / mois ; anciennes apps supprimables
après vérification.

## 0. Vérifier que l'accès est ouvert — Claude
```bash
scalingo --region osc-secnum-fr1 apps
```
Plus de « invalid region » = c'est ouvert.

## 1. Créer les deux apps avec la case HDS — Philippe (Claude guide)
Tableau de bord Scalingo → Créer une application → région **osc-secnum-fr1**
→ cocher **HDS** (signe l'annexe) → nom `easyphysio`. Même chose pour
`easyphysio-postgrest`. Vérifier ensuite que l'annexe apparaît dans
Compte → HDS. **Si la case est oubliée, supprimer l'app et recommencer :
elle ne s'ajoute pas après.**

## 2. Base de données — Claude
```bash
S="scalingo --region osc-secnum-fr1"
$S --app easyphysio addons-add postgresql postgresql-business-512
$S --app easyphysio addons   # noter l'id de l'addon
```
Vérifier : version 17, « Internet Accessibility » désactivé ; activer
« Force TLS » (`database-enable-feature`), sauvegardes nocturnes actives.

## 3. Réglages (variables d'environnement) — Claude
```bash
bash scripts/hds-copier-variables.sh easyphysio --apply
bash scripts/hds-copier-variables.sh easyphysio-postgrest --apply
```
Puis à la main (valeurs jamais affichées) :
- `easyphysio` : `SCALINGO_DATABASE_URL=$SCALINGO_POSTGRESQL_URL` ;
  `NEXT_PUBLIC_SUPABASE_URL=https://easyphysio-postgrest.osc-secnum-fr1.scalingo.io`
  (le site doit être reconstruit après : c'est une variable lue au build).
- `easyphysio-postgrest` : `PGRST_DB_URI` = l'adresse `SCALINGO_POSTGRESQL_URL`
  de la nouvelle base ; `PGRST_DB_ANON_ROLE` = le nom d'utilisateur de cette
  adresse (`easyphysio_xxxx`).

## 4. Déployer le code — Claude
- PostgREST : `infra/postgrest/` (voir son README : `git subtree split` puis
  `git push` vers le dépôt git Scalingo de la nouvelle app).
- Site : lier GitHub (`integration-link-create`, branche `main`, déploiement
  automatique) ou `integration-link-manual-deploy main`.
- Conteneurs : `$S --app easyphysio scale web:2:M` ;
  `$S --app easyphysio-postgrest scale web:2:S`.
- Cron : `cron.json` est lu automatiquement (rappel de 17 h).

## 5. La veille — Philippe
Chez OVH, baisser la durée de cache (TTL) des enregistrements A et CNAME de
easyphysio.fr et easy-physio.fr à 300 s.

## 6. Copier la base (début de la coupure) — Claude
1. Mettre l'ancien site en pause : `scalingo --region osc-fr1 --app easyphysio scale web:0`.
2. Sauvegarde fraîche de l'ancienne base :
   `scalingo --region osc-fr1 --app easyphysio backups-create`, puis
   `backups-download` (fichier `.tar.gz`, ~120 ko).
3. Restauration dans la nouvelle base, depuis un conteneur ponctuel de la
   nouvelle app : `scalingo --region osc-secnum-fr1 --app easyphysio run --file <fichier>`
   puis `dbclient-fetcher postgresql 17` et
   `pg_restore --no-owner --no-acl --clean --if-exists -d $SCALINGO_POSTGRESQL_URL /tmp/uploads/<fichier>`.
4. Comparer le nombre de lignes table par table (ancienne / nouvelle base).
5. Redémarrer PostgREST : `$S --app easyphysio-postgrest restart`.

## 7. Domaines et DNS — Claude puis Philippe
- Claude : déclarer les 4 domaines sur la nouvelle app `easyphysio`
  (`domains-add easyphysio.fr`, `www.easyphysio.fr`, `easy-physio.fr`,
  `www.easy-physio.fr`) et activer « force HTTPS ».
- Philippe, chez OVH :
  - les 4 enregistrements **A** de `easyphysio.fr` et de `easy-physio.fr`
    passent des IP osc-fr1 (5.104.101.30, 109.232.236.90, 109.232.233.130,
    148.253.75.120) aux IP osc-secnum-fr1, relevées le 8/11 :
    **80.247.13.145, 148.253.96.193, 80.247.12.255, 185.21.194.105**
    (à re-vérifier le jour même : `Resolve-DnsName osc-secnum-fr1.scalingo.io`) ;
  - `www` : CNAME vers `easyphysio.osc-secnum-fr1.scalingo.io.`
  - Ne pas toucher : clerk, accounts, clkmail, DKIM (Clerk), MX et Zimbra.
- Les certificats Let's Encrypt se créent tout seuls une fois les DNS propagés.

## 8. Stripe — Philippe (Claude prépare)
Stripe → Développeurs → Webhooks : sur les deux points de terminaison
(compte plateforme et Connect), remplacer
`https://easyphysio.osc-fr1.scalingo.io/api/stripe/webhook` par
`https://easyphysio.osc-secnum-fr1.scalingo.io/api/stripe/webhook`.
Si Stripe donne de nouveaux secrets, Claude les met dans
`STRIPE_WEBHOOK_SECRET` / `STRIPE_CONNECT_WEBHOOK_SECRET`. Faire pareil en
mode réel le jour où Stripe y passe.

## 9. Test complet — Claude
Connexion kiné et patient de test, séance + douleur, message + notification,
vidéo, abonnement test, note d'honoraires, page admin, rappel de 17 h, appli
mobile. **Retour en arrière possible jusqu'ici** : remettre les DNS chez OVH,
l'adresse du webhook Stripe et `scale web:1:M` sur l'ancienne app.

## 10. Nettoyer — 1 à 2 semaines après, sur le « oui » de Philippe
- Supprimer `easyphysio` et `easyphysio-postgrest` en osc-fr1 (avec la base
  et ses sauvegardes).
- Exporter puis supprimer le projet Supabase ; retirer les variables
  `SUPABASE_*` et le code qui y renvoie ; supprimer l'ancien projet Vercel.
- Mettre à jour `CLAUDE.md` (§7, §8), la mémoire et le tunnel local
  (`db-tunnel` en `--region osc-secnum-fr1`).
- Rouvrir les invitations patients (`PATIENT_INVITATIONS_OPEN`) seulement
  quand Stripe est en mode réel et que les papiers RGPD sont validés
  (`docs/rgpd/`).
