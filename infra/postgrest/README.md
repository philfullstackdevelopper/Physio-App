# easyphysio-postgrest — la couche d'accès à la base

Copie exacte de ce qui tourne sur l'app Scalingo `easyphysio-postgrest`
(récupérée sur le serveur le 2026-11-08 : elle n'existait nulle part
ailleurs). Sert à recréer l'app dans la région HDS `osc-secnum-fr1`.

Deux programmes dans le même conteneur :
- **PostgREST 16.3**, sur le port interne 3001 : transforme les appels HTTP
  en requêtes SQL, avec les règles RLS de la base ;
- **Caddy 2.11.4**, sur le port public `$PORT` : retire le préfixe
  `/rest/v1` que `@supabase/supabase-js` ajoute toujours, puis transmet à
  PostgREST.

Les deux binaires sont téléchargés au build par le buildpack de la branche
`postgrest-null-buildpack` de ce dépôt (`BUILDPACK_URL`). Rien de gros n'est
committé ici.

## Variables d'environnement (noms seulement, jamais les valeurs ici)

- `BUILDPACK_URL` : `https://github.com/philfullstackdevelopper/Physio-App.git#postgrest-null-buildpack`
- `PGRST_DB_URI` : la base Postgres de l'app `easyphysio` (même région obligatoire)
- `PGRST_DB_SCHEMA` : `public`
- `PGRST_DB_ANON_ROLE` : le rôle unique de la base Scalingo (`easyphysio_xxxx`, change avec chaque base)
- `PGRST_JWT_SECRET` : JWKS Clerk production + développement (voir la mémoire « PostgREST trusts Clerk keys »)
- `PGRST_JWT_ROLE_CLAIM_KEY` : `.nonexistent_claim` (ignore exprès le claim « role » du jeton Clerk)
- `PGRST_LOG_LEVEL`, `PGRST_OPENAPI_MODE`

## Déployer ce dossier sur une app Scalingo

Depuis la racine du dépôt :

```bash
git subtree split --prefix infra/postgrest -b postgrest-app
git push <remote-scalingo-de-l-app> postgrest-app:main --force
```

Après tout changement de `PGRST_JWT_SECRET` : `scalingo --app <app> restart`.
